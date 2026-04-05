import type { ZodType } from "zod";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Logger } from "@repositories-wiki/common";
import type { ProviderAdapter } from "./llms/provider-adapter.js";


export type ModelProvider =
  | "openai"
  | "anthropic"
  | "azure_openai"
  | "google-genai"
  | "bedrock"
  | "sap-ai-core";


export interface ProviderDefinition {
  name: string;
  langchainPackage: string;
  requiredEnvVars: string[];
  providerID: string;
  adapter: ProviderAdapter;
}


export interface AgentOptions {
  models: string[];
  provider: ModelProvider;
  logger?: Logger;
}


export interface GenerateOptions {
  model: string;
  prompt: string;
  structuredOutput?: ZodType;
  projectPath?: string;
}


export interface GenerateResult {
  answer: string;
}


export interface ModelParams {
  temperature?: number;
  maxTokens?: number;
  maxInputTokens?: number;
}

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 8192;
export const DEFAULT_INPUT_MAX_TOKENS = 200000;

// modelId -> BaseChatModel
export type ChatModelMap = Map<string, BaseChatModel>;
