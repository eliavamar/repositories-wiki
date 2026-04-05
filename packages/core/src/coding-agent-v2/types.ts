import type { ZodType } from "zod";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";


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
}


export interface AgentOptions {
  models: string[];
  provider: ModelProvider;
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
}

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 8192;


export type ChatModelMap = Map<string, BaseChatModel>;
