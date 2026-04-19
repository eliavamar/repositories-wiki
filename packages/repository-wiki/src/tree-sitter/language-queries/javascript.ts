import { CaptureCategory } from "../types";
import { ILanguageQuery } from "./language-query";

const JS_QUERY = `
; ── Imports ──────────────────────────────────────────────────────
(import_statement) @import

; ── Exports (re-exports, export assignments) ─────────────────────
(export_statement
  !declaration) @export

; ── Function declarations ────────────────────────────────────────
(function_declaration) @function

; ── Exported function declarations ───────────────────────────────
(export_statement
  declaration: (function_declaration)) @function

; ── Class declarations ───────────────────────────────────────────
(class_declaration) @class

; ── Exported class declarations ──────────────────────────────────
(export_statement
  declaration: (class_declaration)) @class

`;

const JS_COLLAPSIBLE_BODY_TYPES: ReadonlySet<string> = new Set([
  "function_declaration",
  "method_definition",
  "class_declaration",
]);

const JS_CAPTURE_CATEGORIES: Readonly<Record<string, CaptureCategory>> = {
  import:   "compact",
  export:   "compact",
  function: "collapsible",
  class:    "class_like",
};

const JS_BODY_NODE_TYPES: ReadonlySet<string> = new Set([
  "statement_block",
  "class_body",
]);

export class JavaScriptQuery implements ILanguageQuery {
  readonly id = "javascript";
  readonly name = "JavaScript";
  readonly extensions = [".js", ".jsx", ".mjs", ".cjs"] as const;
  readonly wasmFile = "tree-sitter-javascript.wasm";
  readonly query = JS_QUERY;
  readonly collapsibleBodyTypes = JS_COLLAPSIBLE_BODY_TYPES;
  readonly captureCategories = JS_CAPTURE_CATEGORIES;
  readonly bodyNodeTypes = JS_BODY_NODE_TYPES;
}