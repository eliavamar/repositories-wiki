export { main } from "./main";

// coding-agent-v2
export { Agent } from "./coding-agent-v2/index.js";
export { createAgent } from "./coding-agent-v2/index.js";
export { initChatModels, createChatModel } from "./coding-agent-v2/index.js";
export {
  getProvider,
  buildModelString,
  UnsupportedProviderError,
  PROVIDERS,
  SUPPORTED_PROVIDERS,
} from "./coding-agent-v2/index.js";
export { MissingEnvVarsError } from "./coding-agent-v2/index.js";
export { PackageInstallError } from "./coding-agent-v2/index.js";
export { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "./coding-agent-v2/index.js";
export type {
  ModelProvider,
  ProviderDefinition,
  AgentOptions,
  GenerateOptions,
  GenerateResult,
  ChatModelMap,
  ModelParams,
} from "./coding-agent-v2/index.js";
