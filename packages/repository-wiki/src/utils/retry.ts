import pRetry from "p-retry";
import { logger } from "@repositories-wiki/common";
import { MAX_RETRIES } from "./consts";

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export interface AgentGenerateResult {
  answer: string;
}

export interface RetryResult<T> {
  parsed: T;
}


export interface RetryWithTextParsingOptions<T> {
  run: (prompt: string) => Promise<AgentGenerateResult>;
  originalPrompt: string;
  timeoutRetryPrompt: string;
  parsingRetryPrompt: string;
  parse: (result: string) => T;
  label: string;
  maxRetries?: number;
}


export interface RetryWithStructuredOutputOptions<T> {
  run: (prompt: string) => Promise<{ structuredResponse?: T }>;
  originalPrompt: string;
  timeoutRetryPrompt: string;
  label: string;
  maxRetries?: number;
}


export type RetryWithRecoveryOptions<T> =
  | RetryWithTextParsingOptions<T>
  | RetryWithStructuredOutputOptions<T>;

function isTextParsingOptions<T>(
  options: RetryWithRecoveryOptions<T>,
): options is RetryWithTextParsingOptions<T> {
  return "parse" in options && typeof options.parse === "function";
}


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
        const errorMessage = formatError(error);
        if (
          error instanceof Error &&
          (error.name === "AbortError" || error.message?.includes("aborted"))
        ) {
          lastErrorType = "timeout";
          throw new Error(`Agent timed out (${label}): ${errorMessage}`);
        }
        throw new Error(`${label} failed: ${errorMessage}`);
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
      onFailedAttempt: (context) => {
        const msg = formatError(context.error);
        logger.warn(
          `Failed ${label} (attempt ${context.attemptNumber}/${maxRetries + 1}) - Retrying...\n  Error: ${msg}`,
        );
      },
    },
  );
}
