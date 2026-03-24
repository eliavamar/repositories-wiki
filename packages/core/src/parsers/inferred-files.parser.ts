import { logger } from "@repositories-wiki/common";

/**
 * Parse the LLM response from the "infer important files" call.
 * Extracts file paths from <important_files> XML tags.
 * Returns an array of file path strings.
 */
export function parseInferredFiles(response: string): string[] {
  const match = response.match(/<important_files>([\s\S]*?)<\/important_files>/);
  if (!match) {
    logger.warn("Could not parse <important_files> from infer response, returning empty list");
    return [];
  }

  const rawContent = match[1] ?? "";
  const files = rawContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    // Filter out lines that look like comments or explanations
    .filter((line) => !line.startsWith("#") && !line.startsWith("//") && !line.startsWith("<!--"));

  logger.debug(`Parsed ${files.length} inferred important files`);
  return files;
}
