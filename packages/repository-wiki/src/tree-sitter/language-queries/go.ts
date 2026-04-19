import type { ILanguageQuery } from "./language-query.js";
import type { CaptureCategory } from "../types.js";

export class GoQuery implements ILanguageQuery {
  readonly id = "go";
  readonly name = "Go";
  readonly extensions = [".go"] as const;
  readonly wasmFile = "tree-sitter-go.wasm";

  readonly query = `
; ── Package clause ───────────────────────────────────────────────
(package_clause) @package

; ── Imports ──────────────────────────────────────────────────────
(import_declaration) @import

; ── Function declarations ────────────────────────────────────────
(function_declaration) @function

; ── Method declarations ──────────────────────────────────────────
(method_declaration) @method

; ── Type declarations (struct, interface, type alias) ────────────
(type_declaration) @type_decl

`;

  readonly collapsibleBodyTypes: ReadonlySet<string> = new Set([
    "function_declaration",
    "method_declaration",
  ]);

  readonly captureCategories: Readonly<Record<string, CaptureCategory>> = {
    package:   "compact",
    import:    "compact",
    function:  "collapsible",
    method:    "collapsible",
    type_decl: "class_like",
  };

  readonly bodyNodeTypes: ReadonlySet<string> = new Set([
    "block",
    "field_declaration_list",
    "interface_type",
  ]);
}
