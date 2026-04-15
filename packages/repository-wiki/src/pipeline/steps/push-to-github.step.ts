import path from "path";
import { gitService, logger } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import { REPOSITORY_WIKI_DIR } from "../../utils/consts";

export class PushToGitHubStep implements PipelineStep {
  readonly name = "Push to GitHub";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.config.repositoryUrl && !context.config.pushToGithub) {
      logger.info("Skipping GitHub push — pushToGithub is not enabled");
      return context;
    }

    if (!context.repoPath) {
      throw new Error("repoPath is required");
    }
    if (!context.commitId) {
      throw new Error("commitId is required");
    }

    const { repoPath, commitId } = context;

    // Auto-generate branch name if not provided
    const wikiBranch = context.config.wikiBranch ||
      `repository-wiki-${new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "")}`;

    // Create and checkout a new branch from the current commit
    await gitService.createBranch(repoPath, wikiBranch);
    logger.info(`Checked out new branch: ${wikiBranch}`);

    // Stage only the output directory (written by WriteToLocalStep)
    const outputDirPath = context.config.outputDirPath
      ? context.config.outputDirPath
      : REPOSITORY_WIKI_DIR;
    const outputPath = path.join(repoPath, outputDirPath);
    await gitService.addPath(repoPath, outputPath);

    // Commit
    const commitMessage = `Wiki generated from commit ${commitId.substring(0, 7)}`;
    await gitService.commit(repoPath, commitMessage);
    logger.info(`Committed: ${commitMessage}`);

    // Push the new branch
    await gitService.push(repoPath, wikiBranch, true);
    logger.info(`Pushed to branch: ${wikiBranch}`);

    return context;
  }
}
