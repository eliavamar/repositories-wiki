import fs from "fs";
import path from "path";
import picomatch from "picomatch";
import { logger } from "@repositories-wiki/common";
import type { RelevantFile, WikiPage } from "@repositories-wiki/common";
import type { FileContentsMap, FilePattern, PriorityTier, Tokenizer, WalkEntry } from "./types";
import { countTokens, isBinaryContent} from "./tokenizer";
import { MAX_GENERATE_FILE_PRELOADED_TOKENS, MAX_STRUCTURE_PRELOADED_TOKENS, TECH_REGISTRY, TIERS, UNIVERSAL_PATTERNS, WALK_EXCLUSIONS } from "./consts";

export function walkRepo(repoPath: string, maxDepth: number = 10): WalkEntry[] {
  const results: WalkEntry[] = [];

  function walk(currentPath: string, depth: number): void {
    if (depth > maxDepth) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    // Sort: directories first, then files, both alphabetically
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const name = entry.name;
      if (name.startsWith(".") || WALK_EXCLUSIONS.has(name)) continue;

      const fullPath = path.join(currentPath, name);
      const relativePath = path.relative(repoPath, fullPath);

      if (entry.isDirectory()) {
        results.push({ relativePath, isDirectory: true });
        walk(fullPath, depth + 1);
        //code is only source of true, ignore docs files.
      } else if (entry.isFile() && !entry.name.includes(".md")) {
        results.push({ relativePath, isDirectory: false });
      }
    }
  }

  walk(repoPath, 0);
  return results;
}




export function formatFileTree(entries: WalkEntry[]): string {
  const lines: string[] = [];
  
  // Group children by parent path for quick "is last child" lookups
  const childrenOf = new Map<string, string[]>();
  for (const entry of entries) {
    const parts = entry.relativePath.split(path.sep);
    const parentDir = parts.length > 1 ? parts.slice(0, -1).join(path.sep) : "";
    const siblings = childrenOf.get(parentDir) || [];
    siblings.push(entry.relativePath);
    childrenOf.set(parentDir, siblings);
  }

  // Track which depth levels have an active "pipe" (│) vs blank
  // isLastAtDepth[d] = true means the ancestor at depth d was last among its siblings
  const isLastAtDepth: boolean[] = [];

  let itemCount = 0;
  for (const entry of entries) {
    itemCount++;

    const parts = entry.relativePath.split(path.sep);
    const depth = parts.length - 1;
    const name = parts[parts.length - 1];
    const displayName = entry.isDirectory ? `${name}/` : name;

    // Check if this entry is last among its siblings
    const parentDir = depth > 0 ? parts.slice(0, -1).join(path.sep) : "";
    const siblings = childrenOf.get(parentDir) || [];
    const isLast = siblings[siblings.length - 1] === entry.relativePath;

    // Record for children to use when building their prefix
    isLastAtDepth[depth] = isLast;

    // Build prefix from ancestor "last" status
    let prefix = "";
    for (let d = 0; d < depth; d++) {
      prefix += isLastAtDepth[d] ? "    " : "│   ";
    }

    const connector = isLast ? "└── " : "├── ";
    lines.push(`${prefix}${connector}${displayName}`);
  }

  return lines.join("\n");
}


/**
 * Safely read a file within the repo boundary, skipping binary files.
 * Returns the file content or null if the file can't be read.
 */
async function readSafeFile(repoPath: string, resolvedRepoPath: string, filePath: string): Promise<string | null> {
  try {
    if (filePath.startsWith("/")) {
      filePath = filePath.slice(1);
    }
    const absolutePath = path.resolve(repoPath, filePath);
    if (!absolutePath.startsWith(resolvedRepoPath)) {
      logger.warn(`Skipping file outside repo boundary: ${filePath}`);
      return null;
    }

    const content = await fs.promises.readFile(absolutePath, "utf-8");
    if (isBinaryContent(content)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return null;
    }

    return content;
  } catch {
    logger.debug(`Could not read file: ${filePath}`);
    return null;
  }
}

function buildTierMatchers(): Map<PriorityTier, picomatch.Matcher> {
  const tierGlobs = new Map<PriorityTier, string[]>();

  const allPatterns: FilePattern[] = [
    ...UNIVERSAL_PATTERNS,
    ...TECH_REGISTRY.flatMap((t) => t.patterns),
  ];

  for (const pattern of allPatterns) {
    const globs = tierGlobs.get(pattern.tier) || [];
    globs.push(...pattern.globs);
    tierGlobs.set(pattern.tier, globs);
  }

  return new Map(
    Array.from(tierGlobs, ([tier, globs]) => [tier, picomatch(globs)])
  );
}

/**
 * Select core/important files from a repository.
 *
 * 1. Builds one matcher per priority tier from all known tech patterns
 * 2. Assigns each file to its highest-priority tier
 * 3. Reads files tier-by-tier within the token budget
 */
