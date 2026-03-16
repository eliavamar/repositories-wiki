import * as fs from "fs";
import * as path from "path";

/**
 * Default directories to exclude from the file tree
 */
const DEFAULT_EXCLUSIONS = [
  "node_modules",
  "dist",
  "build",
  "coverage",
  "__pycache__",
  "vendor",
  "target",
  "*.lock",
];

/**
 * Options for generating the file tree
 */
export interface FileTreeOptions {
  /** Maximum depth to traverse (default: 5) */
  maxDepth?: number;
  /** Directories/files to exclude (default: common non-essential dirs) */
  exclusions?: string[];
  /** Maximum number of items to include (default: 500) */
  maxItems?: number;
  /** Exclude files/directories starting with dot (default: true) */
  excludeDotFiles?: boolean;
}

interface TreeState {
  itemCount: number;
  truncated: boolean;
}

/**
 * Generates a tree-like string representation of a directory structure.
 * Similar to the Unix `tree` command output.
 *
 * @param dirPath - The root directory path to generate tree from
 * @param options - Configuration options for tree generation
 * @returns A string representation of the directory tree
 *
 * @example
 * ```
 * const tree = generateFileTree('/path/to/repo');
 * // Output:
 * // ├── src/
 * // │   ├── components/
 * // │   │   ├── Header.tsx
 * // │   │   └── Footer.tsx
 * // │   └── index.ts
 * // ├── package.json
 * // └── README.md
 * ```
 */
export function generateFileTree(
  dirPath: string,
  options: FileTreeOptions = {}
): string {
  const {
    maxDepth = 5,
    exclusions = DEFAULT_EXCLUSIONS,
    maxItems = 500,
    excludeDotFiles = true,
  } = options;

  const state: TreeState = {
    itemCount: 0,
    truncated: false,
  };

  const lines = buildTree(dirPath, "", maxDepth, exclusions, maxItems, excludeDotFiles, state);

  if (state.truncated) {
    lines.push("... (truncated - too many items)");
  }

  return lines.join("\n");
}

/**
 * Check if a file/directory name should be excluded
 */
function shouldExclude(name: string, exclusions: string[], excludeDotFiles: boolean): boolean {
  // Exclude all files/directories starting with a dot
  if (excludeDotFiles && name.startsWith(".")) {
    return true;
  }

  return exclusions.some((pattern) => {
    // Handle glob patterns with *
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      return regex.test(name);
    }
    return name === pattern;
  });
}

/**
 * Recursively builds the tree structure
 */
function buildTree(
  dirPath: string,
  prefix: string,
  maxDepth: number,
  exclusions: string[],
  maxItems: number,
  excludeDotFiles: boolean,
  state: TreeState
): string[] {
  const lines: string[] = [];

  if (maxDepth < 0 || state.itemCount >= maxItems) {
    if (state.itemCount >= maxItems) {
      state.truncated = true;
    }
    return lines;
  }

  let items: string[];
  try {
    items = fs.readdirSync(dirPath);
  } catch {
    return lines;
  }

  // Filter out excluded items
  items = items.filter((item) => !shouldExclude(item, exclusions, excludeDotFiles));

  // Sort: directories first, then files, both alphabetically
  items.sort((a, b) => {
    const aPath = path.join(dirPath, a);
    const bPath = path.join(dirPath, b);
    const aIsDir = isDirectory(aPath);
    const bIsDir = isDirectory(bPath);

    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  items.forEach((item, index) => {
    if (state.itemCount >= maxItems) {
      state.truncated = true;
      return;
    }

    state.itemCount++;

    const itemPath = path.join(dirPath, item);
    const isLast = index === items.length - 1;
    const isDir = isDirectory(itemPath);

    // Tree characters
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";

    // Add the item to the tree
    const displayName = isDir ? `${item}/` : item;
    lines.push(`${prefix}${connector}${displayName}`);

    // Recurse into directories
    if (isDir) {
      const childLines = buildTree(
        itemPath,
        prefix + childPrefix,
        maxDepth - 1,
        exclusions,
        maxItems,
        excludeDotFiles,
        state
      );
      lines.push(...childLines);
    }
  });

  return lines;
}

/**
 * Check if a path is a directory
 */
function isDirectory(itemPath: string): boolean {
  try {
    return fs.statSync(itemPath).isDirectory();
  } catch {
    return false;
  }
}