import { Parser, Query } from "web-tree-sitter";
import type { Language, Node as TSNode } from "web-tree-sitter";
import { logger } from "@repositories-wiki/common";

import type { ILanguageQuery } from "./language-queries/language-query.js";
import { LanguageRegistry } from "./registry.js";
import { GrammarLoader } from "./grammar-loader.js";

import { TypeScriptQuery, TsxQuery } from "./language-queries/typescript.js";
import { PythonQuery } from "./language-queries/python.js";
import { JavaQuery } from "./language-queries/java.js";
import { GoQuery } from "./language-queries/go.js";
import { JavaScriptQuery } from "./language-queries/javascript.js";

interface CapturedNode {
  /** The capture name from the query (e.g. "import", "function", "class") */
  captureName: string;
  /** The tree-sitter node */
  node: TSNode;
}


const MAX_ENUM_MEMBERS = 20;


/**
 * Extracts compact "signatures" from source code files using tree-sitter.
 *
 * Owns the full lifecycle: WASM initialization, grammar loading, language
 * registry, and the extraction/formatting pipeline.
 *
 * Usage:
 * ```ts
 * const extractor = new SignatureExtractor();
 * const languageId = extractor.getLanguageForFile("src/foo.ts");
 * const signatures = await extractor.extract(sourceCode, languageId!);
 * ```
 */
export class SignatureExtractor {
  private readonly registry: LanguageRegistry;
  private readonly grammarLoader: GrammarLoader;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.registry = new LanguageRegistry();
    this.grammarLoader = new GrammarLoader();

