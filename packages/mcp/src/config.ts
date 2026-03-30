import { z } from "zod";
import { logger } from "@repositories-wiki/common";


export const ImportanceBoostSchema = z.object({
  high: z.number().default(0.10),
  medium: z.number().default(0.05),
  low: z.number().default(0.00),
});

export const SearchEngineConfigSchema = z.object({
  // Indexing params (affect stored data — changing these triggers full rebuild)
  embeddingModel: z.string().default("Xenova/all-MiniLM-L6-v2"),
  embeddingDimension: z.number().int().positive().default(384),
  embeddingBatchSize: z.number().int().positive().default(32),
  vectorDBBatchSize: z.number().int().positive().default(1000),
  similarityWeight: z.number().min(0).max(100).default(75),
  chunkSize: z.number().int().positive().default(1000),
  chunkOverlap: z.number().int().min(0).default(200),
  // Scoring params (search-time only — changing these does NOT trigger rebuild)
  bestChunkWeight: z.number().min(0).max(1).default(0.70),
  chunkCountWeight: z.number().min(0).max(1).default(0.15),
  importanceBoost: ImportanceBoostSchema.default({}),
});

export type SearchEngineConfig = z.infer<typeof SearchEngineConfigSchema>;


export const RepoConfigSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string().default("memory"),
  ghToken: z.string().optional(),
  localPath: z.string().optional(),
});

export type RepoConfig = z.infer<typeof RepoConfigSchema>;


export const INFRA_DEFAULTS = {
  freshnessCheckTTLMinutes: 5,
  snapshotPath: "./data/snapshot.json",
  repoCachePath: "./data/repos-cache.json",
  dbPath: "./data/vector-db.json",
} as const;

export const UserConfigSchema = z.object({
  searchEngine: SearchEngineConfigSchema.default({}),
  repos: z.array(RepoConfigSchema).min(1, "At least one repository must be configured."),
});

export type UserConfig = z.infer<typeof UserConfigSchema>;

export type MCPConfig = UserConfig & typeof INFRA_DEFAULTS;


export function parseConfig(): MCPConfig {

  return parseLegacyConfig();
}

function parseLegacyConfig(): MCPConfig {
  const raw = process.env.WIKI_REPOS;
  if (!raw) {
    throw new Error(
      "No configuration found. Provide one of:\n" +
        "  1. A config file (mcp-config.json or MCP_CONFIG_PATH env var)\n" +
        '  2. WIKI_REPOS env var (JSON array of { repo_url, branch?, gh_token? })\n' +
        'Example config file: { "repos": [{ "repo_url": "https://github.com/owner/repo" }] }'
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "WIKI_REPOS environment variable is not valid JSON. " +
        'Expected JSON array of { repo_url, branch?, gh_token? }.'
    );
  }

  const reposResult = z.array(RepoConfigSchema).safeParse(parsed);
  if (!reposResult.success) {
    throw new Error(`WIKI_REPOS validation failed: ${reposResult.error.message}`);
  }

  if (reposResult.data.length === 0) {
    throw new Error("WIKI_REPOS must contain at least one repository configuration.");
  }

  logger.info(`Legacy config: ${reposResult.data.length} repo(s) from WIKI_REPOS env var.`);

  const userConfig = UserConfigSchema.parse({
    repos: reposResult.data,
  });

  return { ...INFRA_DEFAULTS, ...userConfig };
}
