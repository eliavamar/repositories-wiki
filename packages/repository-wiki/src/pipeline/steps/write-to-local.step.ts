import fs from "fs";
import path from "path";
import { logger } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import { REPOSITORY_WIKI_DIR } from "../../utils/consts";

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
    const outputDirPath = context.config.outputDirPath? context.config.outputDirPath : REPOSITORY_WIKI_DIR;
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

    // Write pages organized by sections
    for (const section of wikiStructure.sections) {
      const sectionSlug = slugify(section.title);
      const sectionDir = path.join(sectionsDir, sectionSlug);
      fs.mkdirSync(sectionDir, { recursive: true });

      for (const page of section.pages) {
        const fileName = slugify(page.title) + ".md";
        const filePath = path.join(sectionDir, fileName);
        fs.writeFileSync(filePath, page.content ?? "");
        logger.info(`Written: ${filePath}`);
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
