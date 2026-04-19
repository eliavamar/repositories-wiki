import type { ILanguageQuery } from "./language-query.js";
import type { CaptureCategory } from "../types.js";

export class JavaQuery implements ILanguageQuery {
  readonly id = "java";
  readonly name = "Java";
  readonly extensions = [".java"] as const;
  readonly wasmFile = "tree-sitter-java.wasm";

  readonly query = `
; ── Package declaration ──────────────────────────────────────────
(package_declaration) @package

; ── Imports ──────────────────────────────────────────────────────
(import_declaration) @import

; ── Class declarations ───────────────────────────────────────────
(class_declaration) @class

; ── Interface declarations ───────────────────────────────────────
(interface_declaration) @interface

; ── Enum declarations ────────────────────────────────────────────
(enum_declaration) @enum

; ── Annotation type declarations ─────────────────────────────────
(annotation_type_declaration) @annotation_type

; ── Method declarations ──────────────────────────────────────────
(method_declaration) @method

; ── Constructor declarations ─────────────────────────────────────
(constructor_declaration) @constructor

`;

  readonly collapsibleBodyTypes: ReadonlySet<string> = new Set([
    "class_declaration",
    "interface_declaration",
    "enum_declaration",
    "method_declaration",
    "constructor_declaration",
  ]);

  // Use Object.assign(Object.create(null), ...) to avoid the TS issue where
  // "constructor" as an object key conflicts with the built-in Object.constructor.
  readonly captureCategories: Readonly<Record<string, CaptureCategory>> =
    Object.assign(Object.create(null), {
      package:         "compact",
      import:          "compact",
      annotation_type: "compact",
      class:           "class_like",
      interface:       "class_like",
      enum:            "enum",
      method:          "collapsible",
      constructor:     "collapsible",
    });

  readonly bodyNodeTypes: ReadonlySet<string> = new Set([
    "class_body",
    "interface_body",
    "enum_body",
    "constructor_body",
    "block",
  ]);
}
