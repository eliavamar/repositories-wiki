import { logger, WikiStructureOutputSchema } from "@repositories-wiki/common";
import type { WikiStructureModel, WikiStructureOutput, InferredFilesOutput } from "@repositories-wiki/common";
import { InferredFilesOutputSchema } from "@repositories-wiki/common";
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
      context.config.llmExploration,
      fileTree,
      coreFiles,
      tokenizer,
    );

    const wikiStructure = await this.generateWikiStructure(
      context.agent,
      context.repoName,
      context.commitId,
      context.config.llm,
      fileTree,
      enrichedFiles,
    );
    return {
      ...context,
      wikiStructure,
    };
  }


  private async generateWikiStructure(
    agent: NonNullable<PipelineContext['agent']>,
    repoName: string,
    commitId: string,
    llmConfig: PipelineContext['config']['llm'],
    fileTree: string,
    enrichedFiles: Map<string, string>,
  ): Promise<WikiStructureModel> {
    const prompt = generateWikiStructurePrompt(repoName, commitId, fileTree, enrichedFiles);

    const { parsed: structureOutput } = await retryWithRecovery<WikiStructureOutput>({
      run: (prompt) =>
        agent.generate<WikiStructureOutput>({
          model: llmConfig.modelID,
          prompt,
          structuredOutput: WikiStructureOutputSchema,
        }),
      originalPrompt: prompt,
      timeoutRetryPrompt: structureTimeoutRetryPrompt(),
      label: "structure generation",
    });

    const wikiStructure: WikiStructureModel = {
      ...structureOutput,
      sections: structureOutput.sections.map(section => ({
        ...section,
        pages: section.pages.map(page => ({
          ...page,
          relevantFiles: page.relevantFiles.map(filePath => ({ filePath })),
        })),
      })),
    };

    return wikiStructure;
  }

  /**
   * Make a fast, cheap LLM call to infer important files from the file tree.
   * Uses structured output; retry logic handles timeout errors.
   */
  private async inferAndLoadImportantFiles(
    agent: PipelineContext['agent'],
    repoPath: string,
    llmExplorationConfig: PipelineContext['config']['llmExploration'],
    fileTree: string,
    coreFiles: Map<string, string>,
    tokenizer: Awaited<ReturnType<typeof createTokenizer>>,
  ): Promise<Map<string, string>> {
    try {
      const inferPrompt = inferImportantFilesPrompt(fileTree);
      logger.info("Inferring important files from file tree (fast LLM call)...");

      const modelId = llmExplorationConfig.modelID;

      const { parsed: inferredResult } = await retryWithRecovery<InferredFilesOutput>({
        run: (prompt) =>
          agent.generate<InferredFilesOutput>({
            model: modelId,
            prompt,
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

}
