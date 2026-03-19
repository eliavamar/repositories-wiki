import { logger, generateFileTree, getStructureModel } from "@repositories-wiki/core";
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

    const fileTree = generateFileTree(context.repoPath);
    logger.debug(`Generated file tree with structure`);

    const prompt = generateWikiStructurePrompt(context.repoName, context.commitId, fileTree);

    const { result, sessionId } = await context.agent.run({
      repoPath: context.repoPath,
      prompt,
      title: "Generate Wiki Structure",
      llmConfig: getStructureModel(context.config),
    });

    const wikiStructure = parseWikiStructure(result);
    logger.info(`Generated structure with ${wikiStructure.pages.length} pages`);

    return {
      ...context,
      wikiStructure,
      structureSessionId: sessionId,
    };
  }
}