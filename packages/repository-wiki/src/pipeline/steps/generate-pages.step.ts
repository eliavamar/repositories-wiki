import pLimit from "p-limit";
import { logger } from "@repositories-wiki/common";
import type { WikiPage } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import {
  generatePageContentPrompt,
  pageContentTimeoutRetryPrompt,
} from "../prompts";
import { calculateFileImportance, getPreloadedFilesForPage, wikiFilesToFileContentsMap } from "../../utils/files";
import { createTokenizer } from "../../utils/tokenizer";
import { CONCURRENCY_LIMIT, MAX_RETRIES, REPOSITORY_WIKI_DIR } from "../../utils/consts";
import { retryWithRecovery } from "../../utils/retry";

interface PageGenerationResult {
  page: WikiPage;
  success: boolean;
  error?: string;
}


function parsePageContent(raw: string): string {
  const match = raw.match(/<content>([\s\S]*?)<\/content>/);
  if (!match?.[1]) {
    throw new Error("Could not find <content>...</content> tags in LLM response");
  }
  return match[1].trim();
}

export class GeneratePagesStep implements PipelineStep {
  readonly name = "Generate Pages";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath || !context.repoName) {
      throw new Error("repoPath and repoName are required");
    }
    if (!context.agent) {
      throw new Error("agent is required");
    }
    if (!context.wikiStructure) {
      throw new Error("wikiStructure is required");
    }

    const { wikiStructure, agent, repoPath, repoName } = context;

    const pagesToGenerate: WikiPage[] = [];
    const pageSectionMap = new Map<WikiPage, string>();
    for (const section of wikiStructure.sections) {
      for (const page of section.pages) {
        pagesToGenerate.push(page);
        pageSectionMap.set(page, section.title);
      }
    }
    logger.info(`Start generate ${pagesToGenerate.length} wikis pages`);

    // Pre-load source files for all pages to inject into prompts
    const tokenizer = await createTokenizer();
    const allPreloadedFiles = await wikiFilesToFileContentsMap(pagesToGenerate, repoPath);
    logger.info(`Pre-loaded ${allPreloadedFiles.size} unique source files for page generation`);

    const limit = pLimit(CONCURRENCY_LIMIT);
    let completedCount = 0;
    const totalCount = pagesToGenerate.length;
    const failedPages: string[] = [];

    const pageGenerationTasks = pagesToGenerate.map((page) =>
      limit(async (): Promise<PageGenerationResult> => {

        try {
          const sectionTitle = pageSectionMap.get(page) ?? "";
          const pageFiles = getPreloadedFilesForPage(page, allPreloadedFiles, tokenizer);
          const outputDirPath = context.config.outputDirPath? context.config.outputDirPath : REPOSITORY_WIKI_DIR;
          const pageDepth = this.countPageDepth(outputDirPath)
          const originalPrompt = generatePageContentPrompt(
            page,
            sectionTitle,
            repoName,
            wikiStructure.description,
            pageDepth,
            pageFiles,
          );

          const modelId = context.config.llmExploration.modelID;

          const { parsed: content } = await retryWithRecovery<string>({
            run: (prompt) =>
              agent.generate({
                model: modelId,
                prompt,
                projectPath: repoPath,
              }),
            originalPrompt,
            timeoutRetryPrompt: pageContentTimeoutRetryPrompt(page.title),
            parsingRetryPrompt: originalPrompt + `Your previous response for page "${page.title}" was missing the required <content>...</content> tags. Please return the wiki page content wrapped in <content> tags. Example: <content>your markdown here</content>`,
            parse: parsePageContent,
            label: `page "${page.title}"`,
          });

          this.updatePage(page, content);
          completedCount++;
          logger.info(
            `✓ Generated: ${page.title} [${completedCount}/${totalCount}]`
          );

          return {
            page,
            success: true,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`✗ Failed: ${page.title} after ${MAX_RETRIES + 1} attempts`, {
            error: errorMessage,
          });

          // Set placeholder content for failed pages
          page.content = `> ⚠️ **Content generation failed**\n>\n> This page could not be generated due to an error. Please try regenerating this page.\n>\n> Error: ${errorMessage}`;
          completedCount++;
          failedPages.push(page.title);

          return {
            page,
            success: false,
            error: errorMessage,
          };
        }
      })
    );

    // Use Promise.allSettled to ensure all tasks complete (even if some fail)
    const results = await Promise.all(pageGenerationTasks);

    // Report summary
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount > 0) {
      logger.warn(`━━━ Generation Summary ━━━`);
      logger.warn(`✓ Succeeded: ${successCount}/${totalCount} pages`);
      logger.warn(`✗ Failed: ${failCount} pages (${failedPages.join(", ")})`);
    } else {
      logger.info(`━━━ All ${totalCount} pages generated successfully ━━━`);
    }

    return context;
  }

  private countPageDepth(pagePath: string) {
    let pageDepth = 3; // repository wiki folder + sections folder + section folder
    pageDepth += (pagePath.match(/\//g) || []).length
    return pageDepth;
  }
  private updatePage(page: WikiPage, content: string) {
    page.content = content;
    const filesPaths = page.relevantFiles.map((relevantFile) => relevantFile.filePath);
    page.relevantFiles = calculateFileImportance(filesPaths, content);
  }
}
