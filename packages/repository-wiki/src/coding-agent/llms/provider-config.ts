import type { ModelProvider, ProviderDefinition } from "../types.js";
import {
  DefaultProviderAdapter,
  BedrockProviderAdapter,
  SapAiCoreProviderAdapter,
} from "./provider-adapter.js";

const defaultAdapter = new DefaultProviderAdapter();
const bedrockAdapter = new BedrockProviderAdapter();
const sapAiCoreAdapter = new SapAiCoreProviderAdapter();

export const PROVIDERS: Record<ModelProvider, ProviderDefinition> = {
  openai: {
    name: "OpenAI",
    langchainPackage: "@langchain/openai",
    requiredEnvVars: ["OPENAI_API_KEY"],
    providerID: "openai",
    adapter: defaultAdapter,
  },
  anthropic: {
    name: "Anthropic",
    langchainPackage: "@langchain/anthropic",
    requiredEnvVars: ["ANTHROPIC_API_KEY"],
    providerID: "anthropic",
    adapter: defaultAdapter,
  },
  azure_openai: {
    name: "Azure OpenAI",
    langchainPackage: "@langchain/azure",
    requiredEnvVars: [
      "AZURE_OPENAI_API_KEY",
      "AZURE_OPENAI_ENDPOINT",
      "OPENAI_API_VERSION",
    ],
    providerID: "azure_openai",
    adapter: defaultAdapter,
  },
  "google-genai": {
    name: "Google GenAI",
    langchainPackage: "@langchain/google-genai",
    requiredEnvVars: ["GOOGLE_API_KEY"],
    providerID: "google-genai",
    adapter: defaultAdapter,
  },
  bedrock: {
    name: "AWS Bedrock",
    langchainPackage: "@langchain/aws",
    requiredEnvVars: [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
    ],
    providerID: "bedrock",
    adapter: bedrockAdapter,
  },
  "sap-ai-core": {
    name: "SAP AI Core",
    langchainPackage: "@sap-ai-sdk/langchain",
    requiredEnvVars: ["AICORE_SERVICE_KEY"],
    providerID: "sap-ai-core",
    adapter: sapAiCoreAdapter,
  },
};

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS) as ModelProvider[];
