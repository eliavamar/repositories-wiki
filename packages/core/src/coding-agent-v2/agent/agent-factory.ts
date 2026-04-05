import { initChatModels } from "../llms/llm-factory.js";
import { Agent } from "./agent.js";
import type { ModelProvider, ModelParams } from "../types.js";

export async function createAgent(
  models: string[],
  provider: ModelProvider,
  params?: ModelParams
): Promise<Agent> {
  const chatModels = await initChatModels(models, provider, params);
  return new Agent(chatModels);
}
