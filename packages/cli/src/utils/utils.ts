import fs from "fs";
import path from "path";
import { logger } from "@repositories-wiki/core";
import type { RelevantFile, WikiPage } from "@repositories-wiki/core";
import type { FileContentsMap, Tokenizer } from "./types";
import { countTokens, isBinaryContent, MAX_PRELOADED_TOKENS } from "./tokenizer";


/**
 * Calculate importance for each file based on how many times it's mentioned in the content.
 *
 * Uses the maximum mention count as the baseline (not sum) because:
 * - Guarantees the most relevant file is always marked as "high" importance
 * - Provides meaningful relative comparison ("how important vs the main file?")
 * - Handles edge cases where one file dominates (with sum, all others would be "low")
 *
 * Importance levels:
 * - low: < 30% of max mentions
 * - medium: 30% <= x < 65% of max mentions
 * - high: >= 65% of max mentions
 */
export function calculateFileImportance(
  files: { filePath: string }[],
  content: string
): RelevantFile[] {
  if (files.length === 0) return [];

  // Count mentions for each file
  const mentionCounts = files.map((file) => {
    const filePath = file.filePath;
    const fileName = filePath.split("/").pop() || filePath;

    // Count occurrences of the file path or file name in the content
    const pathRegex = new RegExp(escapeRegex(filePath), "gi");
    const nameRegex = new RegExp(escapeRegex(fileName), "gi");

    const pathMatches = (content.match(pathRegex) || []).length;
    const nameMatches = (content.match(nameRegex) || []).length;

    // Use the higher count (path or name mentions)
    return Math.max(pathMatches, nameMatches);
  });

  // Find the maximum mention count
  const maxCount = Math.max(...mentionCounts, 1); // Ensure at least 1 to avoid division by zero

  // Calculate importance for each file
  return files.map((file, index) => {
    const count = mentionCounts[index] ?? 0;
    const percentage = (count / maxCount) * 100;

    let importance: "low" | "medium" | "high";
    if (percentage >= 65) {
      importance = "high";
    } else if (percentage >= 30) {
      importance = "medium";
    } else {
      importance = "low";
    }

    return {
      filePath: file.filePath,
      importance,
    };
  });
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}



export function getPreloadedFilesForPage(
  page: WikiPage,
  allFiles: FileContentsMap,
  tokenizer: Tokenizer | null,
  totalBudget: number = MAX_PRELOADED_TOKENS
): FileContentsMap {
  const pageFiles: FileContentsMap = new Map();

  // Collect this page's files with their token counts
  const filesWithTokens: { filePath: string; content: string; tokens: number }[] = [];

  for (const file of page.relevantFiles) {
    const content = allFiles.get(file.filePath);
    if (content) {
      const tokens = countTokens(content, tokenizer);
      filesWithTokens.push({ filePath: file.filePath, content, tokens });
    }
  }

  if (filesWithTokens.length === 0) return pageFiles;

  // Calculate total tokens
  const totalTokens = filesWithTokens.reduce((sum, f) => sum + f.tokens, 0);

  // If within budget, return all files as-is
  if (totalTokens <= totalBudget) {
    for (const f of filesWithTokens) {
      pageFiles.set(f.filePath, f.content);
    }
    return pageFiles;
  }

  // Over budget: sort ascending by token count (keep small files intact, truncate large ones)
  filesWithTokens.sort((a, b) => a.tokens - b.tokens);

  let remainingBudget = totalBudget;

  for (const file of filesWithTokens) {
    if (file.tokens <= remainingBudget) {
      pageFiles.set(file.filePath, file.content);
      remainingBudget -= file.tokens;
    } else {
      pageFiles.set(file.filePath, "// ... [truncated - file exceeds token budget] ...");
    }
  }

  return pageFiles;
}


export async function wikiFilesToFileContentsMap(
  pages: WikiPage[],
  repoPath: string
): Promise<FileContentsMap> {
  const fileContents: FileContentsMap = new Map();

  // Collect all unique file paths across all pages
  const uniquePaths = new Set<string>();
  for (const page of pages) {
    for (const file of page.relevantFiles) {
      uniquePaths.add(file.filePath);
    }
  }

  const resolvedRepoPath = path.resolve(repoPath);

  // Read all files in parallel
  await Promise.all(
    Array.from(uniquePaths).map(async (filePath) => {
      try {
        const absolutePath = path.resolve(repoPath, filePath);

        if (!absolutePath.startsWith(resolvedRepoPath)) {
          logger.warn(`Skipping file outside repo boundary: ${filePath}`);
          return;
        }

        const content = await fs.promises.readFile(absolutePath, "utf-8");

        if (isBinaryContent(content)) {
          logger.debug(`Skipping binary file: ${filePath}`);
          return;
        }

        fileContents.set(filePath, content);
      } catch {
        logger.debug(`Could not read file for pre-loading: ${filePath}`);
      }
    })
  );

  return fileContents;
}

