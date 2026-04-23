import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { Language } from "web-tree-sitter";
import type { Language as LanguageType } from "web-tree-sitter";

/**
 * Walk up from `startDir` until we find an `assets/grammars/` directory,
 This handles both:
 *
 *  - **Unbundled** (dev):  `src/tree-sitter/`  → two levels up
 *  - **Bundled** (prod):   `dist/`             → one level up
 */
function findGrammarsDir(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, "assets", "grammars");
    if (existsSync(candidate)) {
      return candidate;
    }
    dir = path.dirname(dir);
  }
  // Fallback: assume bundled layout (one level up from dist/)
  return path.resolve(startDir, "..", "assets", "grammars");
}

/**
 * Loads and caches WASM grammar files for tree-sitter.
 *
 * Each grammar is loaded once from the `assets/grammars/` directory
 * and cached for subsequent calls.
 */
export class GrammarLoader {
  private readonly cache = new Map<string, LanguageType>();
  private readonly grammarsDir: string;

  constructor() {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    this.grammarsDir = findGrammarsDir(currentDir);
  }

  /**
   * Load a WASM grammar by filename.
   *
   * @param wasmFile - The grammar filename (e.g. "tree-sitter-typescript.wasm")
   * @returns The loaded tree-sitter Language
   */
  async load(wasmFile: string): Promise<LanguageType> {
    const cached = this.cache.get(wasmFile);
    if (cached) return cached;

    const wasmPath = path.join(this.grammarsDir, wasmFile);
    const grammar = await Language.load(wasmPath);

    this.cache.set(wasmFile, grammar);
    return grammar;
  }
}
