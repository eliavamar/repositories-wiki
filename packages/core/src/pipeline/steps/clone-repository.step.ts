import { simpleGit } from "simple-git";
import { gitService, logger } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";

export class CloneRepositoryStep implements PipelineStep {
  readonly name = "Clone Repository";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const { repositoryUrl, localRepoPath, githubToken, commitId } = context.config;

    if (localRepoPath) {
      // Validate it's a git repo
      const isGit = await gitService.isGitRepo(localRepoPath);
      if (!isGit) {
        throw new Error(`'${localRepoPath}' is not a git repository.`);
      }

      const git = simpleGit(localRepoPath);
      const currentCommitId = await git.revparse(["HEAD"]);
      const repoName = gitService.getRepoNameFromPath(localRepoPath);

      logger.info(`Using local repository: ${localRepoPath}`);
      logger.info(`Commit: ${currentCommitId}`);

      return {
        ...context,
        repoPath: localRepoPath,
        repoName,
        commitId: currentCommitId,
      };
    }

    // Clone from remote URL
    const result = await gitService.cloneRepository(repositoryUrl!, {
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
