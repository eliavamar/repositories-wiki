import fs from "fs";
import path from "path";
import { logger } from "@repositories-wiki/core";
import type { PipelineContext, PipelineStep } from "../types";

export class WriteFilesStep implements PipelineStep {
  readonly name = "Write Files";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath) {
      throw new Error("repoPath is required");
    }
    if (!context.wikiStructure) {
      throw new Error("wikiStructure is required");
    }

    const wikiOutputPath = path.join(context.repoPath, ".wiki-output");
    const pagesDir = path.join(wikiOutputPath, "pages");

    // Create directories
    fs.mkdirSync(pagesDir, { recursive: true });

    // Write wiki.json (full structure)
    const jsonPath = path.join(wikiOutputPath, "wiki.json");
    fs.writeFileSync(jsonPath, JSON.stringify(context.wikiStructure, null, 2));
    logger.info(`Written: wiki.json`);

    // Write individual markdown files
    for (const page of context.wikiStructure.pages) {
      const fileName = slugify(page.title) + ".md";
      const filePath = path.join(pagesDir, fileName);
      fs.writeFileSync(filePath, page.content);
      logger.info(`Written: pages/${fileName}`);
    }

    logger.info(`Wiki files written to: ${wikiOutputPath}`);

    return {
      ...context,
      wikiOutputPath,
    };
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}