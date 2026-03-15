import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";
import type { Session, Part, OpencodeClient } from "@opencode-ai/sdk";
import { existsSync } from "fs";
import { logger, type LlmConfig, type AgentInput } from "@repositories-wiki/core";
import { OpenCodeConfig, PromptBody } from "./types";

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

  /**
   * Start the server with the given LLM configuration
   * Closes existing server if one exists
   */
  async startServer(llmConfig: LlmConfig): Promise<void> {
    logger.info(`Starting server on ${this.serverUrl}`);
    const config = this.buildConfig(llmConfig);

    // Close old server if exists
    if (this.server) {
      logger.debug("Closing existing server");
      this.server.close();
      this.server = null;
      logger.debug("Existing server closed");
    }

    // Create new server
    logger.debug("Creating new OpenCode server", { hostname: this.serverHost, port: this.serverPort });
    this.server = await createOpencodeServer({
      hostname: this.serverHost,
      port: parseInt(this.serverPort),
      config,
    });
    logger.info(`Server started successfully on ${this.serverUrl}`);
  }


  async run(
    input: AgentInput
  ): Promise<string> {
    const { repoPath, prompt, title } = input;
    logger.info(`Starting run for repo: ${repoPath}`, { title });

    this.validateRepoPath(repoPath);
    
    logger.debug("Creating/Get client for repo:", { repoPath });
    const client = this.getOrCreateClient(repoPath);

    logger.debug("Creating session", { title });
    const session = await this.createSession(client, title);
    logger.debug(`Session created: ${session.id}`);

    try {
      const body: PromptBody = {
        parts: [{ type: "text" as const, text: prompt }],
      };
      logger.debug("Generating response", { sessionId: session.id });
      const result = await this.generate(client, session.id, body);
      logger.info(`Run completed successfully for session: ${session.id}`);
      return result;
    } catch (error) {
      logger.error(`Run failed for session: ${session.id}`, error);
      throw error;
    } finally {
      try {
        logger.debug("Cleaning up session", { sessionId: session.id });
        await client.session.delete({ path: { id: session.id } });
        logger.debug("Session deleted successfully", { sessionId: session.id });
      } catch (deleteError) {
        logger.warn("Failed to delete session", { sessionId: session.id, error: deleteError });
      }
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
      parseAs: "stream"
    });
    this.clients.set(repoPath, client);
    logger.debug("OpenCode client created successfully");

    return client;
  }


  private validateRepoPath(repoPath: string): void {
    if (!existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }
  }


  private buildConfig(llmConfig: LlmConfig): OpenCodeConfig {
    const config: OpenCodeConfig = {
      $schema: "https://opencode.ai/config.json",
      model: `${llmConfig.provider}/${llmConfig.model}`,
    };

    if (llmConfig.apiKey) {
      config.provider = {
        [llmConfig.provider]: {
          options: {
            apiKey: llmConfig.apiKey,
          },
        },
      };
    }

    return config;
  }


  private async createSession(
    client: OpencodeClient,
    title?: string
  ): Promise<Session> {
    const sessionResponse = await client.session.create({
      body: { title },
    });

    const session: Session | undefined = sessionResponse.data;
    if (!session) {
      throw new Error("Failed to create session");
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