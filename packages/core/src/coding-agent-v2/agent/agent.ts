import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { DeepAgent } from "deepagents";
import type {
  GenerateOptions,
  GenerateResult,
  ChatModelMap,
} from "../types.js";
import { buildDeepAgent, buildCacheKey } from "./deep-agent.js";

export class Agent {
  private readonly chatModels: ChatModelMap;
  private readonly deepAgentCache: Map<string, DeepAgent> = new Map();

  constructor(chatModels: ChatModelMap) {
    this.chatModels = chatModels;
  }

  getModel(modelId: string): BaseChatModel {
    const model = this.chatModels.get(modelId);
    if (!model) {
      const available = [...this.chatModels.keys()].join(", ");
      throw new Error(
        `Model "${modelId}" is not initialized. Available models: ${available}`
      );
    }
    return model;
  }


  getAvailableModels(): string[] {
    return [...this.chatModels.keys()];
  }

  /**
   * Get or create a cached deep agent for the given project path and model.
   */
  private getOrCreateDeepAgent(modelId: string, projectPath: string): DeepAgent {
    const cacheKey = buildCacheKey(projectPath, modelId);
    let agent = this.deepAgentCache.get(cacheKey);
    if (!agent) {
      const chatModel = this.getModel(modelId);
      agent = buildDeepAgent(chatModel, projectPath);
      this.deepAgentCache.set(cacheKey, agent);
    }
    return agent;
  }

  async generate(_options: GenerateOptions): Promise<GenerateResult> {
    const { prompt, model, projectPath } = _options;

    if (projectPath) {
      const deepAgent = this.getOrCreateDeepAgent(model, projectPath);
      const result = await deepAgent.invoke({
        messages: [{ role: "user", content: prompt }],
      });

      const lastMessage = result.messages[result.messages.length - 1];
      const answer =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);

      return { answer };
    }

    const llm = this.getModel(model);
    const res = await llm.invoke(prompt);
    const answer = res.toFormattedString();
    return { answer };
  }
}
