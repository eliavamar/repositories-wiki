import { simpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./logger";
import { CloneOptions, CloneResult, ParsedGithubUrl } from "../types";

export class GitService {

  /**
   * Parse a GitHub URL to extract owner, repo, and detect Enterprise URLs.
   * Supports both public GitHub (github.com) and GitHub Enterprise URLs.
   */
  private parseGithubUrl(urlString: string): ParsedGithubUrl {
    try {
      const parsedUrl = new URL(urlString);
      const hostname = parsedUrl.hostname;

      // Split the path to get owner and repo
      // pathname usually looks like "/owner/repo" or "/owner/repo/blob/main/..."
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

      if (pathSegments.length < 2) {
        throw new Error("The URL does not contain a valid owner and repository.");
      }

      const owner = pathSegments[0]!;
      
      // Grab the repo name and strip the '.git' extension if someone accidentally included it
      const repo = pathSegments[1]!.replace(/\.git$/, '');

      // Determine if it's an Enterprise URL
      // Standard public GitHub domains
      const isPublicGithub = hostname === 'github.com' || hostname === 'www.github.com';
      
      // If it's not public GitHub, format the standard Enterprise API URL
      const enterpriseApiUrl = isPublicGithub 
        ? null 
        : `${parsedUrl.protocol}//${hostname}/api/v3`;

      return {
        owner,
        repo,
        enterpriseApiUrl
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse GitHub URL: ${message}`);
    }
  }

  extractRepoName(url: string): string {
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

  /**
   * Check if a directory is a git repository.
   */
  async isGitRepo(dirPath: string): Promise<boolean> {
    const git = simpleGit(dirPath);
    try {
      return await git.checkIsRepo();
    } catch {
      return false;
    }
  }

  /**
   * Extract the repository name from a local directory path.
   */
  getRepoNameFromPath(dirPath: string): string {
    return path.basename(dirPath);
  }

  /**
   * Create and checkout a new branch from the current commit.
   */
  async createBranch(repoPath: string, branch: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.checkoutLocalBranch(branch);
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

  async addPath(repoPath: string, targetPath: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.add(targetPath);
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
   * Get file contents from GitHub using the REST API (native fetch).
   * Does not require cloning the repository.
   * Supports both public GitHub and GitHub Enterprise URLs.
   *
   * For GitHub Enterprise servers with self-signed certificates, set the
   * NODE_EXTRA_CA_CERTS environment variable to the path of the CA bundle.
   * 
   * @param repositoryUrl - Full repository URL (e.g., https://github.com/owner/repo or https://github.enterprise.com/owner/repo)
   * @param filePath - Path to the file within the repository
   * @param ref - Git ref (branch, tag, or commit SHA) to fetch from
   * @param token - Optional GitHub token for authentication
   */
  async getFileFromGitHub(
    repositoryUrl: string,
    filePath: string,
    ref: string,
    token?: string
  ): Promise<string | null> {
    // Parse the URL to get the target details
    const { owner, repo, enterpriseApiUrl } = this.parseGithubUrl(repositoryUrl);

    // Build the GitHub REST API URL
    const baseUrl = enterpriseApiUrl ?? "https://api.github.com";
    let url = `${baseUrl}/repos/${owner}/${repo}/contents/${filePath}`;
    if (ref) {
      url += `?ref=${encodeURIComponent(ref)}`;
    }

    // Build request headers
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "User-Agent": "repositories-wiki",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { headers });

      if (response.status === 404) {
        logger.debug(`File ${filePath} not found at ref ${ref} in ${owner}/${repo}`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;

      // Decode the Base64 content to a readable UTF-8 string
      if (!Array.isArray(data) && data.type === "file" && typeof data.content === "string") {
        return Buffer.from(data.content, "base64").toString("utf8");
      } else {
        logger.debug(`The path '${filePath}' points to a directory or submodule, not a file.`);
        return null;
      }
    } catch (error) {
      logger.debug(`Error fetching file from GitHub: ${error}`);
      throw error;
    }
  }

}

export const gitService = new GitService();
