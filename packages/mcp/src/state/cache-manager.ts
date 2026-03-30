import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { logger } from "@repositories-wiki/common";
import type { MCPConfig } from "../config.js";
import type { LoadedRepo } from "../loader/wiki-loader.js";
import {
  buildSnapshot,
  hashSearchEngineConfig,
  type ConfigSnapshot,
} from "./snapshot.js";

export class CacheManager {
  private loadedRepos: LoadedRepo[] = [];

  constructor(private readonly config: MCPConfig) {}

  getConfig(): MCPConfig {
    return this.config;
  }

  getLoadedRepos(): LoadedRepo[] {
    return this.loadedRepos;
  }

  getRepo(repoUrl: string): LoadedRepo | undefined {
    return this.loadedRepos.find((r) => r.config.repoUrl === repoUrl);
  }

  setAllRepos(repos: LoadedRepo[]): void {
    this.loadedRepos = [...repos];
    this.persist();
  }

  updateRepo(repo: LoadedRepo): void {
    this.loadedRepos = this.loadedRepos.filter(
      (r) => r.config.repoUrl !== repo.config.repoUrl,
    );
    this.loadedRepos.push(repo);
    this.persist();
  }

  removeRepo(repoUrl: string): void {
    this.loadedRepos = this.loadedRepos.filter(
      (r) => r.config.repoUrl !== repoUrl,
    );
    this.persist();
  }

  loadSnapshot(): ConfigSnapshot | null {
    if (!existsSync(this.config.snapshotPath)) {
      logger.info(`No previous snapshot found at ${this.config.snapshotPath}.`);
      return null;
    }

    try {
      const raw = readFileSync(this.config.snapshotPath, "utf-8");
      const parsed = JSON.parse(raw) as ConfigSnapshot;
      logger.info(`Loaded snapshot from ${this.config.snapshotPath}.`);
      return parsed;
    } catch (err) {
      logger.warn(`Failed to load snapshot: ${err}. Will treat as first run.`);
      return null;
    }
  }

  loadReposFromDisk(): LoadedRepo[] | null {
    const snapshot = this.loadSnapshot();
    if (!snapshot) return null;

    const currentHash = hashSearchEngineConfig(this.config.searchEngine);
    if (snapshot.searchEngineHash !== currentHash) {
      logger.info("Search engine config changed — ignoring disk repo cache.");
      return null;
    }

    if (!existsSync(this.config.repoCachePath)) {
      logger.info(`No repo cache found at ${this.config.repoCachePath}.`);
      return null;
    }

    try {
      const raw = readFileSync(this.config.repoCachePath, "utf-8");
      const repos = JSON.parse(raw) as LoadedRepo[];
      this.loadedRepos = repos;
      logger.info(`Restored ${repos.length} repo(s) from disk cache.`);
      return repos;
    } catch (err) {
      logger.warn(`Failed to load repo cache: ${err}. Will fetch from GitHub.`);
      return null;
    }
  }

  private persist(): void {
    this.persistSnapshot();
    this.persistRepoCache();
  }

  private persistSnapshot(): void {
    const snapshot = buildSnapshot(this.config, this.loadedRepos);
    mkdirSync(dirname(this.config.snapshotPath), { recursive: true });
    writeFileSync(this.config.snapshotPath, JSON.stringify(snapshot, null, 2), "utf-8");
    logger.info(`Snapshot persisted to ${this.config.snapshotPath}.`);
  }

  private persistRepoCache(): void {
    mkdirSync(dirname(this.config.repoCachePath), { recursive: true });
    writeFileSync(this.config.repoCachePath, JSON.stringify(this.loadedRepos), "utf-8");
    logger.info(`Repo cache persisted to ${this.config.repoCachePath}.`);
  }
}
