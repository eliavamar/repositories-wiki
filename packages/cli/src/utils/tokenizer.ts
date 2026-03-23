import { createByModelName } from "@microsoft/tiktokenizer";
import { logger } from "@repositories-wiki/core";
import type {  Tokenizer } from "./types";
import { TOKENIZER_MODEL } from "./consts";


export async function createTokenizer(): Promise<Tokenizer | null> {
  try {
    const tokenizer = await createByModelName(TOKENIZER_MODEL);
    return tokenizer;
  } catch (error) {
    logger.warn("Failed to initialize tokenizer, will use character-based estimation", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function countTokens(text: string, tokenizer: Tokenizer | null): number {
  if (tokenizer) {
    return tokenizer.encode(text).length;
  }
  // Fallback: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function isBinaryContent(content: string): boolean {
  const sample = content.slice(0, 1024);
  return sample.includes("\0");
}
