import type { ILanguageQuery } from "./language-query.js";
import type { CaptureCategory } from "../types.js";

// ─── Shared query and configuration for TypeScript / TSX ────────────────────

const QUERY = `
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

; ── Interface declarations ───────────────────────────────────────
(interface_declaration) @interface

; ── Exported interface declarations ──────────────────────────────
(export_statement
  declaration: (interface_declaration)) @interface

; ── Enum declarations ────────────────────────────────────────────
(enum_declaration) @enum

; ── Exported enum declarations ───────────────────────────────────
(export_statement
  declaration: (enum_declaration)) @enum

; ── Type alias declarations ──────────────────────────────────────
(type_alias_declaration) @type_alias

; ── Exported type alias declarations ─────────────────────────────
(export_statement
  declaration: (type_alias_declaration)) @type_alias

`;

const COLLAPSIBLE_BODY_TYPES: ReadonlySet<string> = new Set([
  "function_declaration",
  "method_definition",
  "class_declaration",
  "interface_declaration",
]);

const CAPTURE_CATEGORIES: Readonly<Record<string, CaptureCategory>> = {
  import:     "compact",
  export:     "compact",
  type_alias: "compact",
  function:   "collapsible",
  class:      "class_like",
  interface:  "class_like",
  enum:       "enum",
};

const BODY_NODE_TYPES: ReadonlySet<string> = new Set([
  "statement_block",
  "class_body",
  "interface_body",
  "enum_body",
  "object_type",
]);


export class TypeScriptQuery implements ILanguageQuery {
  readonly id = "typescript";
  readonly name = "TypeScript";
  readonly extensions = [".ts"] as const;
  readonly wasmFile = "tree-sitter-typescript.wasm";
  readonly query = QUERY;
  readonly collapsibleBodyTypes = COLLAPSIBLE_BODY_TYPES;
  readonly captureCategories = CAPTURE_CATEGORIES;
  readonly bodyNodeTypes = BODY_NODE_TYPES;
}

export class TsxQuery implements ILanguageQuery {
  readonly id = "tsx";
  readonly name = "TSX";
  readonly extensions = [".tsx"] as const;
  readonly wasmFile = "tree-sitter-tsx.wasm";
  readonly query = QUERY;
  readonly collapsibleBodyTypes = COLLAPSIBLE_BODY_TYPES;
  readonly captureCategories = CAPTURE_CATEGORIES;
  readonly bodyNodeTypes = BODY_NODE_TYPES;
}

