import type { ModelProvider, ProviderDefinition } from "../types.js";
import { PROVIDERS, SUPPORTED_PROVIDERS } from "./provider-config.js";

/**
 * Error thrown when an unsupported provider is requested.
 */
export class UnsupportedProviderError extends Error {
  public readonly provider: string;
  public readonly supportedProviders: string[];

  constructor(provider: string) {
    const supported = SUPPORTED_PROVIDERS.join(", ");
    super(
      `Unsupported provider: "${provider}". ` +
        `Supported providers are: ${supported}`
    );
    this.name = "UnsupportedProviderError";
    this.provider = provider;
    this.supportedProviders = [...SUPPORTED_PROVIDERS];
  }
}

/**
 * Looks up a provider definition by name.
 *
 * @throws {UnsupportedProviderError} if the provider is not in the registry
 */
export function getProvider(provider: ModelProvider): ProviderDefinition {
  const definition = PROVIDERS[provider];

  if (!definition) {
    throw new UnsupportedProviderError(provider);
  }

  return definition;
}


export function buildModelString(
  modelId: string,
  provider: ProviderDefinition
): string {
  return `${provider.providerID}:${modelId}`;
}

export { PROVIDERS, SUPPORTED_PROVIDERS } from "./provider-config.js";
