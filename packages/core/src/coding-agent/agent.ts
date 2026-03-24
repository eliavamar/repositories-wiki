import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk/v2";
import type { Session, Part, OpencodeClient } from "@opencode-ai/sdk/v2";
import { existsSync } from "fs";
import { execSync } from "child_process";
import { createConnection } from "net";
import { logger, type LlmConfig, type ProviderConfig } from "@repositories-wiki/common";
import { AgentInput, AgentRunError, AgentRunResult, type PromptBody } from "./types";
import { FETCH_CODING_CLIENT_TIMEOUT } from "../utils/consts";

export class CodingAgent {
  readonly serverHost = process.env.PLAYWRIGHT_SERVER_HOST ?? "127.0.0.1";
  readonly serverPort = process.env.PLAYWRIGHT_SERVER_PORT ?? "4096";
  readonly serverUrl = `http://${this.serverHost}:${this.serverPort}`;

  private server: { url: string; close(): void } | null = null;
  private abortController: AbortController | null = null;
  private exitHandler: (() => void) | null = null;

  private clients: Map<string, OpencodeClient> = new Map();

  async startServer(providerConfig?: ProviderConfig, explorationLlm?: LlmConfig): Promise<void> {
    logger.info(`Starting server on ${this.serverUrl}`);

    if (this.server) {
      logger.debug("Closing existing server before starting a new one");
      await this.closeServer();
    }

    this.abortController = new AbortController();

    // Check that the port is free before attempting to start the server
    const port = parseInt(this.serverPort);
    if (await this.isPortInUse(port)) {
      throw new Error(
        `Port ${this.serverPort} is already in use. Cannot start coding agent server on ${this.serverUrl}`
      );
    }

    const config = this.buildConfig(providerConfig, explorationLlm);
    logger.debug("Creating new OpenCode server", { hostname: this.serverHost, port: this.serverPort });
    this.server = await createOpencodeServer({
      hostname: this.serverHost,
      port: parseInt(this.serverPort),
      signal: this.abortController.signal,
      config,
    });

    // when the parent process exits (e.g. Ctrl+C, uncaught exception, process.exit).
    this.exitHandler = () => {
      if (this.abortController && !this.abortController.signal.aborted) {
        try {
          this.abortController.abort();
        } catch {
          // Ignore abort errors during exit
        }
      }
    };
    process.on("exit", this.exitHandler);

    logger.info(`Server started successfully on ${this.serverUrl}`);
  }


