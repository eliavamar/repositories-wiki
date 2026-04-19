import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ChatModelMap } from "../types.js";


export class ModelRegistry {
  private readonly models: ChatModelMap;

  constructor(models: ChatModelMap) {
    this.models = models;
  }

  get(modelId: string): BaseChatModel {
    const model = this.models.get(modelId);
    if (!model) {
      const available = [...this.models.keys()].join(", ");
      throw new Error(
        `Model "${modelId}" is not initialized. Available models: ${available}`
      );
    }
    return model;
  }
  
  has(modelId: string): boolean {
    return this.models.has(modelId);
  }

  list(): string[] {
    return [...this.models.keys()];
  }
}
