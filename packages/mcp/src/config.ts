import { z } from "zod";
import { logger } from "@repositories-wiki/common";


const RepoInputSchema = z
  .object({
    url: z.string().url().optional(),
    path: z.string().optional(),
    token: z.string().optional(),
    branch: z.string().optional(),
  })
  .refine((data) => !!data.url || !!data.path, {
    message: "Either 'url' or 'path' must be provided.",
  })
  .refine((data) => !(data.url && data.path), {
    message: "Cannot specify both 'url' and 'path'. Choose one input source.",
  });

const MCPConfigSchema = z.object({
  repos: z.array(RepoInputSchema).min(1, "At least one repository must be configured."),
});


export interface RepoInput {
  url?: string;
  path?: string;
  token?: string;
  branch?: string;
}

export interface MCPConfig {
  repos: RepoInput[];
}


export const WIKI_DIR_NAME = "repository-wiki";


export function parseConfig(): MCPConfig {
  const raw = process.env.REPOS_WIKI_MCP_CONFIG;
  if (!raw) {
    throw new Error(
      "No configuration found. Set the REPOS_WIKI_MCP_CONFIG environment variable.\n" +
        'Example: { "repos": [{ "path": "/local/repo" }, { "url": "https://github.com/owner/repo" }] }'
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "REPOS_WIKI_MCP_CONFIG is not valid JSON.\n" +
        'Expected: { "repos": [{ "path": "/local/repo" }, { "url": "https://github.com/owner/repo" }] }'
    );
  }

  const result = MCPConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`REPOS_WIKI_MCP_CONFIG validation failed: ${result.error.message}`);
  }

  logger.info(`Parsed config: ${result.data.repos.length} repository(ies).`);
  return result.data;
}
