import pRetry from "p-retry";
import { logger } from "@repositories-wiki/common";
import { MAX_RETRIES } from "./consts";

export interface AgentGenerateResult {
  answer: string;
}

export interface RetryResult<T> {
  parsed: T;
}

/**
 * Options for retrying an agent call that returns text and needs manual parsing.
 */
export interface RetryWithTextParsingOptions<T> {
  run: (prompt: string) => Promise<AgentGenerateResult>;
  originalPrompt: string;
  timeoutRetryPrompt: string;
  parsingRetryPrompt: string;
  parse: (result: string) => T;
  label: string;
  maxRetries?: number;
}

/**
 * Options for retrying an agent call that uses structured output.
 * The agent returns already-parsed data via `structuredResponse`.
 * Only timeout retries are needed — the framework handles validation/parsing.
 */
export interface RetryWithStructuredOutputOptions<T> {
  run: (prompt: string) => Promise<{ structuredResponse?: T }>;
  originalPrompt: string;
  timeoutRetryPrompt: string;
  label: string;
  maxRetries?: number;
}

/**
 * Union type for backward compatibility. When `parse` is provided, it uses text parsing mode.
 * When `parse` is omitted, it uses structured output mode.
 */
export type RetryWithRecoveryOptions<T> =
  | RetryWithTextParsingOptions<T>
  | RetryWithStructuredOutputOptions<T>;

function isTextParsingOptions<T>(
  options: RetryWithRecoveryOptions<T>,
): options is RetryWithTextParsingOptions<T> {
  return "parse" in options && typeof options.parse === "function";
}

/**
 * Retry an agent call with recovery logic.
 *
 * Supports two modes:
 *
 * **Text parsing mode** (when `parse` is provided):
 * - Timeout errors: retry with `timeoutRetryPrompt`
 * - Parsing errors: retry with `parsingRetryPrompt`
 * - General errors: retry with original prompt
 *
 * **Structured output mode** (when `parse` is omitted):
 * - Timeout errors: retry with `timeoutRetryPrompt`
 * - General errors: retry with original prompt
 * - No parsing step — the agent returns structured data directly
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
    label,
    maxRetries = MAX_RETRIES,
  } = options;

  const useTextParsing = isTextParsingOptions(options);
  let lastErrorType: "timeout" | "parsing" | undefined;

  return pRetry(
    async () => {
      // Decide which prompt to use based on the previous error
      let prompt: string;
      if (lastErrorType === "timeout") {
        prompt = timeoutRetryPrompt;
      } else if (lastErrorType === "parsing" && useTextParsing) {
        prompt = options.parsingRetryPrompt;
      } else {
        prompt = originalPrompt;
      }

      if (lastErrorType) {
        logger.info(`Retrying ${label} (${lastErrorType} recovery)...`);
      }

      // Reset for this attempt
      lastErrorType = undefined;

      let result: Awaited<ReturnType<typeof run>>;
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

      // Structured output mode: return the structured response directly
      if (!useTextParsing) {
        const structured = (result as { structuredResponse?: T }).structuredResponse;
        if (structured === undefined || structured === null) {
          throw new Error(`No structured response returned (${label})`);
        }
        return { parsed: structured };
      }

      // Text parsing mode: parse the text answer
      try {
        const textResult = result as AgentGenerateResult;
        const parsed = options.parse(textResult.answer);
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
