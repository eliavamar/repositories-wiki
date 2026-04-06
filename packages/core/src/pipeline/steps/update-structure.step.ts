import fs from "fs";
import { logger } from "@repositories-wiki/common";
import type { WikiStructureModel, WikiStructureUpdateOutput, WikiPage, PageStatus } from "@repositories-wiki/common";
import { WikiStructureUpdateOutputSchema } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import { generateUpdateWikiStructurePrompt, structureTimeoutRetryPrompt } from "../prompts";
import { walkRepo, formatFileTree } from "../../utils/files";
import { retryWithRecovery } from "../../utils/retry";

export class UpdateStructureStep implements PipelineStep {
  readonly name = "Update Structure";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath || !context.repoName || !context.commitId) {
      throw new Error("repoPath, repoName, and commitId are required");
    }
    if (!context.agent) {
      throw new Error("agent is required");
    }
    if (!context.previousWikiStructure) {
      throw new Error("previousWikiStructure is required for UpdateStructureStep");
    }
    if (!context.changedFiles) {
      throw new Error("changedFiles is required for UpdateStructureStep");
    }

    // Check if there are no changes
    if (context.changedFiles.files.length === 0) {
      logger.info("No changes detected, keeping existing wiki structure");
      return {
        ...context,
        wikiStructure: {
          ...context.previousWikiStructure,
          commitId: context.commitId, // Update to new commit ID
        },
      };
    }

    const entries = walkRepo(context.repoPath);
    const fileTree = formatFileTree(entries);
    logger.debug(`Generated file tree with structure`);

    const originalPrompt = generateUpdateWikiStructurePrompt(
      context.repoName,
      context.commitId,
      fileTree,
      context.previousWikiStructure,
      context.changedFiles,
      context.changedFilesDirPath
    );

    const { parsed: updateOutput } = await retryWithRecovery<WikiStructureUpdateOutput>({
      run: (prompt) =>
        context.agent!.generate<WikiStructureUpdateOutput>({
          model: context.config.llm.modelID,
          prompt,
          projectPath: context.repoPath,
          structuredOutput: WikiStructureUpdateOutputSchema,
        }),
      originalPrompt,
      timeoutRetryPrompt: structureTimeoutRetryPrompt(),
      label: "update structure generation",
    });

    // Merge the structured output with the previous structure to preserve content
    const wikiStructure = this.mergeWithPreviousStructure(
      updateOutput,
      context.previousWikiStructure,
    );

    logger.info(`Updated structure with ${wikiStructure.pages.length} pages`);

    // Log page status breakdown
    const newPages = wikiStructure.pages.filter(p => p.status === "NEW").length;
    const updatePages = wikiStructure.pages.filter(p => p.status === "UPDATE").length;
    const unchangedPages = wikiStructure.pages.filter(p => !p.status).length;
    logger.info(`Pages: ${newPages} new, ${updatePages} to update, ${unchangedPages} unchanged`);

    // Clean up the changedFilesDirPath if it exists
    if (context.changedFilesDirPath && fs.existsSync(context.changedFilesDirPath)) {
      fs.rmSync(context.changedFilesDirPath, { recursive: true, force: true });
      logger.debug(`Cleaned up diff directory: ${context.changedFilesDirPath}`);
    }

    return {
      ...context,
      wikiStructure,
      changedFilesDirPath: undefined,
    };
  }

  /**
   * Merge the update structured output with the previous wiki structure.
   * - Pages with status "NEW" or "UPDATE" get empty content (to be generated later)
   * - Pages without status preserve their content from the previous structure
   */
  private mergeWithPreviousStructure(
    output: WikiStructureUpdateOutput,
    previousStructure: WikiStructureModel,
  ): WikiStructureModel {
    // Create a map of previous pages for quick lookup
    const previousPagesMap = new Map<string, WikiPage>();
    for (const page of previousStructure.pages) {
      previousPagesMap.set(page.id, page);
    }

    const pages: WikiPage[] = output.pages.map((page) => {
      const status = page.status as PageStatus | undefined;
      let content = "";

      if (!status) {
        // No status means keep existing content
        const previousPage = previousPagesMap.get(page.id);
        if (previousPage) {
          content = previousPage.content;
        }
      }
      // If status is "NEW" or "UPDATE", content will be generated later (leave empty)

      return {
        id: page.id,
        title: page.title,
        description: page.description,
        content,
        relevantFiles: page.relevantFiles,
        relatedPages: page.relatedPages,
        status,
      };
    });

    const sections = output.sections ?? [];
    const rootSections = sections.map((s) => s.id);

    return {
      commitId: output.commitId,
      title: output.title,
      description: output.description,
      pages,
      sections: sections.length > 0 ? sections : undefined,
      rootSections: rootSections.length > 0 ? rootSections : undefined,
    };
  }
}
