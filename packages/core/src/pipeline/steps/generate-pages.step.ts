import pLimit from "p-limit";
import { logger } from "@repositories-wiki/common";
import type { WikiStructureModel, WikiPage, PageContentOutput } from "@repositories-wiki/common";
import { PageContentOutputSchema } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import {
  generatePageContentPrompt,
  pageContentTimeoutRetryPrompt,
} from "../prompts";
import { calculateFileImportance, getPreloadedFilesForPage, wikiFilesToFileContentsMap } from "../../utils/files";
import { createTokenizer } from "../../utils/tokenizer";
import { CONCURRENCY_LIMIT, MAX_RETRIES } from "../../utils/consts";
import { retryWithRecovery } from "../../utils/retry";

interface PageGenerationResult {
  page: WikiPage;
  success: boolean;
  error?: string;
  filesCount?: number;
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

    const { wikiStructure, agent, repoPath, repoName, flowType } = context;

    // Determine which pages need content generation
    const pagesToGenerate = this.getPagesToGenerate(wikiStructure.pages, flowType);
    const pagesToSkip = wikiStructure.pages.length - pagesToGenerate.length;

    if (pagesToSkip > 0) {
      logger.info(`Skipping ${pagesToSkip} pages (content unchanged)`);
    }

    if (pagesToGenerate.length === 0) {
      logger.info("No pages need content generation");
      return context;
    }

    logger.info(`Generating content for ${pagesToGenerate.length} pages (${CONCURRENCY_LIMIT} concurrent)...`);

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
        const statusLabel = page.status ? ` [${page.status}]` : "Page without content";
        logger.info(`Generating content for: ${page.title}${statusLabel}`);

        try {
          const sectionTitle = findSectionTitle(wikiStructure, page.id);
          const pageFiles = getPreloadedFilesForPage(page, allPreloadedFiles, tokenizer);
          const originalPrompt = generatePageContentPrompt(
            page,
            sectionTitle,
            repoName,
            wikiStructure.description,
            pageFiles,
          );

          const modelId = (context.config.llmExploration || context.config.llm).modelID;

          const { parsed: result } = await retryWithRecovery<PageContentOutput>({
            run: (prompt) =>
              agent.generate<PageContentOutput>({
                model: modelId,
                prompt,
                projectPath: repoPath,
                structuredOutput: PageContentOutputSchema,
              }),
            originalPrompt,
            timeoutRetryPrompt: pageContentTimeoutRetryPrompt(page.title),
            label: `page "${page.title}"`,
          });

          // Update page with generated content
          page.content = result.content;
          if (result.relevantFiles.length > 0) {
            page.relevantFiles = calculateFileImportance(result.relevantFiles, result.content);
          }

          completedCount++;
          logger.info(
            `✓ Generated: ${page.title} (${result.relevantFiles.length} files) [${completedCount}/${totalCount}]`
          );

          return {
            page,
            success: true,
            filesCount: result.relevantFiles.length,
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

    // Clear status from all pages (including those that were skipped)
    if(flowType == "update"){
      for (const page of wikiStructure.pages) {
        if(page.status){
          delete page.status;
        }
      }
    }

    return context;
  }

  /**
   * Determine which pages need content generation based on flow type and page status.
   * - For "new" flow: generate all pages
   * - For "update" flow: only generate pages with status "NEW" or "UPDATE"
   */
  private getPagesToGenerate(pages: WikiPage[], flowType?: "new" | "update"): WikiPage[] {
    if (flowType === "update") {
      // Only generate pages that have a status (NEW or UPDATE)
      return pages.filter((page) => page.status === "NEW" || page.status === "UPDATE" || !page.content);
    }

    // For new flow, generate all pages
    return pages;
  }
}

function findSectionTitle(wikiStructure: WikiStructureModel, pageId: string): string {
  if (!wikiStructure.sections) return "General";

  for (const section of wikiStructure.sections) {
    if (section.pages.includes(pageId)) {
      return section.title;
    }
  }

  return "General";
}