export async function selectCoreFiles(
  repoPath: string,
  entries: WalkEntry[],
  tokenizer: Tokenizer | null,
  budget: number = MAX_STRUCTURE_PRELOADED_TOKENS,
): Promise<FileContentsMap> {
  const result: FileContentsMap = new Map();
  const tierMatchers = buildTierMatchers();

  // Assign each file to its highest-priority matching tier
  const tierFiles = new Map<PriorityTier, string[]>();

  for (const { relativePath: file, isDirectory } of entries) {
    if (isDirectory) continue;
    for (const tier of TIERS) {
      if (tierMatchers.get(tier)?.(file)) {
        const list = tierFiles.get(tier) || [];
        list.push(file);
        tierFiles.set(tier, list);
        break;
      }
    }
  }

  // Read files tier-by-tier within budget
  const resolvedRepoPath = path.resolve(repoPath);
  let remainingBudget = budget;
  let selectedCount = 0;

  for (const tier of TIERS) {
    for (const file of tierFiles.get(tier) || []) {
      if (remainingBudget <= 0) break;

      const content = await readSafeFile(repoPath, resolvedRepoPath, file);
      if (!content) continue;

      const tokens = countTokens(content, tokenizer);
      if (tokens <= remainingBudget) {
        result.set(file, content);
        remainingBudget -= tokens;
        selectedCount++;
      }
    }
  }

  const usedTokens = budget - remainingBudget;
  logger.info(
    `Selected ${selectedCount} core files (${usedTokens.toLocaleString()} / ${budget.toLocaleString()} tokens)`
  );

  return result;
}

/**
 * Used after the LLM infers important files from the file tree — we read those
 * files and merge them into the existing pre-loaded core files map.
 * 
 * Skips files that are already in `existingFiles`, binary files, and files
 * that exceed the per-file token limit.
 */
export async function loadInferredFiles(
  repoPath: string,
  filePaths: string[],
  tokenizer: Tokenizer | null,
  existingFiles: FileContentsMap,
  budget: number = MAX_STRUCTURE_PRELOADED_TOKENS,
): Promise<FileContentsMap> {
  const result: FileContentsMap = new Map(existingFiles);
  const resolvedRepoPath = path.resolve(repoPath);

  // Calculate remaining budget from existing files
  let usedTokens = 0;
  for (const content of existingFiles.values()) {
    usedTokens += countTokens(content, tokenizer);
  }
  let remainingBudget = budget - usedTokens;
  let addedCount = 0;

  for (const filePath of filePaths) {
    if (remainingBudget <= 0) break;
    if (result.has(filePath)) continue; // Already pre-loaded by tier selection

    const content = await readSafeFile(repoPath, resolvedRepoPath, filePath);
    if (!content) continue;

    const tokens = countTokens(content, tokenizer);
    // Skip very large files to avoid a single file eating the remaining budget
    if (tokens <= remainingBudget && tokens <= 5_000) {
      result.set(filePath, content);
      remainingBudget -= tokens;
      addedCount++;
    }
  }

  const totalUsed = budget - remainingBudget;
  logger.info(
    `Loaded ${addedCount} inferred files (total: ${result.size} files, ${totalUsed.toLocaleString()} / ${budget.toLocaleString()} tokens)`
  );

  return result;
}


function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Calculate importance for each file based on how many times it's mentioned in the content.
 *
 * Uses the maximum mention count as the baseline (not sum) because:
 * - Guarantees the most relevant file is always marked as "high" importance
 * - Provides meaningful relative comparison ("how important vs the main file?")
 *
 * Importance levels:
 * - low: < 30% of max mentions
 * - medium: 30% <= x < 65% of max mentions
 * - high: >= 65% of max mentions
 */
export function calculateFileImportance(
  files: string[],
  content: string
): RelevantFile[] {
  if (files.length === 0) return [];

  // Count mentions for each file
  const mentionCounts = files.map((filePath) => {
    const fileName = filePath.split("/").pop() || filePath;

    const pathRegex = new RegExp(escapeRegex(filePath), "gi");
    const nameRegex = new RegExp(escapeRegex(fileName), "gi");

    const pathMatches = (content.match(pathRegex) || []).length;
    const nameMatches = (content.match(nameRegex) || []).length;

    return Math.max(pathMatches, nameMatches);
  });

  const maxCount = Math.max(...mentionCounts, 1);

  return files.map((filePath, index) => {
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
      filePath,
      importance,
    };
  });
}


export function getPreloadedFilesForPage(
  page: WikiPage,
  allFiles: FileContentsMap,
  tokenizer: Tokenizer | null,
  totalBudget: number = MAX_GENERATE_FILE_PRELOADED_TOKENS
): FileContentsMap {
  const pageFiles: FileContentsMap = new Map();

  const filesWithTokens: { filePath: string; content: string; tokens: number }[] = [];

  for (const file of page.relevantFiles) {
    const content = allFiles.get(file.filePath);
    if (content) {
      const tokens = countTokens(content, tokenizer);
      filesWithTokens.push({ filePath: file.filePath, content, tokens });
    }
  }

  if (filesWithTokens.length === 0) return pageFiles;

  const totalTokens = filesWithTokens.reduce((sum, f) => sum + f.tokens, 0);

  if (totalTokens <= totalBudget) {
    for (const f of filesWithTokens) {
      pageFiles.set(f.filePath, f.content);
    }
    return pageFiles;
  }

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

  const uniquePaths = new Set<string>();
  for (const page of pages) {
    for (const file of page.relevantFiles) {
      uniquePaths.add(file.filePath);
    }
  }

  const resolvedRepoPath = path.resolve(repoPath);

  await Promise.all(
    Array.from(uniquePaths).map(async (filePath) => {
      const content = await readSafeFile(repoPath, resolvedRepoPath, filePath);
      if (content) {
        fileContents.set(filePath, content);
      }
    })
  );

  return fileContents;
}
