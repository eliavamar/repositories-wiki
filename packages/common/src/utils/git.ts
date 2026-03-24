import { simpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./logger";
import { CloneOptions, CloneResult, ChangedFile, ChangedFilesResult } from "../types";



export class GitService {

  /**
   * Extract repository name from a git URL.
   */
  private extractRepoName(url: string): string {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      // Get the last segment of the path
      const segments = pathname.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment) {
        // Remove .git suffix if present
        return lastSegment.endsWith(".git")
          ? lastSegment.slice(0, -4)
          : lastSegment;
      }
    } catch {
      // Try to extract from non-URL format (e.g., git@github.com:owner/repo.git)
      const match = url.match(/\/([^/]+?)(\.git)?$/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return "repo";
  }

  /**
   * Clone a repository to a temporary directory.
   * Returns the path to the cloned repository, the commit ID, and the repository name.
   */
  async cloneRepository(
    url: string,
    options: CloneOptions = {}
  ): Promise<CloneResult> {
    const repoName = this.extractRepoName(url);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `${repoName}-`));
    logger.info(`Cloning repository ${url} to ${tmpDir}`);

    // Inject token into URL if provided
    let cloneUrl = url;
    if (options.token) {
      try {
        const parsed = new URL(url);
        parsed.username = options.token;
        parsed.password = "x-oauth-basic";
        cloneUrl = parsed.toString();
      } catch {
        // Not a valid URL, use as-is
      }
    }

    const git = simpleGit();
    await git.clone(cloneUrl, tmpDir);

    const repoGit = simpleGit(tmpDir);

    // Checkout specific commit if provided
    if (options.commitId) {
      await repoGit.checkout(options.commitId);
      logger.info(`Checked out commit ${options.commitId}`);
    }

    // Get the current HEAD commit using revparse (most efficient)
    const commitId = await repoGit.revparse(["HEAD"]);

    logger.info(`Repository cloned successfully to ${tmpDir} at commit ${commitId}`);
    return { repoPath: tmpDir, commitId, repoName };
  }

  /**
   * Check if a branch exists (locally or remotely).
   */
  async branchExists(repoPath: string, branch: string): Promise<boolean> {
    const git = simpleGit(repoPath);
    try {
      const branches = await git.branch(["-a"]);
      return branches.all.some(
        (b) => b === branch || b === `remotes/origin/${branch}`
      );
    } catch {
      return false;
    }
  }

  /**
   * Checkout an existing branch or create a new orphan branch.
   * An orphan branch has no history from the parent branch.
   */
  async checkoutOrCreateOrphanBranch(
    repoPath: string,
    branch: string
  ): Promise<void> {
    const git = simpleGit(repoPath);
    const exists = await this.branchExists(repoPath, branch);

    if (exists) {
      logger.info(`Checking out existing branch: ${branch}`);
      await git.checkout(branch);
    } else {
      logger.info(`Creating orphan branch: ${branch}`);
      await git.raw(["checkout", "--orphan", branch]);
      // Remove all tracked files from the index
      await git.raw(["rm", "-rf", "."]).catch(() => {
        // Ignore errors if there are no files to remove
      });
    }
  }

  async getDiff(
    repoPath: string,
    fromCommit: string,
    toCommit: string
  ): Promise<string> {
    const git = simpleGit(repoPath);
    return git.diff([fromCommit, toCommit]);
  }

  async cleanup(repoPath: string): Promise<void> {
    if (repoPath.startsWith(os.tmpdir())) {
      logger.debug(`Cleaning up temporary directory: ${repoPath}`);
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  }

  async addAll(repoPath: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.add(".");
  }

  async commit(repoPath: string, message: string): Promise<string> {
    const git = simpleGit(repoPath);
    const result = await git.commit(message);
    return result.commit;
  }

  async push(repoPath: string, branch: string, force = false): Promise<void> {
    const git = simpleGit(repoPath);
    const args = force ? ["--set-upstream", "origin", branch, "--force"] : ["--set-upstream", "origin", branch];
    await git.push(args);
  }

  /**
   * Show contents of a file from a specific branch without checking out.
   * Uses `git show branch:path` to read file contents.
   */
  async showFileFromBranch(
    repoPath: string,
    branch: string,
    filePath: string
  ): Promise<string | null> {
    const git = simpleGit(repoPath);
    try {
      // Try remote branch first, then local
      const remoteBranch = `origin/${branch}`;
      try {
        return await git.show([`${remoteBranch}:${filePath}`]);
      } catch {
        // Try local branch
        return await git.show([`${branch}:${filePath}`]);
      }
    } catch {
      logger.debug(`File ${filePath} not found on branch ${branch}`);
      return null;
    }
  }

  /**
   * Get list of changed files between two commits with their diff content.
   * Returns files categorized by change type with the actual diff for each file.
   */
  async getChangedFiles(
    repoPath: string,
    fromCommit: string,
    toCommit: string
  ): Promise<ChangedFilesResult> {
    const git = simpleGit(repoPath);
    
    try {
      // Get list of changed files with status
      const diffNameStatus = await git.raw([
        "diff",
        "--name-status",
        fromCommit,
        toCommit,
      ]);

      const files: ChangedFile[] = [];
      const lines = diffNameStatus.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        const [status, ...pathParts] = line.split("\t");
        const filePath = pathParts.join("\t"); // Handle paths with tabs (rare but possible)
        
        if (!status || !filePath) continue;

        let changeType: "added" | "modified" | "deleted";
        if (status.startsWith("A")) {
          changeType = "added";
        } else if (status.startsWith("D")) {
          changeType = "deleted";
        } else {
          changeType = "modified";
        }

        // Get the diff content for this specific file
        let diffContent = "";
        try {
          diffContent = await git.diff([fromCommit, toCommit, "--", filePath]);
        } catch {
          // File might have been renamed or have special characters
        }

        files.push({
          path: filePath,
          changeType,
          diff: diffContent,
        });
      }

      return { files };
    } catch (error) {
      logger.debug(`Failed to get diff between ${fromCommit} and ${toCommit}: ${error}`);
      return { files: [] };
    }
  }
}

export const gitService = new GitService();
