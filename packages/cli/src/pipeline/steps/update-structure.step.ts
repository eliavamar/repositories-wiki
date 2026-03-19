import fs from "fs";
import { logger, generateFileTree, getStructureModel } from "@repositories-wiki/core";
import type { PipelineContext, PipelineStep } from "../types";
import { generateUpdateWikiStructurePrompt } from "../prompts";
import { parseUpdateWikiStructure } from "../../parsers";

export class UpdateStructureStep implements PipelineStep {
  readonly name = "Update Structure";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath || !context.repoName || !context.commitId) {
      throw new Error("repoPath, repoName, and commitId are required");
    }
    if (!context.agent) {
      throw new Error("agent is required");
    }
    if (!context.previousWikiStructure) {
      throw new Error("previousWikiStructure is required for UpdateStructureStep");
    }
    if (!context.changedFiles) {
      throw new Error("changedFiles is required for UpdateStructureStep");
    }

    // Check if there are no changes
    if (context.changedFiles.files.length === 0) {
      logger.info("No changes detected, keeping existing wiki structure");
      return {
        ...context,
        wikiStructure: {
          ...context.previousWikiStructure,
          commitId: context.commitId, // Update to new commit ID
        },
      };
    }

    const fileTree = generateFileTree(context.repoPath);
    logger.debug(`Generated file tree with structure`);

    const prompt = generateUpdateWikiStructurePrompt(
      context.repoName,
      context.commitId,
      fileTree,
      context.previousWikiStructure,
      context.changedFiles,
      context.changedFilesDirPath
    );

    const { result, sessionId } = await context.agent.run({
      repoPath: context.repoPath,
      prompt,
      title: "Update Wiki Structure",
      llmConfig: getStructureModel(context.config),
    });

    const wikiStructure = parseUpdateWikiStructure(result, context.previousWikiStructure);
    logger.info(`Updated structure with ${wikiStructure.pages.length} pages`);

    // Log page status breakdown
    const newPages = wikiStructure.pages.filter(p => p.status === "NEW").length;
    const updatePages = wikiStructure.pages.filter(p => p.status === "UPDATE").length;
    const unchangedPages = wikiStructure.pages.filter(p => !p.status).length;
    logger.info(`Pages: ${newPages} new, ${updatePages} to update, ${unchangedPages} unchanged`);

    // Clean up the changedFilesDirPath if it exists
    if (context.changedFilesDirPath && fs.existsSync(context.changedFilesDirPath)) {
      fs.rmSync(context.changedFilesDirPath, { recursive: true, force: true });
      logger.debug(`Cleaned up diff directory: ${context.changedFilesDirPath}`);
    }

    return {
      ...context,
      wikiStructure,
      structureSessionId: sessionId,
      changedFilesDirPath: undefined,
    };
  }
}
