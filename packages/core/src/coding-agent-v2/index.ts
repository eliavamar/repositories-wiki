// Agent
export { Agent } from "./agent/agent.js";
export { createAgent } from "./agent/agent-factory.js";

// LLM factory
export { createChatModel, initChatModels } from "./llms/llm-factory.js";
export {
  getProvider,
  buildModelString,
  UnsupportedProviderError,
  PROVIDERS,
  SUPPORTED_PROVIDERS,
} from "./llms/utils.js";

// Types
export type {
  ModelProvider,
  ProviderDefinition,
  AgentOptions,
  GenerateOptions,
  GenerateResult,
  ChatModelMap,
  ModelParams,
} from "./types.js";

// Constants
export { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "./types.js";

// Error classes
export { MissingEnvVarsError } from "./utils/env-validator.js";
export { PackageInstallError } from "./utils/package-installer.js";
