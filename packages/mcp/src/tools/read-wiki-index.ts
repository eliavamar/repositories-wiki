import fs from "fs";
import path from "path";
import { z } from "zod";
import type { RepoManager } from "../repo-manager.js";


export const ReadWikiIndexInputSchema = z.object({
  repository: z.string().describe("Repository identifier (e.g., 'owner/repo' for GitHub URLs or folder name for local paths)"),
});

export type ReadWikiIndexInput = z.infer<typeof ReadWikiIndexInputSchema>;


export function handleReadWikiIndex(
  input: ReadWikiIndexInput,
  repoManager: RepoManager,
): string {
  const repo = repoManager.getRepo(input.repository);
  if (!repo) {
    const available = repoManager.getRepoIds().join(", ");
    return JSON.stringify({
      error: `Repository "${input.repository}" not found. Available repositories: ${available}`,
    });
  }

  const indexPath = path.join(repo.wikiPath, "INDEX.md");
  if (!fs.existsSync(indexPath)) {
    return JSON.stringify({
      error: `INDEX.md not found for repository "${input.repository}".`,
    });
  }

  const content = fs.readFileSync(indexPath, "utf-8");
  return content;
}
