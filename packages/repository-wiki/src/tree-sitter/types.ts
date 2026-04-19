/**
 * Formatting category for a query capture.
 *
 * Each capture name in a language's tree-sitter query must map to one of these
 * categories so the extractor knows how to format the captured node:
 *
 * - "compact"     — Show the node text as-is (imports, exports, type aliases, etc.)
 * - "class_like"  — Show declaration line + collapsed member signatures
 * - "enum"        — Show declaration + up to N members, then truncate
 * - "collapsible" — Replace the body with "{ ... }", showing only the signature
 * - "decorated"   — Show decorators + the collapsed inner definition (Python)
 */
export type CaptureCategory = "compact" | "class_like" | "enum" | "collapsible" | "decorated";
export type ExtractionResultType = "signature" | "raw" | "original";

export interface ExtractionResult {
  content: string;
  type: ExtractionResultType;
}