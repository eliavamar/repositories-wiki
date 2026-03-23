import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";
import type { Session, Part, OpencodeClient } from "@opencode-ai/sdk";
import { existsSync } from "fs";
import { logger, type AgentInput, type AgentRunResult, type LlmConfig, type ProviderConfig } from "@repositories-wiki/core";
import type { PromptBody } from "./types";

/**
 * CodingAgent class for interacting with OpenCode AI
 * Manages server lifecycle and provides methods for running prompts
 */
export class CodingAgent {
  // Server configuration (instance variables)
  readonly serverHost = process.env.PLAYWRIGHT_SERVER_HOST ?? "127.0.0.1";
  readonly serverPort = process.env.PLAYWRIGHT_SERVER_PORT ?? "4096";
  readonly serverUrl = `http://${this.serverHost}:${this.serverPort}`;

  // Server state
  private server: { url: string; close(): void } | null = null;

  // Client state (cached for reuse) - Map of repoPath to client
  private clients: Map<string, OpencodeClient> = new Map();

  async startServer(providerConfig?: ProviderConfig, explorationLlm?: LlmConfig): Promise<void> {
    logger.info(`Starting server on ${this.serverUrl}`);

    if (this.server) {
      logger.debug("Closing existing server");
      this.server.close();
      this.server = null;
      logger.debug("Existing server closed");
    }

    const config = this.buildConfig(providerConfig, explorationLlm);
    logger.debug("Creating new OpenCode server", { hostname: this.serverHost, port: this.serverPort });
    this.server = await createOpencodeServer({
      hostname: this.serverHost,
      port: parseInt(this.serverPort),
      config,
    });
    logger.info(`Server started successfully on ${this.serverUrl}`);
  }


  async run(input: AgentInput): Promise<AgentRunResult> {
    const { repoPath, prompt, title, llmConfig, agent } = input;
    logger.info(`Starting run for repo: ${repoPath}`, { title, llmConfig, agent });

    this.validateRepoPath(repoPath);
    
    logger.debug("Creating/Get client for repo:", { repoPath });
    const client = this.getOrCreateClient(repoPath);

    const session = await this.createSession(client, title);
    logger.debug(`Session created: ${session.id}`);

    const body: PromptBody = {
      parts: [{ type: "text" as const, text: prompt }],
      model: llmConfig,
      agent,
    };
    logger.debug("Generating response", { sessionId: session.id, llmConfig });
    const result = await this.generate(client, session.id, body);
    logger.info(`Run completed successfully for session: ${session.id}`);
    
    return { result, sessionId: session.id };
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
          await client.session.delete({ path: { id: session.id } });
          logger.debug("Session deleted", { sessionId: session.id });
        } catch (error) {
          logger.warn("Failed to delete session", { sessionId: session.id, error });
        }
      }
    } catch (error) {
      logger.error("Failed to list sessions for cleanup", { error });
    }
  }


  closeServer(): void {
    if (this.server) {
      logger.info("Closing server");
      this.server.close();
      this.server = null;
      logger.info("Server closed successfully");
    } else {
      logger.debug("No server to close");
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
      fetch: this.createFetchWithTimeout(5 * 60 * 1000), // 5 minute timeout for long AI responses
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
      body: { title, parentID: parentId },
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
      path: { id: sessionId },
      body,
    });
    return this.extractTextFromParts(result.data?.parts || []);
  }
}