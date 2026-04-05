import type { ModelProvider, ProviderDefinition } from "../types.js";
export const PROVIDERS: Record<ModelProvider, ProviderDefinition> = {
  openai: {
    name: "OpenAI",
    langchainPackage: "@langchain/openai",
    requiredEnvVars: ["OPENAI_API_KEY"],
    providerID: "openai",
  },
  anthropic: {
    name: "Anthropic",
    langchainPackage: "@langchain/anthropic",
    requiredEnvVars: ["ANTHROPIC_API_KEY"],
    providerID: "anthropic",

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
  },
  "google-genai": {
    name: "Google GenAI",
    langchainPackage: "@langchain/google-genai",
    requiredEnvVars: ["GOOGLE_API_KEY"],
    providerID: "google-genai",
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
  },
  "sap-ai-core": {
    name: "SAP AI Core",
    langchainPackage: "@sap-ai-sdk/langchain",
    requiredEnvVars: ["AICORE_SERVICE_KEY"],
    providerID: "sap-ai-core",
  },
};

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS) as ModelProvider[];
