import fs from "fs";
import path from "path";
import { logger } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";

export class WriteToLocalStep implements PipelineStep {
  readonly name = "Write to Local";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.wikiStructure) {
      throw new Error("wikiStructure is required");
    }
    if (!context.repoPath) {
      throw new Error("repoPath is required");
    }

    const { wikiStructure } = context;
    const outputDirPath = context.config.outputDirPath? context.config.outputDirPath : path.join("memory-bank", "repository-wiki");
    const outputPath = path.join(context.repoPath, outputDirPath);

    // Delete existing output directory for a clean write
    if (fs.existsSync(outputPath)) {
      fs.rmSync(outputPath, { recursive: true, force: true });
      logger.info(`Deleted existing output directory: ${outputPath}`);
    }
    fs.mkdirSync(outputPath, { recursive: true });

    // Create wiki/sections directory
    const sectionsDir = path.join(outputPath, "sections");
    fs.mkdirSync(sectionsDir, { recursive: true });

    // Write wiki.json at output root
    const jsonPath = path.join(outputPath, "wiki.json");
    fs.writeFileSync(jsonPath, JSON.stringify(wikiStructure, null, 2));
    logger.info(`Written: wiki.json`);

    // Track which pages are assigned to sections
    const pagesInSections = new Set<string>();

    // Write pages organized by sections
    if (wikiStructure.sections) {
      for (const section of wikiStructure.sections) {
        const sectionSlug = slugify(section.title);
        const sectionDir = path.join(sectionsDir, sectionSlug);
        fs.mkdirSync(sectionDir, { recursive: true });

        for (const pageId of section.pages) {
          const page = wikiStructure.pages.find((p) => p.id === pageId);
          if (page) {
            pagesInSections.add(pageId);
            const fileName = slugify(page.title) + ".md";
            const filePath = path.join(sectionDir, fileName);
            fs.writeFileSync(filePath, page.content);
            logger.info(`Written: wiki/sections/${sectionSlug}/${fileName}`);
          }
        }
      }
    }

    // Write orphan pages (not in any section) directly in wiki/
    for (const page of wikiStructure.pages) {
      if (!pagesInSections.has(page.id)) {
        const fileName = slugify(page.title) + ".md";
        const filePath = path.join(outputPath, fileName);
        fs.writeFileSync(filePath, page.content);
        logger.info(`Written: wiki/${fileName}`);
      }
    }

    logger.info(`Wiki files written to: ${outputPath}`);

    return context;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
