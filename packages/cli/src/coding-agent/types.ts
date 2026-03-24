import { createOpencode, TextPartInput } from "@opencode-ai/sdk/v2";
import type { LlmConfig } from "@repositories-wiki/core";

// Type for OpenCode client
export type OpencodeClient = Awaited<ReturnType<typeof createOpencode>>["client"];

// Type for prompt body
export interface PromptBody {
  parts: TextPartInput[];
  model?: LlmConfig;
  agent?: string;
}

export interface AgentInput {
  repoPath: string;
  prompt: string;
  title?: string;
  parentId?: string;
  sessionId?: string;
  llmConfig?: LlmConfig;
  agent?: string;
}

export interface AgentRunResult {
  result: string;
  sessionId: string;
}

export class AgentRunError extends Error {
  public readonly sessionId: string;
  public readonly isTimeout: boolean;

  constructor(message: string, sessionId: string, cause?: unknown) {
    super(message);
    this.name = "AgentRunError";
    this.sessionId = sessionId;
    this.cause = cause;
    this.isTimeout =
      cause instanceof Error && (cause.name === "AbortError" || cause.message?.includes("aborted"));
  }
}