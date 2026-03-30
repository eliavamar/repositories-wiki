import { logger } from "@repositories-wiki/common";
import type { LoadedRepo } from "../loader/wiki-loader.js";
import { loadRepo } from "../loader/wiki-loader.js";
import type { VectorDB } from "../search-engine/vector-db.js";
import type { ConfigDiff } from "./snapshot.js";
import type { CacheManager } from "./cache-manager.js";
import { EmbeddingService } from "../search-engine/services/embedding-service.js";
import { indexRepo } from "../search-engine/services/indexing-service.js";

export class IndexingOrchestrator {
  constructor(
    private vectorDB: VectorDB,
    private embeddingService: EmbeddingService,
    private cacheManager: CacheManager,
  ) {}

  async fullRebuild(loadedRepos: LoadedRepo[]): Promise<void> {
    logger.info("Full rebuild triggered — re-indexing all repos...");

    const { searchEngine, dbPath } = this.cacheManager.getConfig();

    await this.vectorDB.init(dbPath, searchEngine.embeddingDimension, {
      force: true,
      batchSize: searchEngine.vectorDBBatchSize,
      similarityWeight: searchEngine.similarityWeight,
    });

    for (const repo of loadedRepos) {
      await indexRepo(repo, this.vectorDB, this.embeddingService, searchEngine);
    }

    this.cacheManager.setAllRepos(loadedRepos);
    logger.info("Full rebuild complete.");
  }

  async applyDiff(diff: ConfigDiff, currentRepos: LoadedRepo[]): Promise<void> {
    const { searchEngine } = this.cacheManager.getConfig();

    for (const repoUrl of diff.removedRepos) {
      logger.info(`Removing repo ${repoUrl} from index...`);
      await this.vectorDB.remove(repoUrl);
      this.cacheManager.removeRepo(repoUrl);
    }

    for (const repoUrl of diff.modifiedRepos) {
      logger.info(`Repo config changed for ${repoUrl} — reloading...`);
      await this.vectorDB.remove(repoUrl);

      const repoConfig = this.cacheManager.getRepo(repoUrl)?.config;
      if (!repoConfig) continue;

      const loaded = await loadRepo(repoConfig);
      await indexRepo(loaded, this.vectorDB, this.embeddingService, searchEngine);
      this.cacheManager.updateRepo(loaded);
    }

    for (const repoUrl of diff.commitChangedRepos) {
      logger.info(`Commit changed for ${repoUrl} — re-indexing...`);
      await this.vectorDB.remove(repoUrl);

      const loaded = currentRepos.find((r) => r.config.repoUrl === repoUrl);
      if (!loaded) continue;

      await indexRepo(loaded, this.vectorDB, this.embeddingService, searchEngine);
      this.cacheManager.updateRepo(loaded);
    }

    for (const repoUrl of diff.addedRepos) {
      logger.info(`New repo ${repoUrl} — loading and indexing...`);
      const repoConfig = this.cacheManager.getConfig().repos.find((r) => r.repoUrl === repoUrl);
      if (!repoConfig) continue;

      const loaded = await loadRepo(repoConfig);
      await indexRepo(loaded, this.vectorDB, this.embeddingService, searchEngine);
      this.cacheManager.updateRepo(loaded);
    }
  }

  async reloadRepo(repoUrl: string): Promise<void> {
    const repoConfig = this.cacheManager.getRepo(repoUrl)?.config;
    if (!repoConfig) {
      throw new Error(`Repo ${repoUrl} not found in config.`);
    }

    logger.info(`Reloading repo ${repoUrl}...`);
    await this.vectorDB.remove(repoUrl);

    const { searchEngine } = this.cacheManager.getConfig();
    const loaded = await loadRepo(repoConfig);
    await indexRepo(loaded, this.vectorDB, this.embeddingService, searchEngine);
    this.cacheManager.updateRepo(loaded);

    logger.info(`Repo ${repoUrl} reloaded successfully.`);
  }

  async checkAndReloadIfChanged(repoUrl: string): Promise<boolean> {
    const repoConfig = this.cacheManager.getRepo(repoUrl)?.config;
    if (!repoConfig) return false;

    const currentRepo = this.cacheManager.getRepo(repoUrl);
    if (!currentRepo) return false;

    const freshLoaded = await loadRepo(repoConfig);

    if (freshLoaded.commitId === currentRepo.commitId) {
      return false;
    }

    logger.info(
      `Commit changed for ${repoUrl}: ` +
        `${currentRepo.commitId.substring(0, 7)} → ${freshLoaded.commitId.substring(0, 7)}. Reloading...`,
    );

    const { searchEngine } = this.cacheManager.getConfig();
    await this.vectorDB.remove(repoUrl);
    await indexRepo(freshLoaded, this.vectorDB, this.embeddingService, searchEngine);
    this.cacheManager.updateRepo(freshLoaded);
    return true;
  }
}