    // Register all supported languages
    this.registry.register(new TypeScriptQuery());
    this.registry.register(new TsxQuery());
    this.registry.register(new JavaScriptQuery());
    this.registry.register(new PythonQuery());
    this.registry.register(new JavaQuery());
    this.registry.register(new GoQuery());
  }

  /**
   * Look up the language ID for a file path based on its extension.
   */
  getLanguageForFile(filePath: string): string | null {
    return this.registry.getLanguageForFile(filePath);
  }

  /**
   * Get a list of all registered language IDs.
   */
  getSupportedLanguages(): string[] {
    return this.registry.getSupportedLanguages();
  }

  /**
   * Extract signatures from source code.
   *
   * Initializes the WASM runtime on first call, loads the grammar if needed,
   * then runs the extraction pipeline.
   *
   * @param sourceCode - The full source code of the file
   * @param languageId - The language ID (from getLanguageForFile)
   * @returns The extracted signatures as a single string, or null if extraction fails
   */
  async extract(sourceCode: string, languageId: string): Promise<string | null> {
    await this.ensureInitialized();

    const languageQuery = this.registry.getLanguageQuery(languageId);
    if (!languageQuery) return null;

    const grammar = await this.grammarLoader.load(languageQuery.wasmFile);
    return this.extractSignatures(sourceCode, grammar, languageQuery);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = Parser.init().then(() => {
        logger.debug("Tree-sitter WASM runtime initialized");
      });
    }
    return this.initPromise;
  }


  /**
   * Parse source code with tree-sitte and format all captured nodes into compact signatures.
   */
  private extractSignatures(
    sourceCode: string,
    grammar: Language,
    languageQuery: ILanguageQuery,
  ): string | null {
    const parser = new Parser();
    try {
      parser.setLanguage(grammar);
      const tree = parser.parse(sourceCode);
      if (!tree) return null;

      try {
        const query = new Query(grammar, languageQuery.query);
        try {
          const captures = query.captures(tree.rootNode);
          if (captures.length === 0) return null;

          const captured: CapturedNode[] = captures.map((c) => ({
            captureName: c.name,
            node: c.node,
          }));

          const deduplicated = this.deduplicateCaptures(captured);
          const signatures = deduplicated.map((c) =>
            this.formatNode(c, sourceCode, languageQuery)
          );

          const result = signatures.filter(Boolean).join("\n\n");
          return result.length > 0 ? result : null;
        } finally {
          query.delete();
        }
      } finally {
        tree.delete();
      }
    } finally {
      parser.delete();
    }
  }


  /**
   * Remove duplicate captures where a child node is captured both on its own
   * and as part of a parent capture.
   */
  private deduplicateCaptures(captures: CapturedNode[]): CapturedNode[] {
    const sorted = [...captures].sort((a, b) => {
      const startDiff = a.node.startIndex - b.node.startIndex;
      if (startDiff !== 0) return startDiff;
      return (b.node.endIndex - b.node.startIndex) - (a.node.endIndex - a.node.startIndex);
    });

    const result: CapturedNode[] = [];
    let lastEnd = -1;

    for (const capture of sorted) {
      if (capture.node.startIndex < lastEnd) {
        continue;
      }
      result.push(capture);
      lastEnd = capture.node.endIndex;
    }

    return result;
  }


  /**
   * Format a captured node into a compact signature string.
   */
  private formatNode(
    capture: CapturedNode,
    sourceCode: string,
    languageQuery: ILanguageQuery,
  ): string {
    const { node, captureName } = capture;
    const isExportWrapper = node.type === "export_statement" && node.childForFieldName("declaration") != null;
    const innerNode = isExportWrapper
      ? node.childForFieldName("declaration")!
      : node;
    const signatureStartIndex = node.startIndex;

    const category = languageQuery.captureCategories[captureName];

    switch (category) {
      case "compact":
        return node.text;

      case "class_like":
        return this.formatClassLike(innerNode, sourceCode, languageQuery, signatureStartIndex);

      case "enum":
        return this.formatEnum(innerNode, sourceCode, languageQuery.bodyNodeTypes, signatureStartIndex);

      case "collapsible":
        return this.collapseBody(innerNode, sourceCode, languageQuery.bodyNodeTypes, signatureStartIndex);

      case "decorated":
        return this.formatDecorated(node, sourceCode, languageQuery);

      default:
        return node.text;
    }
  }


  /**
   * Format a class/interface/struct node showing:
   * - The declaration line (class Foo extends Bar implements Baz {)
   * - Each member as a signature (methods collapsed, fields as-is)
   * - The closing brace
   */
  private formatClassLike(
    node: TSNode,
    sourceCode: string,
    languageQuery: ILanguageQuery,
    signatureStartIndex?: number,
  ): string {
    const body = this.findBody(node, languageQuery.bodyNodeTypes);
    if (!body) {
      return node.text;
    }

    const startIdx = signatureStartIndex ?? node.startIndex;
    const declText = sourceCode.slice(startIdx, body.startIndex).trimEnd();
    const lines: string[] = [declText + " {"];

    for (const child of body.namedChildren) {
      const childType = child.type;

      if (childType === "comment" || childType === "line_comment" || childType === "block_comment") {
        continue;
      }

      if (languageQuery.collapsibleBodyTypes.has(childType)) {
        const sig = this.collapseBody(child, sourceCode, languageQuery.bodyNodeTypes);
        lines.push(SignatureExtractor.indent(sig, 2));
      } else {
        lines.push(SignatureExtractor.indent(child.text, 2));
      }
    }

    lines.push("}");
    return lines.join("\n");
  }


  /**
   * Format an enum showing up to MAX_ENUM_MEMBERS members.
   */
  private formatEnum(
    node: TSNode,
    sourceCode: string,
    bodyNodeTypes: ReadonlySet<string>,
    signatureStartIndex?: number,
  ): string {
    const body = this.findBody(node, bodyNodeTypes);
    if (!body) return node.text;

    const members = body.namedChildren.filter(
      (c) => c.type !== "comment" && c.type !== "line_comment" && c.type !== "block_comment"
    );

    const startIdx = signatureStartIndex ?? node.startIndex;

    if (members.length <= MAX_ENUM_MEMBERS) {
      return sourceCode.slice(startIdx, node.endIndex);
    }

    const declText = sourceCode.slice(startIdx, body.startIndex).trimEnd();
    const lines: string[] = [declText + " {"];

    for (let i = 0; i < MAX_ENUM_MEMBERS; i++) {
      lines.push(SignatureExtractor.indent(members[i]!.text, 2));
    }
    lines.push(SignatureExtractor.indent(`// ... ${members.length - MAX_ENUM_MEMBERS} more members`, 2));
    lines.push("}");

    return lines.join("\n");
  }


  /**
   * Format a decorated definition (Python).
   * Shows decorators + the collapsed inner definition.
   */
  private formatDecorated(
    node: TSNode,
    sourceCode: string,
    languageQuery: ILanguageQuery,
  ): string {
    const parts: string[] = [];

    for (const child of node.namedChildren) {
      if (child.type === "decorator") {
        parts.push(child.text);
      } else if (languageQuery.collapsibleBodyTypes.has(child.type)) {
        parts.push(this.collapseBody(child, sourceCode, languageQuery.bodyNodeTypes));
      } else if (child.type === "class_definition") {
        parts.push(this.formatClassLike(child, sourceCode, languageQuery));
      } else {
        parts.push(child.text);
      }
    }

    return parts.join("\n");
  }


  /**
   * Collapse a node's body to just the signature.
   *
   * For a function like:
   *   function foo(x: number): string {
   *     // lots of code
   *     return "bar";
   *   }
   *
   * Returns:
   *   function foo(x: number): string { ... }
   */
  private collapseBody(
    node: TSNode,
    sourceCode: string,
    bodyNodeTypes: ReadonlySet<string>,
    signatureStartIndex?: number,
  ): string {
    const body = this.findBody(node, bodyNodeTypes);
    if (!body) {
      return SignatureExtractor.getFirstLine(node.text);
    }

    const startIdx = signatureStartIndex ?? node.startIndex;
    const signatureText = sourceCode.slice(startIdx, body.startIndex).trimEnd();
    return signatureText + " { ... }";
  }

  // Find the body block of a node.
  private findBody(node: TSNode, bodyNodeTypes: ReadonlySet<string>): TSNode | null {
    // Primary: field name lookup (grammar-universal)
    const body = node.childForFieldName("body");
    if (body) return body;

    // Fallback: look for language-specific body node types among direct children
    for (const child of node.namedChildren) {
      if (bodyNodeTypes.has(child.type)) {
        return child;
      }
    }

    // Go: type_declaration → type_spec → struct_type/interface_type → body
    if (node.type === "type_declaration") {
      for (const typeSpec of node.namedChildren) {
        if (typeSpec.type === "type_spec") {
          const typeChild = typeSpec.childForFieldName("type");
          if (typeChild) {
            if (bodyNodeTypes.has(typeChild.type)) {
              return typeChild;
            }
            for (const inner of typeChild.namedChildren) {
              if (bodyNodeTypes.has(inner.type)) {
                return inner;
              }
            }
          }
        }
      }
    }

    return null;
  }


  private static indent(text: string, spaces: number): string {
    const pad = " ".repeat(spaces);
    return text
      .split("\n")
      .map((line) => pad + line)
      .join("\n");
  }

  private static getFirstLine(text: string): string {
    const idx = text.indexOf("\n");
    return idx === -1 ? text : text.slice(0, idx);
  }
}
