import { logger } from "@repositories-wiki/core";
import type { WikiStructureModel } from "@repositories-wiki/core";
import type { PipelineContext, PipelineStep } from "../types";
import { generatePageContentPrompt } from "../prompts";
import { parsePageContent } from "../../parsers";

export class GeneratePagesStep implements PipelineStep {
  readonly name = "Generate Pages";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath || !context.repoName) {
      throw new Error("repoPath and repoName are required");
    }
    if (!context.agent) {
      throw new Error("agent is required");
    }
    if (!context.wikiStructure) {
      throw new Error("wikiStructure is required");
    }

    const { wikiStructure, agent, repoPath, repoName } = context;

    logger.info(`Generating content for ${wikiStructure.pages.length} pages in parallel...`);

    const pageGenerationTasks = wikiStructure.pages.map(async (page) => {
      logger.info(`Generating content for: ${page.title}`);

      const sectionTitle = findSectionTitle(wikiStructure, page.id);
      const prompt = generatePageContentPrompt(
        page,
        sectionTitle,
        repoName,
        wikiStructure.description
      );

      const response = await agent.run({
        repoPath,
        prompt,
        title: `Generate: ${page.title}`,
      });

      const parsed = parsePageContent(response);

      page.content = parsed.content;
      if (parsed.filePaths.length > 0) {
        page.filePaths = parsed.filePaths;
      }

      logger.info(`✓ Generated: ${page.title} (${parsed.filePaths.length} files)`);
    });

    await Promise.all(pageGenerationTasks);

    return context;
  }
}

function findSectionTitle(wikiStructure: WikiStructureModel, pageId: string): string {
  if (!wikiStructure.sections) return "General";

  for (const section of wikiStructure.sections) {
    if (section.pages.includes(pageId)) {
      return section.title;
    }
  }

  return "General";
}