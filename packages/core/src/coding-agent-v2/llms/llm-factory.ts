import { initChatModel } from "langchain/chat_models/universal";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { buildModelString, getProvider } from "./utils.js";
import { validateEnvVars } from "../utils/env-validator.js";
import { ensurePackageInstalled } from "../utils/package-installer.js";
import type { ProviderDefinition, ModelParams, ModelProvider, ChatModelMap } from "../types.js";
import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../types.js";


export async function createChatModel(
  modelId: string,
  provider: ProviderDefinition,
  params?: ModelParams
): Promise<BaseChatModel> {
  const temperature = params?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = params?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const modelString = buildModelString(modelId, provider);

  switch (provider.providerID) {
    case "sap-ai-core": {
      const pkg = "@sap-ai-sdk/langchain";
      const sapLangchain = await import(pkg);
      const client = new sapLangchain.OrchestrationClient({
        promptTemplating: {
          model: {
            name: modelId,
            params: {
              temperature,
              max_tokens: maxTokens,
            },
          },
        },
      });
      return client as BaseChatModel;
    }

    // Bedrock doesn't auto-read env vars — pass region and credentials explicitly.
    case "bedrock":
      return await initChatModel(modelString, {
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
        temperature,
        maxTokens,
      });

    default:
      return await initChatModel(modelString, {
        temperature,
        maxTokens,
      });
  }
}

export async function initChatModels(
  models: string[],
  provider: ModelProvider,
  params?: ModelParams
): Promise<ChatModelMap> {
  if (!models.length) {
    throw new Error("At least one model must be provided.");
  }

  const providerDef = getProvider(provider);

  validateEnvVars(providerDef);

  await ensurePackageInstalled(providerDef.langchainPackage);

  const chatModels: ChatModelMap = new Map();

  for (const modelId of models) {
    console.log(
      `[coding-agent-v2] Initializing model "${modelId}" for provider "${provider}"...`
    );

    const chatModel = await createChatModel(modelId, providerDef, params);
    chatModels.set(modelId, chatModel);

    console.log(
      `[coding-agent-v2] Model "${modelId}" initialized successfully.`
    );
  }

  return chatModels;
}
