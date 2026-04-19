import type { CaptureCategory } from "../types.js";

/**
 * Interface that every language query must implement.
 *
 * Each supported language provides a class implementing this interface.
 * The extractor is fully language-agnostic — it reads these properties
 * to decide how to parse and format each node.
 *
 * To add a new language:
 * 1. Create a class implementing ILanguageQuery in `queries/<language>.ts`
 * 2. Register it in the SignatureExtractor constructor
 * 3. Drop the `.wasm` grammar file into `assets/grammars/`
 */
export interface ILanguageQuery {
  /** Unique identifier (e.g. "typescript", "python") */
  readonly id: string;
  /** Display name (e.g. "TypeScript", "Python") */
  readonly name: string;
  /** File extensions this language handles (including leading dot, e.g. [".ts"]) */
  readonly extensions: readonly string[];
  /** Filename of the .wasm grammar (relative to assets/grammars/) */
  readonly wasmFile: string;
  /** Tree-sitter S-expression query string for signature extraction */
  readonly query: string;
  /** Node types whose bodies should be collapsed (e.g. "function_declaration") */
  readonly collapsibleBodyTypes: ReadonlySet<string>;
  /**
   * Maps each capture name from the query (e.g. "import", "class", "function")
   * to a formatting category. Unmapped captures fall through to a default
   * "return as-is" behavior.
   */
  readonly captureCategories: Readonly<Record<string, CaptureCategory>>;
  /**
   * Node types that represent a body block in this language.
   * Used as a fallback when the tree-sitter "body" field name doesn't match.
   * Examples: "statement_block", "class_body", "block", "field_declaration_list".
   */
  readonly bodyNodeTypes: ReadonlySet<string>;
}
