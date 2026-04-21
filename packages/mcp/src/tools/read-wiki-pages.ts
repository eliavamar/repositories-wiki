import fs from "fs";
import path from "path";
import { z } from "zod";
import type { RepoManager } from "../repo-manager.js";


export const ReadWikiPagesInputSchema = z.object({
  repository: z.string().describe("Repository identifier (e.g., 'owner/repo' for GitHub URLs or folder name for local paths)"),
  pages: z.array(z.string()).min(1).describe("Array of wiki page relative file paths from INDEX.md (e.g., 'sections/architecture/pipeline.md')"),
});

export type ReadWikiPagesInput = z.infer<typeof ReadWikiPagesInputSchema>;


interface PageContent {
  page: string;
  content: string;
}

interface PageError {
  page: string;
  error: string;
}

interface ReadWikiPagesOutput {
  repository: string;
  pages: PageContent[];
  errors?: PageError[];
}


export function handleReadWikiPages(
  input: ReadWikiPagesInput,
  repoManager: RepoManager,
): string {
  const repo = repoManager.getRepo(input.repository);
  if (!repo) {
    const available = repoManager.getRepoIds().join(", ");
    return JSON.stringify({
      error: `Repository "${input.repository}" not found. Available repositories: ${available}`,
    });
  }

  const output: ReadWikiPagesOutput = {
    repository: input.repository,
    pages: [],
  };
  const errors: PageError[] = [];

  for (const pagePath of input.pages) {
    const fullPath = path.join(repo.wikiPath, pagePath);

    // Prevent path traversal
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(path.resolve(repo.wikiPath))) {
      errors.push({ page: pagePath, error: "Invalid path: path traversal detected." });
      continue;
    }

    if (!fs.existsSync(resolvedPath)) {
      errors.push({ page: pagePath, error: `File not found: ${pagePath}` });
      continue;
    }

    const content = fs.readFileSync(resolvedPath, "utf-8");
    output.pages.push({ page: pagePath, content });
  }

  if (errors.length > 0) {
    output.errors = errors;
  }

  return JSON.stringify(output);
}
