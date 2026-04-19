import path from "path";
import type { ILanguageQuery } from "./language-queries/language-query.js";

/**
 * Registry that maps language IDs and file extensions to their query definitions.
 *
 * Languages are registered via `register()` and looked up by file path
 * or language ID.
 */
export class LanguageRegistry {
  private readonly languages = new Map<string, ILanguageQuery>();
  private readonly extensionMap = new Map<string, string>();

  /**
   * Register a language query.
   *
   * @param query - The language query instance to register
   * @throws If a language with the same ID is already registered
   */
  register(query: ILanguageQuery): void {
    if (this.languages.has(query.id)) {
      throw new Error(
        `Language "${query.id}" is already registered. Each language ID must be unique.`
      );
    }

    this.languages.set(query.id, query);

    for (const ext of query.extensions) {
      this.extensionMap.set(ext.toLowerCase(), query.id);
    }
  }

  /**
   * Look up the language ID for a file path based on its extension.
   *
   * @returns The language ID (e.g. "typescript") or null if unsupported
   */
  getLanguageForFile(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    return this.extensionMap.get(ext) ?? null;
  }

  /**
   * Get the language query for a language ID.
   *
   * @returns The query instance or null if not registered
   */
  getLanguageQuery(languageId: string): ILanguageQuery | null {
    return this.languages.get(languageId) ?? null;
  }

  /**
   * Get a list of all registered language IDs.
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.languages.keys());
  }
}
