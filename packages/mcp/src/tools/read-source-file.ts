import { z } from "zod";
import { logger, gitService } from "@repositories-wiki/common";
import type { FreshnessChecker } from "../state/freshness-checker.js";
import type { CacheManager } from "../state/cache-manager.js";

export const ReadSourceFileInputSchema = z.object({
  filePath: z.string().describe("File path as referenced in wiki pages (e.g. 'src/main.ts')"),
  repo_url: z.string().describe("Repository URL to read the file from"),
});

export type ReadSourceFileInput = z.infer<typeof ReadSourceFileInputSchema>;


export async function handleReadSourceFile(
  input: ReadSourceFileInput,
  freshnessChecker: FreshnessChecker,
  cacheManager: CacheManager,
): Promise<string> {
  const { filePath, repo_url } = input;

  await freshnessChecker.ensureFresh(repo_url);

  const loadedRepos = cacheManager.getLoadedRepos();

  // Find the loaded repo
  const repo = loadedRepos.find((r) => r.config.repoUrl === repo_url);
  if (!repo) {
    const available = loadedRepos.map((r) => r.config.repoUrl).join(", ");
    return JSON.stringify({
      error: `Repository "${repo_url}" not found. Available repositories: ${available}`,
    });
  }

  try {
    // Use GitHub API to fetch file at specific commit
    const content = await gitService.getFileFromGitHub(
      repo_url,
      filePath,
      repo.commitId,
      repo.config.ghToken
    );

    if (!content) {
      return JSON.stringify({
        error: `File "${filePath}" not found in ${repo_url} at commit ${repo.commitId.substring(0, 7)}.`,
      });
    }

    return JSON.stringify({
      filePath,
      repoUrl: repo_url,
      commitId: repo.commitId,
      content,
    });
  } catch (error) {
    logger.debug(`Failed to read file ${filePath} from ${repo_url}: ${error}`);
    return JSON.stringify({
      error: `File "${filePath}" not found in ${repo_url} at commit ${repo.commitId.substring(0, 7)}.`,
    });
  }
}
