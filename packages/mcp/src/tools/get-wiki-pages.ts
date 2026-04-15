import { z } from "zod";
import type { FreshnessChecker } from "../state/freshness-checker.js";
import type { CacheManager } from "../state/cache-manager.js";
import { buildSectionLookup } from "../search-engine/utils.js";

// --- Input Schema ---
export const GetWikiPagesInputSchema = z.object({
  pagesConfig: z.array(
    z.object({
      repo_url: z.string().describe("Repository URL"),
      page_id: z.array(z.string()).describe("Array of page IDs to retrieve"),
    })
  ).describe("Array of repository configurations with page IDs to retrieve"),
});

export type GetWikiPagesInput = z.infer<typeof GetWikiPagesInputSchema>;

interface PageResult {
  id: string;
  title: string;
  content: string;
  importance: string;
  relevant_files: { filePath: string; importance?: string }[];
  related_pages: string[];
}

interface SectionResult {
  sectionTitle: string;
  sectionId: string;
  pages: PageResult[];
}

interface RepoResult {
  wiki_title: string;
  commit_id: string;
  sections: SectionResult[];
  errors?: string[];
}

interface GetWikiPagesOutput {
  results: RepoResult[];
}


export async function handleGetWikiPages(
  input: GetWikiPagesInput,
  freshnessChecker: FreshnessChecker,
  cacheManager: CacheManager,
): Promise<string> {
  for (const config of input.pagesConfig) {
    await freshnessChecker.ensureFresh(config.repo_url);
  }

  const loadedRepos = cacheManager.getLoadedRepos();
  const output: GetWikiPagesOutput = { results: [] };
  const repoLookup = new Map(loadedRepos.map((r) => [r.config.repoUrl, r]));

  for (const config of input.pagesConfig) {
    const repo = repoLookup.get(config.repo_url);

    if (!repo) {
      output.results.push({
        wiki_title: "",
        commit_id: "",
        sections: [],
        errors: [`Repository not found: ${config.repo_url}`],
      });
      continue;
    }

    const sectionLookup = buildSectionLookup(repo.wiki);
    const pagesMap = new Map(repo.wiki.pages.map(p => [p.id, p]));

    // Group pages by section id
    const sectionPagesMap = new Map<string, { sectionTitle: string; pages: PageResult[] }>();
    const errors: string[] = [];

    for (const pageId of config.page_id) {
      const page = pagesMap.get(pageId);

      if (!page) {
        errors.push(`Page not found: ${pageId}`);
        continue;
      }

      const sectionInfo = sectionLookup.get(page.id);
      if (!sectionInfo) {
        errors.push(`Not found match section to page: ${pageId}`);
        continue;
      }

      const pageResult: PageResult = {
        id: page.id,
        title: page.title,
        content: page.content,
        importance: page.importance ?? "medium",
        relevant_files: page.relevantFiles.map(f => ({
          filePath: f.filePath,
          importance: f.importance,
        })),
        related_pages: page.relatedPages,
      };

      const { id, title } = sectionInfo;
      const existingSection = sectionPagesMap.get(id);
      if (existingSection) {
        existingSection.pages.push(pageResult);
      } else {
        sectionPagesMap.set(id, { sectionTitle: title, pages: [pageResult] });
      }
    }

    const sections: SectionResult[] = [];
    for (const [sectionId, { sectionTitle, pages }] of sectionPagesMap) {
      sections.push({
        sectionId,
        sectionTitle,
        pages,
      });
    }

    const repoResult: RepoResult = {
      wiki_title: repo.wiki.title,
      commit_id: repo.wiki.commitId,
      sections,
    };

    if (errors.length > 0) {
      repoResult.errors = errors;
    }
    output.results.push(repoResult);
  }
  return JSON.stringify(output);
}
