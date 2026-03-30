import { logger } from "@repositories-wiki/common";
import type { IndexingOrchestrator } from "./indexing-orchestrator.js";
import type { CacheManager } from "./cache-manager.js";

export class FreshnessChecker {
  private lastChecked = new Map<string, number>();

  constructor(
    private readonly ttlMs: number,
    private readonly indexingOrchestrator: IndexingOrchestrator,
    private readonly cacheManager: CacheManager,
  ) {}

  async ensureFresh(repoUrl?: string): Promise<void> {
    if (repoUrl) {
      await this.checkRepo(repoUrl);
    } else {
      for (const repo of this.cacheManager.getLoadedRepos()) {
        await this.checkRepo(repo.config.repoUrl);
      }
    }
  }

  private async checkRepo(repoUrl: string): Promise<void> {
    const now = Date.now();
    const lastCheck = this.lastChecked.get(repoUrl) ?? 0;

    if (now - lastCheck < this.ttlMs) {
      return;
    }

    this.lastChecked.set(repoUrl, now);

    try {
      await this.indexingOrchestrator.checkAndReloadIfChanged(repoUrl);
    } catch (error) {
      logger.warn(`Freshness check failed for ${repoUrl}: ${error}. Using cached data.`);
    }
  }
}
