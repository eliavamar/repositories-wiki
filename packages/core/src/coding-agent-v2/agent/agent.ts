import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type {
  GenerateOptions,
  GenerateResult,
  ChatModelMap,
} from "../types.js";

export class Agent {
  private readonly chatModels: ChatModelMap;

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

  async generate(_options: GenerateOptions): Promise<GenerateResult> {
    const {prompt, model} = _options
    const llm = this.getModel(model)
    const res = await llm.invoke(prompt)
    const answer = res.toFormattedString();
    return{
      answer
    }
  }
}
