import path from "path";
import { fileURLToPath } from "url";
import { Language } from "web-tree-sitter";
import type { Language as LanguageType } from "web-tree-sitter";

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
    // From src/tree-sitter/ → ../../assets/grammars/
    // From dist/tree-sitter/ → ../../assets/grammars/  (same relative path)
    this.grammarsDir = path.resolve(currentDir, "..", "..", "assets", "grammars");
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
