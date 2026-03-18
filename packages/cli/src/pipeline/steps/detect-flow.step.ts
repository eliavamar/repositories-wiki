import fs from "fs";
import path from "path";
import { gitService, logger, WikiStructureModelSchema } from "@repositories-wiki/core";
import type { WikiStructureModel } from "@repositories-wiki/core";
import type { PipelineContext, PipelineStep } from "../types";

export class DetectFlowStep implements PipelineStep {
  readonly name = "Detect Flow";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath) {
      throw new Error("repoPath is required for DetectFlowStep");
    }

    const { repoPath, commitId } = context;
    const { wikiBranch } = context.config;

    // 1. Check if wiki branch exists
    const branchExists = await gitService.branchExists(repoPath, wikiBranch);

    if (!branchExists) {
      logger.info(`Wiki branch "${wikiBranch}" does not exist`);
      logger.info("Flow type: new");
      return { ...context, flowType: "new" };
    }

    logger.info(`Wiki branch "${wikiBranch}" exists`);

    // 2. Try to read wiki.json from wiki branch
    const wikiJsonContent = await gitService.showFileFromBranch(
      repoPath,
      wikiBranch,
      "wiki.json"
    );

    if (!wikiJsonContent) {
      logger.info(`wiki.json not found on branch "${wikiBranch}"`);
      logger.info("Flow type: new");
      return { ...context, flowType: "new" };
    }

    // 3. Parse and validate wiki.json using Zod schema
    let previousWikiStructure: WikiStructureModel;
    try {
      const parsed = JSON.parse(wikiJsonContent);
      const validationResult = WikiStructureModelSchema.safeParse(parsed);
      
      if (!validationResult.success) {
        logger.warn(`wiki.json validation failed: ${validationResult.error.message}`);
        logger.info("Flow type: new");
        return { ...context, flowType: "new" };
      }
      
      previousWikiStructure = validationResult.data;
    } catch (error) {
      logger.warn(`Failed to parse wiki.json: ${error}`);
      logger.info("Flow type: new");
      return { ...context, flowType: "new" };
    }

    const previousCommitId = previousWikiStructure.commitId;
    logger.info(`Found existing wiki at commit ${previousCommitId}`);

    // 4. Compare commit IDs - if same, skip the pipeline
    if (previousCommitId === commitId) {
      logger.info("Wiki is already up to date - no changes since last generation");
      return {
        ...context,
        flowType: "update",
        previousCommitId,
        previousWikiStructure,
        wikiStructure: previousWikiStructure, // Use existing structure as result
        skipPipeline: true,
        skipReason: "Wiki is already up to date (no changes since last generation)",
      };
    }

    // 5. Get changed files between commits
    const changedFiles = await gitService.getChangedFiles(
      repoPath,
      previousCommitId,
      commitId!
    );
    logger.info(`Found ${changedFiles.files.length} changed files`);

    // 6. Write diff files to unique directory (for agent access)
    let changedFilesDirPath: string | undefined;
    if (changedFiles.files.length > 0) {
      changedFilesDirPath = path.join(repoPath, ".wiki-changes");
      fs.mkdirSync(changedFilesDirPath, { recursive: true });

      for (const file of changedFiles.files) {
        // Replace path separators with double underscores for safe filenames
        const safeFileName = file.path.replace(/\//g, "__") + ".diff";
        const diffFilePath = path.join(changedFilesDirPath, safeFileName);

        const content = [
          `Change Type: ${file.changeType}`,
          `Path: ${file.path}`,
          "",
          file.diff,
        ].join("\n");

        fs.writeFileSync(diffFilePath, content);
      }

      logger.info(`Wrote ${changedFiles.files.length} diff files to ${changedFilesDirPath}`);
    }

    logger.info("Flow type: update");

    return {
      ...context,
      flowType: "update",
      previousCommitId,
      previousWikiStructure,
      changedFiles,
      changedFilesDirPath,
    };
  }
}