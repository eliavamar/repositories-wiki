import { createOpencode, TextPartInput } from "@opencode-ai/sdk";
import type { LlmConfig } from "@repositories-wiki/core";

// Type for OpenCode client
export type OpencodeClient = Awaited<ReturnType<typeof createOpencode>>["client"];

// Type for prompt body
export interface PromptBody {
  parts: TextPartInput[];
  model?: LlmConfig;
  agent?: string;
}
