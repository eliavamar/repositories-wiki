import pRetry from "p-retry";
import { logger } from "@repositories-wiki/common";
import { MAX_RETRIES } from "./consts";

export interface AgentGenerateResult {
  answer: string;
}

export interface RetryWithRecoveryOptions<T> {
  run: (prompt: string) => Promise<AgentGenerateResult>;
  originalPrompt: string;
  timeoutRetryPrompt: string;
  parsingRetryPrompt: string;
  parse: (result: string) => T;
  label: string;
  maxRetries?: number;
}

export interface RetryResult<T> {
  parsed: T;
}

/**
 * Retry an agent call with recovery logic.
 *
 * - **Timeout errors** (AbortError or "aborted" in message):
 *   Retry with a corrective prompt asking for a shorter response.
 *
 * - **Parsing errors**:
 *   Retry with a corrective prompt asking for valid output format.
 *
 * - **General runtime errors**:
 *   Retry with the original prompt.
 *
 * Since coding-agent-v2 has no session concept, every retry is a fresh call.
 */
export async function retryWithRecovery<T>(
  options: RetryWithRecoveryOptions<T>,
): Promise<RetryResult<T>> {
  const {
    run,
    originalPrompt,
    timeoutRetryPrompt,
    parsingRetryPrompt,
    parse,
    label,
    maxRetries = MAX_RETRIES,
  } = options;

  let lastErrorType: "timeout" | "parsing" | undefined;

  return pRetry(
    async () => {
      // Decide which prompt to use based on the previous error
      const prompt = lastErrorType === "timeout"
        ? timeoutRetryPrompt
        : lastErrorType === "parsing"
          ? parsingRetryPrompt
          : originalPrompt;

      if (lastErrorType) {
        logger.info(`Retrying ${label} (${lastErrorType} recovery)...`);
      }

      // Reset for this attempt
      lastErrorType = undefined;

      let result: AgentGenerateResult;
      try {
        result = await run(prompt);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "AbortError" || error.message?.includes("aborted"))
        ) {
          lastErrorType = "timeout";
          throw new Error(`Agent timed out (${label}): ${error.message}`);
        }
        throw error;
      }

      try {
        const parsed = parse(result.answer);
        return { parsed };
      } catch (parseError) {
        lastErrorType = "parsing";
        const msg = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`Parsing failed (${label}): ${msg}`);
      }
    },
    {
      retries: maxRetries,
      onFailedAttempt: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn(
          `Failed ${label} (attempt ${error.attemptNumber}/${maxRetries + 1}) - Retrying...`,
          { error: msg },
        );
      },
    },
  );
}

