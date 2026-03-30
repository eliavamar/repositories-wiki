#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { logger } from "@repositories-wiki/common";

import { parseConfig } from "./config.js";
import { loadAllRepos } from "./loader/wiki-loader.js";
import { VectorDB } from "./search-engine/vector-db.js";
import { computeDiff } from "./state/snapshot.js";
import { CacheManager } from "./state/cache-manager.js";
import { IndexingOrchestrator } from "./state/indexing-orchestrator.js";
import { FreshnessChecker } from "./state/freshness-checker.js";
import {
  handleSearchInReposWiki,
  SearchInReposWikiInputSchema,
} from "./tools/search-in-repos-wiki.js";
import {
  handleGetWikiPages,
  GetWikiPagesInputSchema,
} from "./tools/get-wiki-pages.js";
import {
  handleReadSourceFile,
  ReadSourceFileInputSchema,
} from "./tools/read-source-file.js";
import { EmbeddingService } from "./search-engine/services/embedding-service.js";

async function main(): Promise<void> {
  logger.info("Starting repositories-wiki MCP server...");

  const config = parseConfig();
  logger.info(`Configured ${config.repos.length} repository(ies).`);

  const cacheManager = new CacheManager(config);

  const oldSnapshot = cacheManager.loadSnapshot();

  const { searchEngine } = config;
  const embeddingService = new EmbeddingService(
    searchEngine.embeddingModel,
    searchEngine.embeddingDimension,
    searchEngine.embeddingBatchSize,
  );
  await embeddingService.initialize();

  const vectorDB = new VectorDB();

  const orchestrator = new IndexingOrchestrator(vectorDB, embeddingService, cacheManager);

  const cachedRepos = cacheManager.loadReposFromDisk();

  if (cachedRepos && oldSnapshot) {
    const diff = computeDiff(oldSnapshot, config, cachedRepos);

    if (diff.searchEngineChanged) {
      logger.info("Search engine config changed — fetching all repos and performing full rebuild...");
      const freshRepos = await loadAllRepos(config.repos);
      await orchestrator.fullRebuild(freshRepos);
    } else {
      await vectorDB.init(config.dbPath, searchEngine.embeddingDimension, {
        batchSize: searchEngine.vectorDBBatchSize,
        similarityWeight: searchEngine.similarityWeight,
      });

      const hasChanges =
        diff.addedRepos.length > 0 ||
        diff.removedRepos.length > 0 ||
        diff.modifiedRepos.length > 0 ||
        diff.commitChangedRepos.length > 0;

      if (hasChanges) {
        logger.info("Applying selective changes from disk cache...");
        await orchestrator.applyDiff(diff, cachedRepos);
      } else {
        logger.info("No changes detected — using existing index and disk cache.");
        cacheManager.setAllRepos(cachedRepos);
      }
    }
  } else {
    logger.info("First run or no disk cache — fetching all repos from GitHub...");
    const freshRepos = await loadAllRepos(config.repos);
    await orchestrator.fullRebuild(freshRepos);
  }

  const freshnessChecker = new FreshnessChecker(
    config.freshnessCheckTTLMinutes * 60 * 1000,
    orchestrator,
    cacheManager,
  );

  const currentRepos = cacheManager.getLoadedRepos();
  const repoSummaries = currentRepos
    .map((r) => {
      return `- ${r.config.repoUrl} (${r.wiki.title}): ${r.wiki.description}`;
    })
    .join("\n");

  const repoListDesc = `\n\nAvailable repositories:\n${repoSummaries}`;

  const server = new McpServer({
    name: "repositories-wiki",
    version: "1.0.0",
  });

  server.tool(
    "search_in_repos_wiki",
    `Search across wiki knowledge from all configured repositories. ` +
      `Returns the most relevant content chunks with page context, scored by relevance. ` +
      `Use this to find information about code architecture, features, patterns, and implementation details. ` +
      `Optionally filter to a specific repository by repo_url.` +
      repoListDesc,
    {
      query: z.string().describe("Natural language or code-related search query"),
      repo_url: z.string().optional().describe("Optional: filter results to a specific repository URL"),
      limit: z.number().min(1).max(50).default(10).describe("Maximum number of results to return (default: 10)"),
    },
    async (params) => {
      const input = SearchInReposWikiInputSchema.parse(params);
      const result = await handleSearchInReposWiki(input, vectorDB, embeddingService, freshnessChecker, cacheManager);
      return {
        content: [{ type: "text" as const, text: result }],
      };
    }
  );

  server.tool(
    "get_wiki_pages",
    `Retrieve full wiki page content for specific pages by their IDs. ` +
      `Use this after search_in_repos_wiki to get the complete content of pages you're interested in. ` +
      `Returns page content, metadata, section info, related pages, and referenced files.` +
      repoListDesc,
    {
      pagesConfig: z.array(
        z.object({
          repo_url: z.string().describe("Repository URL"),
          page_id: z.array(z.string()).describe("Array of page IDs to retrieve"),
        })
      ).describe("Array of repository configurations with page IDs to retrieve"),
    },
    async (params) => {
      const input = GetWikiPagesInputSchema.parse(params);
      const result = await handleGetWikiPages(input, freshnessChecker, cacheManager);
      return {
        content: [{ type: "text" as const, text: result }],
      };
    }
  );

  server.tool(
    "read_source_file",
    `Read the actual source code of a file from a repository. ` +
      `Fetches the file content at the exact commit the wiki was generated from. ` +
      `Use this when you need to see the real implementation code referenced in wiki pages.` +
      repoListDesc,
    {
      filePath: z.string().describe("File path as referenced in wiki pages (e.g. 'src/main.ts')"),
      repo_url: z.string().describe("Repository URL to read the file from"),
    },
    async (params) => {
      const input = ReadSourceFileInputSchema.parse(params);
      const result = await handleReadSourceFile(input, freshnessChecker, cacheManager);
      return {
        content: [{ type: "text" as const, text: result }],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP server started successfully on stdio transport.");

  const cleanup = async () => {
    logger.info("Shutting down MCP server...");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((error) => {
  logger.error(`Fatal error: ${error}`);
  process.exit(1);
});
