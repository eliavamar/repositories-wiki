import { initChatModel } from "langchain/chat_models/universal";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ModelParams } from "../types.js";
import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, DEFAULT_INPUT_MAX_TOKENS } from "../types.js";
import { buildModelString } from "./utils.js";
import type { ProviderDefinition } from "../types.js";


export interface ProviderAdapter {
  createModel(
    modelId: string,
    provider: ProviderDefinition,
    params?: ModelParams,
  ): Promise<BaseChatModel>;
}


export class DefaultProviderAdapter implements ProviderAdapter {
  async createModel(
    modelId: string,
    provider: ProviderDefinition,
    params?: ModelParams,
  ): Promise<BaseChatModel> {
    const temperature = params?.temperature ?? DEFAULT_TEMPERATURE;
    const maxTokens = params?.maxTokens ?? DEFAULT_MAX_TOKENS;
    const maxInputTokens = params?.maxInputTokens ?? DEFAULT_INPUT_MAX_TOKENS;
    const modelString = buildModelString(modelId, provider);

    return await initChatModel(modelString, {
      temperature,
      maxTokens,
      maxInputTokens
    });
  }
}

export class BedrockProviderAdapter implements ProviderAdapter {
  async createModel(
    modelId: string,
    provider: ProviderDefinition,
    params?: ModelParams,
  ): Promise<BaseChatModel> {
    const temperature = params?.temperature ?? DEFAULT_TEMPERATURE;
    const maxTokens = params?.maxTokens ?? DEFAULT_MAX_TOKENS;
    const maxInputTokens = params?.maxInputTokens ?? DEFAULT_INPUT_MAX_TOKENS;
    const modelString = buildModelString(modelId, provider);

    return await initChatModel(modelString, {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      temperature,
      maxTokens,
      maxInputTokens
      
    });
  }
}


export class SapAiCoreProviderAdapter implements ProviderAdapter {
  async createModel(
    modelId: string,
    _provider: ProviderDefinition,
    params?: ModelParams,
  ): Promise<BaseChatModel> {
    const temperature = params?.temperature ?? DEFAULT_TEMPERATURE;
    const maxTokens = params?.maxTokens ?? DEFAULT_MAX_TOKENS;
    const maxInputTokens = params?.maxInputTokens ?? DEFAULT_INPUT_MAX_TOKENS;

    const pkg = "@sap-ai-sdk/langchain";
    const sapLangchain = await import(pkg);
    const client = new sapLangchain.OrchestrationClient({
      promptTemplating: {
        model: {
          name: modelId,
          params: {
            temperature,
            maxTokens,
            maxInputTokens
          },
        },
      },
    }) as BaseChatModel;

    return client ;
  }
}