  async run(input: AgentInput): Promise<AgentRunResult> {
    const { repoPath, prompt, title, llmConfig, agent, sessionId: existingSessionId } = input;
    logger.info(`Starting run for repo: ${repoPath}`, { title, llmConfig, agent });

    this.validateRepoPath(repoPath);
    
    logger.debug("Creating/Get client for repo:", { repoPath });
    const client = this.getOrCreateClient(repoPath);

    // Reuse existing session if sessionId is provided, otherwise create a new one
    let sessionId: string;
    if (existingSessionId) {
      sessionId = existingSessionId;
      logger.debug(`Reusing existing session: ${sessionId}`);
    } else {
      const session = await this.createSession(client, title);
      sessionId = session.id;
      logger.debug(`Session created: ${sessionId}`);
    }

    const body: PromptBody = {
      parts: [{ type: "text" as const, text: prompt }],
      model: llmConfig,
      agent,
    };
    logger.debug("Generating response", { sessionId, llmConfig });

    try {
      const result = await this.generate(client, sessionId, body);
      logger.info(`Run completed successfully for session: ${sessionId}`);
      return { result, sessionId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Run failed for session: ${sessionId}`, { error: message });
      throw new AgentRunError(message, sessionId, error);
    }
  }


  async cleanupSessions(repoPath: string): Promise<void> {
    const client = this.clients.get(repoPath);
    if (!client) {
      logger.debug("No client found for cleanup", { repoPath });
      return;
    }

    try {
      const sessionsResponse = await client.session.list();
      const sessions = sessionsResponse.data || [];
      
      logger.info(`Cleaning up ${sessions.length} sessions`);
      
      for (const session of sessions) {
        try {
          await client.session.delete({ sessionID: session.id });
          logger.debug("Session deleted", { sessionId: session.id });
        } catch (error) {
          logger.warn("Failed to delete session", { sessionId: session.id, error });
        }
      }
    } catch (error) {
      logger.error("Failed to list sessions for cleanup", { error });
    }
  }


  async closeServer(): Promise<void> {
    if (!this.server) {
      logger.debug("No server to close");
      return;
    }

    const port = parseInt(this.serverPort);
    logger.info("Closing server");

    // Remove the process exit handler first to avoid double-cleanup
    if (this.exitHandler) {
      process.removeListener("exit", this.exitHandler);
      this.exitHandler = null;
    }

    // Second attempt: graceful close
    try {
      this.server.close();
    } catch (error) {
      logger.warn("Graceful server close failed", { error });
    }

    // First attempt: abort via AbortController (preferred - signals the server to stop)
    if (this.abortController && !this.abortController.signal.aborted) {
      try {
        this.abortController.abort();
        logger.debug("AbortController aborted");
      } catch (error) {
        logger.warn("AbortController abort failed", { error });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    if (await this.isPortInUse(port)) {
      logger.warn("Server port still in use after graceful shutdown, force killing process on port", { port });
      this.forceKillProcessOnPort(port);
      // Brief wait for the OS to release the port
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.server = null;
    this.abortController = null;
    this.clients.clear();
    logger.info("Server closed successfully");
  }


  /**
   * Check if a port is currently in use by attempting a TCP connection.
   */
  private isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = createConnection({ port, host: this.serverHost });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });
      // Don't hang forever waiting for a connection
      socket.setTimeout(1000, () => {
        socket.destroy();
        resolve(false);
      });
    });
  }



  private forceKillProcessOnPort(port: number): void {
    try {
      const myPid = process.pid;
      // Find all PIDs using this port, excluding our own process
      const pidsOutput = execSync(`lsof -t -i :${port}`, { encoding: "utf-8" }).trim();
      if (!pidsOutput) return;

      const pids = pidsOutput
        .split("\n")
        .map((p) => parseInt(p.trim(), 10))
        .filter((pid) => !isNaN(pid) && pid !== myPid);

      if (pids.length === 0) {
        logger.debug("No child processes to kill on port (only own PID found)", { port });
        return;
      }

      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: "ignore" });
          logger.debug("Force killed process", { pid, port });
        } catch {
          // Process may have already exited
        }
      }
      logger.info("Force killed process(es) on port", { port, pids });
    } catch {
      // lsof may fail if no process is using the port
    }
  }


  /**
   * Get or create an OpenCode client for the given repo path
   * Reuses existing client if one exists for this path, otherwise creates a new one
   */
  private getOrCreateClient(repoPath: string): OpencodeClient {
    const existingClient = this.clients.get(repoPath);
    if (existingClient) {
      logger.debug("Reusing existing OpenCode client", { directory: repoPath });
      return existingClient;
    }

    logger.debug("Creating OpenCode client", { baseUrl: this.serverUrl, directory: repoPath });
    const client = createOpencodeClient({
      baseUrl: this.serverUrl,
      directory: repoPath,
      throwOnError: true,
      fetch: this.createFetchWithTimeout(FETCH_CODING_CLIENT_TIMEOUT),
    });
    this.clients.set(repoPath, client);
    logger.debug("OpenCode client created successfully");

    return client;
  }


  /**
   * This is needed because AI model responses for large prompts can take several minutes
   */
  private createFetchWithTimeout(timeoutMs: number): typeof fetch {
    return (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      
      const fetchInit: RequestInit = {
        ...init,
        signal: controller.signal,
      };
      
      return fetch(input, fetchInit).finally(() => {
        clearTimeout(timeout);
      });
    };
  }


  private validateRepoPath(repoPath: string): void {
    if (!existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }
  }


  private buildConfig(providerConfig?: ProviderConfig, explorationLlm?: LlmConfig) {
    const config: Record<string, unknown> = {};

    if (providerConfig?.apiKey) {
      config.provider = {
        [providerConfig.provider]: {
          options: {
            apiKey: providerConfig.apiKey,
            stream: false
          },
        },
      };
    }
    if (explorationLlm) {
      config.agent = {
        explore: {
          model: `${explorationLlm.providerID}/${explorationLlm.modelID}`,
        },
      };
    }

    return Object.keys(config).length > 0 ? config : undefined;
  }


  private async createSession(
    client: OpencodeClient,
    title?: string,
    parentId?: string
  ): Promise<Session> {
    const sessionResponse = await client.session.create({
      title,
      parentID: parentId,
    });

    const session: Session | undefined = sessionResponse.data;
    if (!session) {
      throw new Error("Failed to create session");
    }
    if(!session.id){
        throw new Error("Failed to create session: Session create did not return an id");
    }

    return session;
  }


  private extractTextFromParts(parts: Part[]): string {
    return parts
      .filter(
        (part): part is Part & { type: "text"; text: string } =>
          part.type === "text"
      )
      .map((part) => part.text)
      .join("\n");
  }


  private async generate(
    client: OpencodeClient,
    sessionId: string,
    body: PromptBody,
  ): Promise<string> {
    const result = await client.session.prompt({
      sessionID: sessionId,
      ...body,
    });
    return this.extractTextFromParts(result.data?.parts || []);
  }
}
