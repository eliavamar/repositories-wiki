import pRetry from "p-retry";
import { logger } from "@repositories-wiki/common";
import { AgentRunError, AgentRunResult } from "../coding-agent/types";
import { MAX_RETRIES } from "./consts";

export interface RetryWithSessionRecoveryOptions<T> {
  run: (prompt: string, sessionId?: string) => Promise<AgentRunResult>;
  originalPrompt: string;
  timeoutRetryPrompt: string;
  parsingRetryPrompt: string;
  parse: (result: string) => T;
  label: string;
  maxRetries?: number;
}

export interface RetryResult<T> {
  parsed: T;
  sessionId: string;
}

/**
 * Retry an agent call with smart session recovery.
 *
 * - **Timeout errors**:
 *   Retry using the *same* session with a corrective prompt asking for a shorter response.
 *
 * - **Parsing errors**:
 *   Retry using the *same* session with a corrective prompt asking for valid output format.
 *
 * - **General runtime errors**:
 *   Retry with a *fresh* session and the original prompt.
 */
export async function retryWithSessionRecovery<T>(
  options: RetryWithSessionRecoveryOptions<T>,
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

  let lastSessionId: string | undefined;
  let lastErrorType: "timeout" | "parsing" | undefined;

  return pRetry(
    async () => {
      // Decide whether to continue an existing session or start fresh
      const shouldContinueSession = lastSessionId && lastErrorType;
      const prompt = shouldContinueSession
        ? lastErrorType === "timeout"
          ? timeoutRetryPrompt
          : parsingRetryPrompt
        : originalPrompt;
      const sessionId = shouldContinueSession ? lastSessionId : undefined;

      if (shouldContinueSession) {
        logger.info(`Retrying ${label} with same session (${lastErrorType} recovery)...`);
      }

      // Reset for this attempt
      lastSessionId = undefined;
      lastErrorType = undefined;

      let runResult: AgentRunResult;
      try {
        runResult = await run(prompt, sessionId);
      } catch (error) {
        if (error instanceof AgentRunError) {
          if (error.isTimeout) {
            lastSessionId = error.sessionId;
            lastErrorType = "timeout";
            throw new Error(`Agent timed out (${label}): ${error.message}`);
          }
          throw new Error(`Agent runtime error (${label}): ${error.message}`);
        }
        throw error;
      }

      try {
        const parsed = parse(runResult.result);
        return { parsed, sessionId: runResult.sessionId };
      } catch (parseError) {
        lastSessionId = runResult.sessionId;
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
