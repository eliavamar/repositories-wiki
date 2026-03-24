import { gitService, logger } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";

export class CloneRepositoryStep implements PipelineStep {
  readonly name = "Clone Repository";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const { repositoryUrl, githubToken, commitId } = context.config;

    const result = await gitService.cloneRepository(repositoryUrl, {
      token: githubToken,
      commitId,
    });

    logger.info(`Cloned to: ${result.repoPath}`);
    logger.info(`Commit: ${result.commitId}`);

    return {
      ...context,
      repoPath: result.repoPath,
      repoName: result.repoName,
      commitId: result.commitId,
    };
  }
}