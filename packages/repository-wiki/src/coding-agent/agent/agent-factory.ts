import { initChatModels } from "../llms/llm-factory.js";
import { Agent } from "./agent.js";
import { ModelRegistry } from "./model-registry.js";
import type { ModelProvider, ModelParams } from "../types.js";
import { logger as defaultLogger } from "@repositories-wiki/common";
import type { Logger } from "@repositories-wiki/common";


export async function createAgent(
  models: string[],
  provider: ModelProvider,
  params?: ModelParams,
  logger: Logger = defaultLogger,
): Promise<Agent> {
  const chatModels = await initChatModels(models, provider, params, logger);
  const registry = new ModelRegistry(chatModels);
  return new Agent(registry);
}
