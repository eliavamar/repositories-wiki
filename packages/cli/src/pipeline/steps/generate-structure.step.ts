import { logger } from "@repositories-wiki/core";
import type { PipelineContext, PipelineStep } from "../types";
import { generateWikiStructurePrompt } from "../prompts";
import { parseWikiStructure } from "../../parsers";

export class GenerateStructureStep implements PipelineStep {
  readonly name = "Generate Structure";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath || !context.repoName || !context.commitId) {
      throw new Error("repoPath, repoName, and commitId are required");
    }
    if (!context.agent) {
      throw new Error("agent is required");
    }

    const prompt = generateWikiStructurePrompt(context.repoName, context.commitId);

    const response = await context.agent.run({
      repoPath: context.repoPath,
      prompt,
      title: "Generate Wiki Structure",
    });

    const wikiStructure = parseWikiStructure(response);
    logger.info(`Generated structure with ${wikiStructure.pages.length} pages`);

    return {
      ...context,
      wikiStructure,
    };
  }
}