import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { logger } from "@repositories-wiki/common";
import type { MCPConfig, SearchEngineConfig, RepoConfig } from "../config.js";
import type { LoadedRepo } from "../loader/wiki-loader.js";


export interface RepoSnapshotEntry {
  /** Hash of the repo config (branch, gh_token) — detects config changes */
  configHash: string;
  /** The commitId from the loaded wiki.json — detects wiki regeneration */
  commitId: string;
}

export interface ConfigSnapshot {
  searchEngineHash: string;
  repos: Record<string, RepoSnapshotEntry>;
}


export interface ConfigDiff {
  searchEngineChanged: boolean;
  addedRepos: string[];
  removedRepos: string[];
  modifiedRepos: string[];
  commitChangedRepos: string[];
}


/**
 * Deterministic hash of any JSON-serializable object.
 * Uses sorted JSON keys to ensure consistency.
 */
export function hashObject(obj: unknown): string {
  const json = JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
  return createHash("sha256").update(json).digest("hex");
}

/**
 * Hash only the indexing-affecting fields. Scoring params (bestChunkWeight,
 * chunkCountWeight, importanceBoost) are excluded because they only affect
 * search-time ranking, not the stored data.
 */
export function hashSearchEngineConfig(config: SearchEngineConfig): string {
  return hashObject({
    embeddingModel: config.embeddingModel,
    embeddingDimension: config.embeddingDimension,
    embeddingBatchSize: config.embeddingBatchSize,
    vectorDBBatchSize: config.vectorDBBatchSize,
    similarityWeight: config.similarityWeight,
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
  });
}

export function hashRepoConfig(config: RepoConfig): string {
  return hashObject({
    branch: config.branch,
    gh_token: config.ghToken ?? "",
  });
}

export function loadSnapshot(path: string): ConfigSnapshot | null {
  if (!existsSync(path)) {
    logger.info(`No previous snapshot found at ${path}.`);
    return null;
  }

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as ConfigSnapshot;
    logger.info(`Loaded snapshot from ${path}.`);
    return parsed;
  } catch (err) {
    logger.warn(`Failed to load snapshot from ${path}: ${err}. Will treat as first run.`);
    return null;
  }
}

export function saveSnapshot(path: string, snapshot: ConfigSnapshot): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snapshot, null, 2), "utf-8");
  logger.info(`Snapshot saved to ${path}.`);
}


export function buildSnapshot(config: MCPConfig, loadedRepos: LoadedRepo[]): ConfigSnapshot {
  const repos: Record<string, RepoSnapshotEntry> = {};

  for (const repo of loadedRepos) {
    repos[repo.config.repoUrl] = {
      configHash: hashRepoConfig(repo.config),
      commitId: repo.commitId,
    };
  }

  return {
    searchEngineHash: hashSearchEngineConfig(config.searchEngine),
    repos,
  };
}


/**
 * - If no previous snapshot exists, everything is treated as "new" (first run).
 * - searchEngineChanged triggers a full rebuild.
 * - addedRepos / removedRepos / modifiedRepos / commitChangedRepos trigger selective operations.
 */
export function computeDiff(
  oldSnapshot: ConfigSnapshot | null,
  newConfig: MCPConfig,
  newLoadedRepos: LoadedRepo[],
): ConfigDiff {
  // First run — everything is new
  if (!oldSnapshot) {
    logger.info("No previous snapshot — treating all repos as new.");
    return {
      searchEngineChanged: true,
      addedRepos: newConfig.repos.map((r) => r.repoUrl),
      removedRepos: [],
      modifiedRepos: [],
      commitChangedRepos: [],
    };
  }

  const searchEngineChanged =
    oldSnapshot.searchEngineHash !== hashSearchEngineConfig(newConfig.searchEngine);

  if (searchEngineChanged) {
    logger.info("Search engine config changed — full rebuild required.");
  }

  const oldRepoUrls = new Set(Object.keys(oldSnapshot.repos));
  const newRepoUrls = new Set(newConfig.repos.map((r) => r.repoUrl));

  const addedRepos: string[] = [];
  const removedRepos: string[] = [];
  const modifiedRepos: string[] = [];
  const commitChangedRepos: string[] = [];

  // Detect added / modified / commitChanged repos
  for (const repo of newConfig.repos) {
    const oldEntry = oldSnapshot.repos[repo.repoUrl];

    if (!oldEntry) {
      addedRepos.push(repo.repoUrl);
      logger.info(`New repo detected: ${repo.repoUrl}`);
      continue;
    }

    const newConfigHash = hashRepoConfig(repo);
    if (oldEntry.configHash !== newConfigHash) {
      modifiedRepos.push(repo.repoUrl);
      logger.info(`Repo config changed: ${repo.repoUrl}`);
      continue;
    }

    // Config unchanged — check if commitId changed
    const loadedRepo = newLoadedRepos.find((r) => r.config.repoUrl === repo.repoUrl);
    if (loadedRepo && oldEntry.commitId !== loadedRepo.commitId) {
      commitChangedRepos.push(repo.repoUrl);
      logger.info(
        `Commit changed for ${repo.repoUrl}: ` +
          `${oldEntry.commitId.substring(0, 7)} → ${loadedRepo.commitId.substring(0, 7)}`
      );
    }
  }

  // Detect removed repos
  for (const url of oldRepoUrls) {
    if (!newRepoUrls.has(url)) {
      removedRepos.push(url);
      logger.info(`Repo removed: ${url}`);
    }
  }

  return { searchEngineChanged, addedRepos, removedRepos, modifiedRepos, commitChangedRepos };
}
