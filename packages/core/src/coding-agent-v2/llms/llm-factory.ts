import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getProvider } from "./utils.js";
import { validateEnvVars } from "../utils/env-validator.js";
import { ensurePackageInstalled } from "../utils/package-installer.js";
import { logger as defaultLogger } from "@repositories-wiki/common";
import type { Logger } from "@repositories-wiki/common";
import type { ProviderDefinition, ModelParams, ModelProvider, ChatModelMap } from "../types.js";




export async function createChatModel(
  modelId: string,
  provider: ProviderDefinition,
  params?: ModelParams
): Promise<BaseChatModel> {
  return provider.adapter.createModel(modelId, provider, params);
}

export async function initChatModels(
  models: string[],
  provider: ModelProvider,
  params?: ModelParams,
  logger: Logger = defaultLogger
): Promise<ChatModelMap> {
  if (!models.length) {
    throw new Error("At least one model must be provided.");
  }

  const providerDef = getProvider(provider);

  validateEnvVars(providerDef);

  await ensurePackageInstalled(providerDef.langchainPackage, logger);

  const chatModels: ChatModelMap = new Map();

  for (const modelId of models) {
    logger.info(`Initializing model "${modelId}" for provider "${provider}"...`);

    const chatModel = await createChatModel(modelId, providerDef, params);
    chatModels.set(modelId, chatModel);

    logger.info(`Model "${modelId}" initialized successfully.`);
  }

  return chatModels;
}
