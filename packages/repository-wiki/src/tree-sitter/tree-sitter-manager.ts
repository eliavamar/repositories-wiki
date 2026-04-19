import path from "path";
import { logger } from "@repositories-wiki/common";
import { SignatureExtractor } from "./extractor.js";
import { ExtractionResult } from "./types.js";

/**
 * Manages tree-sitter signature extraction for source files.
 *
 * Decides the extraction strategy based on file type:
 * - Config/data files (.json, .yaml, etc.) → returned as-is with type "raw"
 * - Supported languages → signatures extracted with type "signature"
 * - Unsupported or failed extractions → original content with type "original"
 */
export class TreeSitterManager {
  private readonly extractor: SignatureExtractor;

  
  // Config/data file extensions that should be returned raw (no signature extraction).
  private static readonly RAW_CONTENT_EXTENSIONS = new Set([
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".xml",
    ".env",
    ".ini",
    ".cfg",
    ".conf",
    ".properties",
    ".graphql",
    ".gql",
    ".proto",
    ".sql",
  ]);

  constructor() {
    this.extractor = new SignatureExtractor();
  }

  /**
   * Extract file signatures from source code.
   *
   * @param filePath - The file path (used to determine language and strategy)
   * @param content - The full source code of the file
   * @returns The extraction result with content and its type, or null if content is empty
   */
  async extractFileSignatures(
    filePath: string,
    content: string,
  ): Promise<ExtractionResult> {
    if (!content || content.trim().length === 0){
        return { content, type: "original" };
    }

    if (this.isRawContentFile(filePath)) {
      return { content, type: "raw" };
    }

    const languageId = this.extractor.getLanguageForFile(filePath);
    if (!languageId) {
      return { content, type: "original" };
    }

    try {
      const signatures = await this.extractor.extract(content, languageId);
      if (signatures && signatures.trim().length > 0) {
        return { content: signatures, type: "signature" };
      }
      return { content, type: "original" };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`Tree-sitter extraction failed for ${filePath}: ${msg}`);
      return { content, type: "original" };
    }
  }

  private isRawContentFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return TreeSitterManager.RAW_CONTENT_EXTENSIONS.has(ext);
  }
}
