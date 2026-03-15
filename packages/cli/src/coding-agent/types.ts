// Internal types for OpenCode configuration

import { createOpencode, TextPartInput } from "@opencode-ai/sdk";

export interface OpenCodeConfig {
  $schema: string;
  model: string;
  provider?: Record<
    string,
    {
      options: {
        apiKey?: string;
      };
    }
  >;
}

// Type for OpenCode client
export type OpencodeClient = Awaited<ReturnType<typeof createOpencode>>["client"];

// Type for prompt body
export interface PromptBody {
  parts: TextPartInput[];
}