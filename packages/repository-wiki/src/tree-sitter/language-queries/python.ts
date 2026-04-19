import type { ILanguageQuery } from "./language-query.js";
import type { CaptureCategory } from "../types.js";

export class PythonQuery implements ILanguageQuery {
  readonly id = "python";
  readonly name = "Python";
  readonly extensions = [".py", ".pyw"] as const;
  readonly wasmFile = "tree-sitter-python.wasm";

  readonly query = `
; ── Imports ──────────────────────────────────────────────────────
(import_statement) @import
(import_from_statement) @import

; ── Function definitions ─────────────────────────────────────────
(function_definition) @function

; ── Class definitions ────────────────────────────────────────────
(class_definition) @class

; ── Decorated definitions (captures the decorator + the def/class) ─
(decorated_definition) @decorated

; ── Type alias statements (Python 3.12+ "type X = ...") ─────────
(type_alias_statement) @type_alias
`;

  readonly collapsibleBodyTypes: ReadonlySet<string> = new Set([
    "function_definition",
    "class_definition",
  ]);

  readonly captureCategories: Readonly<Record<string, CaptureCategory>> = {
    import:     "compact",
    type_alias: "compact",
    function:   "collapsible",
    class:      "class_like",
    decorated:  "decorated",
  };

  readonly bodyNodeTypes: ReadonlySet<string> = new Set([
    "block",
  ]);
}
