#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { logger } from "@repositories-wiki/common";

import { parseConfig } from "./config.js";
import { RepoManager } from "./repo-manager.js";
import { handleReadWikiIndex } from "./tools/read-wiki-index.js";
import { handleReadWikiPages } from "./tools/read-wiki-pages.js";
import { handleReadSourceFiles } from "./tools/read-source-file.js";

async function main(): Promise<void> {
  logger.info("Starting repositories-wiki MCP server...");


  const config = parseConfig();
  const repoManager = new RepoManager();
  await repoManager.initialize(config);

  const repoListDesc = repoManager.buildRepoListDescription();
  logger.info(`Initialized ${repoManager.getRepoIds().length} repository(ies).`);


  const server = new McpServer({
    name: "repositories-wiki",
    version: "1.0.0",
  });


  server.registerTool(
    "read_wiki_index",
    {
      description:
        `Read the wiki INDEX.md for a repository. ` +
        `Returns the full index with sections, pages, importance levels, and relevant source files. ` +
        `Use this first to discover what wiki pages are available and find the right pages for your task.` +
        repoListDesc,
      inputSchema: {
        repository: z
          .string()
          .describe("Repository identifier (e.g., 'owner/repo' for GitHub URLs or folder name for local paths)"),
      },
    },
    async (params) => {
      const result = handleReadWikiIndex(
        { repository: params.repository },
        repoManager,
      );
      return {
        content: [{ type: "text" as const, text: result }],
      };
    },
  );


  server.registerTool(
    "read_wiki_pages",
    {
      description:
        `Read the full content of one or more wiki pages by their file paths. ` +
        `Use this after read_wiki_index to get the complete content of pages relevant to your task. ` +
        `Pages contain architecture docs, diagrams, source citations, and implementation details.` +
        repoListDesc,
      inputSchema: {
        repository: z
          .string()
          .describe("Repository identifier (e.g., 'owner/repo' for GitHub URLs or folder name for local paths)"),
        pages: z
          .array(z.string())
          .min(1)
          .describe("Array of wiki page relative file paths from INDEX.md (e.g., 'sections/architecture/pipeline.md')"),
      },
    },
    async (params) => {
      const result = handleReadWikiPages(
        { repository: params.repository, pages: params.pages },
        repoManager,
      );
      return {
        content: [{ type: "text" as const, text: result }],
      };
    },
  );


  server.registerTool(
    "read_source_files",
    {
      description:
        `Read the actual source code of one or more files from a repository. ` +
        `Use this when you need to see the real implementation code referenced in wiki pages.` +
        repoListDesc,
      inputSchema: {
        repository: z
          .string()
          .describe("Repository identifier (e.g., 'owner/repo' for GitHub URLs or folder name for local paths)"),
        file_paths: z
          .array(z.string())
          .min(1)
          .describe("Array of relative file paths within the repository (e.g., ['src/main.ts', 'src/utils.ts'])"),
      },
    },
    async (params) => {
      const result = handleReadSourceFiles(
        { repository: params.repository, file_paths: params.file_paths },
        repoManager,
      );
      return {
        content: [{ type: "text" as const, text: result }],
      };
    },
  );


  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP server started successfully on stdio transport.");

  const cleanup = async () => {
    logger.info("Shutting down MCP server...");
    repoManager.cleanup();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((error) => {
  logger.error(`Fatal error: ${error}`);
  process.exit(1);
});
