import fs from "fs";
import path from "path";
import os from "os";
import { gitService, logger } from "@repositories-wiki/common";
import { type RepoInput, type MCPConfig, WIKI_DIR_NAME } from "./config.js";


export interface ResolvedRepo {
  /** Unique identifier: "owner/repo" */
  id: string;
  /** Absolute path to the repository root on disk */
  repoPath: string;
  /** Absolute path to the wiki directory */
  wikiPath: string;
  isCloned: boolean;
}


const TEMP_DIR_NAME = "repositories-wiki-mcp";

export class RepoManager {
  private repos: Map<string, ResolvedRepo> = new Map();
  private readonly tempBaseDir: string;

  constructor() {
    this.tempBaseDir = path.join(os.tmpdir(), TEMP_DIR_NAME);
  }

  /**
   * Initialize all repositories from config.
   * URL repos are cloned to a temp directory; local repos are used as-is.
   * Must be called before using any other methods.
   */
  async initialize(config: MCPConfig): Promise<void> {
    // Clean up previous clones
    this.cleanupTempDir();

    // Create fresh temp directory for cloned repos
    fs.mkdirSync(this.tempBaseDir, { recursive: true });

    for (const repoInput of config.repos) {
      const resolved = repoInput.url
        ? await this.resolveUrlRepo(repoInput)
        : this.resolveLocalRepo(repoInput);

      // Verify wiki exists
      if (!fs.existsSync(resolved.wikiPath)) {
        throw new Error(
          `Wiki directory not found at "${resolved.wikiPath}". ` +
            `Make sure the wiki has been generated for repository "${resolved.id}".`
        );
      }

      const indexPath = path.join(resolved.wikiPath, "INDEX.md");
      if (!fs.existsSync(indexPath)) {
        throw new Error(
          `INDEX.md not found at "${indexPath}". ` +
            `Make sure the wiki has been generated with the latest version for repository "${resolved.id}".`
        );
      }

      // Check for ID collisions
      if (this.repos.has(resolved.id)) {
        throw new Error(
          `Duplicate repository identifier "${resolved.id}". ` +
            `Two repositories resolve to the same ID. Use unique repository URLs or local paths.`
        );
      }

      this.repos.set(resolved.id, resolved);
      logger.info(`Registered repository: ${resolved.id} → ${resolved.repoPath}`);
    }
  }

  getRepo(id: string): ResolvedRepo | undefined {
    return this.repos.get(id);
  }

  getRepoIds(): string[] {
    return Array.from(this.repos.keys());
  }

  getAllRepos(): ResolvedRepo[] {
    return Array.from(this.repos.values());
  }

  buildRepoListDescription(): string {
    const entries = this.getAllRepos().map((r) => `- ${r.id}`);
    return `\n\nAvailable repositories:\n${entries.join("\n")}`;
  }

  cleanup(): void {
    this.cleanupTempDir();
  }


  private async resolveUrlRepo(input: RepoInput): Promise<ResolvedRepo> {
    const url = input.url!;
    const id = gitService.extractOwnerRepo(url);

    // Clone into our dedicated temp directory
    const cloneDir = path.join(this.tempBaseDir, id.replace("/", "--"));
    logger.info(`Cloning repository ${url} to ${cloneDir}...`);

    await gitService.cloneRepository(url, {
      token: input.token,
      branch: input.branch,
      targetDir: cloneDir,
    });

    return {
      id,
      repoPath: cloneDir,
      wikiPath: path.join(cloneDir, WIKI_DIR_NAME),
      isCloned: true,
    };
  }

  private resolveLocalRepo(input: RepoInput): ResolvedRepo {
    const localPath = path.resolve(input.path!);

    if (!fs.existsSync(localPath)) {
      throw new Error(`Local repository path not found: "${localPath}"`);
    }

    const id = path.basename(localPath);

    return {
      id,
      repoPath: localPath,
      wikiPath: path.join(localPath, WIKI_DIR_NAME),
      isCloned: false,
    };
  }

  private cleanupTempDir(): void {
    if (fs.existsSync(this.tempBaseDir)) {
      logger.info(`Cleaning up temp directory: ${this.tempBaseDir}`);
      fs.rmSync(this.tempBaseDir, { recursive: true, force: true });
    }
    this.repos.clear();
  }
}
