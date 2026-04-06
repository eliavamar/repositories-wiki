import { logger } from "@repositories-wiki/common";
import type { WikiStructureModel, WikiStructureOutput, InferredFilesOutput } from "@repositories-wiki/common";
import { WikiStructureOutputSchema, InferredFilesOutputSchema } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import {
  generateWikiStructurePrompt,
  inferImportantFilesPrompt,
  structureTimeoutRetryPrompt,
  inferFilesTimeoutRetryPrompt,
} from "../prompts";
import { walkRepo, formatFileTree, selectCoreFiles, loadInferredFiles } from "../../utils/files";
import { createTokenizer } from "../../utils/tokenizer";
import { retryWithRecovery } from "../../utils/retry";

export class GenerateStructureStep implements PipelineStep {
  readonly name = "Generate Structure";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath || !context.repoName || !context.commitId) {
      throw new Error("repoPath, repoName, and commitId are required");
    }
    if (!context.agent) {
      throw new Error("agent is required");
    }

    const entries = walkRepo(context.repoPath);
    const fileTree = formatFileTree(entries);
    logger.debug(`Generated file tree with structure`);

    const tokenizer = await createTokenizer();
    const coreFiles = await selectCoreFiles(context.repoPath, entries, tokenizer);

    const enrichedFiles = await this.inferAndLoadImportantFiles(
      context.agent,
      context.repoPath,
      context.config.llm,
      context.config.llmExploration,
      fileTree,
      coreFiles,
      tokenizer,
    );

    const wikiStructure = await this.generateWikiStructure(
      context.agent,
      context.repoPath,
      context.repoName,
      context.commitId,
      context.config.llm,
      fileTree,
      enrichedFiles,
    );
    logger.info(`Generated structure with ${wikiStructure.pages.length} pages`);

    return {
      ...context,
      wikiStructure,
    };
  }

  /**
   * Generate wiki structure using the agent with structured output.
   * Retry logic handles timeout errors; the framework handles schema validation.
   */
  private async generateWikiStructure(
    agent: NonNullable<PipelineContext['agent']>,
    repoPath: string,
    repoName: string,
    commitId: string,
    llmConfig: PipelineContext['config']['llm'],
    fileTree: string,
    enrichedFiles: Map<string, string>,
  ): Promise<WikiStructureModel> {
    const originalPrompt = generateWikiStructurePrompt(repoName, commitId, fileTree, enrichedFiles);

    const { parsed: structureOutput } = await retryWithRecovery<WikiStructureOutput>({
      run: (prompt) =>
        agent.generate<WikiStructureOutput>({
          model: llmConfig.modelID,
          prompt,
          projectPath: repoPath,
          structuredOutput: WikiStructureOutputSchema,
        }),
      originalPrompt,
      timeoutRetryPrompt: structureTimeoutRetryPrompt(),
      label: "structure generation",
    });

    // Convert structured output to WikiStructureModel (add empty content to pages, compute rootSections)
    return this.toWikiStructureModel(structureOutput);
  }

  /**
   * Make a fast, cheap LLM call to infer important files from the file tree.
   * Uses structured output; retry logic handles timeout errors.
   */
  private async inferAndLoadImportantFiles(
    agent: NonNullable<PipelineContext['agent']>,
    repoPath: string,
    llmConfig: PipelineContext['config']['llm'],
    llmExplorationConfig: PipelineContext['config']['llmExploration'],
    fileTree: string,
    coreFiles: Map<string, string>,
    tokenizer: Awaited<ReturnType<typeof createTokenizer>>,
  ): Promise<Map<string, string>> {
    try {
      const inferPrompt = inferImportantFilesPrompt(fileTree);
      logger.info("Inferring important files from file tree (fast LLM call)...");

      const modelId = (llmExplorationConfig || llmConfig).modelID;

      const { parsed: inferredResult } = await retryWithRecovery<InferredFilesOutput>({
        run: (prompt) =>
          agent.generate<InferredFilesOutput>({
            model: modelId,
            prompt,
            projectPath: repoPath,
            structuredOutput: InferredFilesOutputSchema,
          }),
        originalPrompt: inferPrompt,
        timeoutRetryPrompt: inferFilesTimeoutRetryPrompt(),
        label: "file inference",
      });

      const inferredPaths = inferredResult.files;

      if (inferredPaths.length === 0) {
        logger.warn("No files inferred, using tier-selected files only");
        return coreFiles;
      }

      logger.info(`LLM inferred ${inferredPaths.length} important files, loading into context...`);
      return await loadInferredFiles(repoPath, inferredPaths, tokenizer, coreFiles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to infer important files, using tier-selected files only: ${errorMessage}`);
      return coreFiles;
    }
  }

  /**
   * Convert the structured output (which has no content on pages) to a full WikiStructureModel.
   */
  private toWikiStructureModel(output: WikiStructureOutput): WikiStructureModel {
    const sections = output.sections ?? [];

    // All top-level sections are root sections (structured output is flat)
    const rootSections = sections.map((s: { id: string }) => s.id);

    return {
      commitId: output.commitId,
      title: output.title,
      description: output.description,
      pages: output.pages.map((page: WikiStructureOutput["pages"][number]) => ({
        id: page.id,
        title: page.title,
        description: page.description,
        content: "",
        relevantFiles: page.relevantFiles,
        relatedPages: page.relatedPages,
      })),
      sections: sections.length > 0 ? sections : undefined,
      rootSections: rootSections.length > 0 ? rootSections : undefined,
    };
  }
}
