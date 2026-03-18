import pLimit from "p-limit";
import pRetry from "p-retry";
import { logger } from "@repositories-wiki/core";
import type { WikiStructureModel, RelevantFile, WikiPage } from "@repositories-wiki/core";
import type { PipelineContext, PipelineStep } from "../types";
import { generatePageContentPrompt } from "../prompts";
import { parsePageContent } from "../../parsers";

// Concurrency limit for parallel page generation
// Limiting to 5 concurrent requests to avoid API rate limiting
const CONCURRENCY_LIMIT = 5;

// Retry configuration for failed page generation
const MAX_RETRIES = 5;

/** Result of a single page generation attempt */
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

    // Create a concurrency limiter to avoid API rate limiting
    const limit = pLimit(CONCURRENCY_LIMIT);
    let completedCount = 0;
    const totalCount = pagesToGenerate.length;
    const failedPages: string[] = [];

    // Create tasks that return PageGenerationResult
    const pageGenerationTasks = pagesToGenerate.map((page) =>
      limit(async (): Promise<PageGenerationResult> => {
        const statusLabel = page.status ? ` [${page.status}]` : "Page without content";
        logger.info(`Generating content for: ${page.title}${statusLabel}`);

        try {
          // Use p-retry for automatic retries with exponential backoff
          const result = await pRetry(
            async () => {
              const sectionTitle = findSectionTitle(wikiStructure, page.id);
              const prompt = generatePageContentPrompt(
                page,
                sectionTitle,
                repoName,
                wikiStructure.description
              );

              const response = await agent.run({
                repoPath,
                prompt,
                title: `Generate: ${page.title}`,
              });

              return parsePageContent(response);
            },
            {
              retries: MAX_RETRIES,
              onFailedAttempt: (error) => {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.warn(
                  `⚠ Failed: ${page.title} (attempt ${error.attemptNumber}/${MAX_RETRIES + 1}) - Retrying...`,
                  { error: errorMessage }
                );
              },
            }
          );

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

/**
 * Calculate importance for each file based on how many times it's mentioned in the content.
 *
 * Uses the maximum mention count as the baseline (not sum) because:
 * - Guarantees the most relevant file is always marked as "high" importance
 * - Provides meaningful relative comparison ("how important vs the main file?")
 * - Handles edge cases where one file dominates (with sum, all others would be "low")
 *
 * Importance levels:
 * - low: < 30% of max mentions
 * - medium: 30% <= x < 65% of max mentions
 * - high: >= 65% of max mentions
 */
function calculateFileImportance(
  files: { filePath: string }[],
  content: string
): RelevantFile[] {
  if (files.length === 0) return [];

  // Count mentions for each file
  const mentionCounts = files.map((file) => {
    const filePath = file.filePath;
    const fileName = filePath.split("/").pop() || filePath;

    // Count occurrences of the file path or file name in the content
    const pathRegex = new RegExp(escapeRegex(filePath), "gi");
    const nameRegex = new RegExp(escapeRegex(fileName), "gi");

    const pathMatches = (content.match(pathRegex) || []).length;
    const nameMatches = (content.match(nameRegex) || []).length;

    // Use the higher count (path or name mentions)
    return Math.max(pathMatches, nameMatches);
  });

  // Find the maximum mention count
  const maxCount = Math.max(...mentionCounts, 1); // Ensure at least 1 to avoid division by zero

  // Calculate importance for each file
  return files.map((file, index) => {
    const count = mentionCounts[index] ?? 0;
    const percentage = (count / maxCount) * 100;

    let importance: "low" | "medium" | "high";
    if (percentage >= 65) {
      importance = "high";
    } else if (percentage >= 30) {
      importance = "medium";
    } else {
      importance = "low";
    }

    return {
      filePath: file.filePath,
      importance,
    };
  });
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
