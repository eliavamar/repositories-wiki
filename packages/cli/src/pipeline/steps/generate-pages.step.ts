import { logger } from "@repositories-wiki/core";
import type { WikiStructureModel, RelevantFile, WikiPage } from "@repositories-wiki/core";
import type { PipelineContext, PipelineStep } from "../types";
import { generatePageContentPrompt } from "../prompts";
import { parsePageContent } from "../../parsers";

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

    logger.info(`Generating content for ${pagesToGenerate.length} pages in parallel...`);

    const pageGenerationTasks = pagesToGenerate.map(async (page) => {
      const statusLabel = page.status ? ` [${page.status}]` : "Page without content";
      logger.info(`Generating content for: ${page.title}${statusLabel}`);

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

      const parsed = parsePageContent(response);

      page.content = parsed.content;
      if (parsed.relevantFiles.length > 0) {
        page.relevantFiles = calculateFileImportance(parsed.relevantFiles, parsed.content);
      }

      logger.info(`✓ Generated: ${page.title} (${parsed.relevantFiles.length} files)`);
    });

    await Promise.all(pageGenerationTasks);

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
