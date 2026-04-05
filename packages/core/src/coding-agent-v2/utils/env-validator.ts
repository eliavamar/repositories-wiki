import type { ProviderDefinition } from "../types.js";

/**
 * Error thrown when required environment variables are missing.
 */
export class MissingEnvVarsError extends Error {
  public readonly missingVars: string[];
  public readonly providerName: string;

  constructor(providerName: string, missingVars: string[]) {
    const varList = missingVars.join(", ");
    super(
      `Missing required environment variables for ${providerName}: ${varList}. ` +
        `Set them in process.env before creating the agent.`
    );
    this.name = "MissingEnvVarsError";
    this.missingVars = missingVars;
    this.providerName = providerName;
  }
}

/**
 * Validates that all required environment variables for a provider are set.
 *
 * @throws {MissingEnvVarsError} if any required env vars are missing or empty
 */
export function validateEnvVars(provider: ProviderDefinition): void {
  const missingVars = provider.requiredEnvVars.filter((envVar) => {
    const value = process.env[envVar];
    return !value || value.trim() === "";
  });

  if (missingVars.length > 0) {
    throw new MissingEnvVarsError(provider.name, missingVars);
  }
}
