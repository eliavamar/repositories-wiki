import { z } from "zod";
import type { VectorDB } from "../search-engine/vector-db.js";
import type { FreshnessChecker } from "../state/freshness-checker.js";
import type { CacheManager } from "../state/cache-manager.js";
import { EmbeddingService } from "../search-engine/services/embedding-service.js";
import { searchWiki } from "../search-engine/services/search-service.js";

export const SearchInReposWikiInputSchema = z.object({
  query: z.string().describe("Natural language or code-related search query"),
  repo_url: z.string().optional().describe("Optional: filter results to a specific repository URL"),
  limit: z.number().min(1).max(50).default(10).describe("Maximum number of results to return (default: 10)"),
});

export type SearchInReposWikiInput = z.infer<typeof SearchInReposWikiInputSchema>;

export async function handleSearchInReposWiki(
  input: SearchInReposWikiInput,
  vectorDB: VectorDB,
  embeddingService: EmbeddingService,
  freshnessChecker: FreshnessChecker,
  cacheManager: CacheManager,
): Promise<string> {
  const { query, repo_url, limit } = input;

  await freshnessChecker.ensureFresh(repo_url);

  const loadedRepos = cacheManager.getLoadedRepos();
  const { searchEngine } = cacheManager.getConfig();
  const result = await searchWiki(query, vectorDB, embeddingService, loadedRepos, searchEngine, {
    repoUrl: repo_url,
    limit,
  });

  if (result.total === 0) {
    return JSON.stringify({
      results: [],
      message: `No results found for query: "${query}"${repo_url ? ` in ${repo_url}` : ""}`,
    });
  }

  return JSON.stringify(result);
}
