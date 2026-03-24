import { logger } from "@repositories-wiki/common";
import type { WikiStructureModel } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import {
  generateWikiStructurePrompt,
  inferImportantFilesPrompt,
  structureTimeoutRetryPrompt,
  structureParsingRetryPrompt,
  inferFilesTimeoutRetryPrompt,
  inferFilesParsingRetryPrompt,
} from "../prompts";
import { parseWikiStructure, parseInferredFiles } from "../../parsers";
import { walkRepo, formatFileTree, selectCoreFiles, loadInferredFiles } from "../../utils/files";
import { createTokenizer } from "../../utils/tokenizer";
import { retryWithSessionRecovery } from "../../utils/retry";

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

    const { wikiStructure, sessionId } = await this.generateWikiStructure(
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
      structureSessionId: sessionId,
    };
  }

  /**
   * Generate wiki structure using the agent with retry logic:
   * - Timeout/parsing errors: retry with same session + corrective prompt
   * - General runtime errors: retry with a fresh session
   */
  private async generateWikiStructure(
    agent: NonNullable<PipelineContext['agent']>,
    repoPath: string,
    repoName: string,
    commitId: string,
    llmConfig: PipelineContext['config']['llm'],
    fileTree: string,
    enrichedFiles: Map<string, string>,
  ): Promise<{ wikiStructure: WikiStructureModel; sessionId: string }> {
    const originalPrompt = generateWikiStructurePrompt(repoName, commitId, fileTree, enrichedFiles);

    const { parsed: wikiStructure, sessionId } = await retryWithSessionRecovery({
      run: (prompt, sessionId) =>
        agent.run({ repoPath, prompt, title: "Generate Wiki Structure", llmConfig, sessionId }),
      originalPrompt,
      timeoutRetryPrompt: structureTimeoutRetryPrompt(),
      parsingRetryPrompt: structureParsingRetryPrompt(),
      parse: parseWikiStructure,
      label: "structure generation",
    });

    return { wikiStructure, sessionId };
  }

  /**
   * Make a fast, cheap LLM call to infer important files from the file tree.
   * Includes retry logic for timeout errors with session continuation.
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

      const { parsed: inferredPaths } = await retryWithSessionRecovery({
        run: (prompt, sessionId) =>
          agent.run({
            repoPath,
            prompt,
            title: "Infer Important Files",
            llmConfig: llmExplorationConfig || llmConfig,
            sessionId,
          }),
        originalPrompt: inferPrompt,
        timeoutRetryPrompt: inferFilesTimeoutRetryPrompt(),
        parsingRetryPrompt: inferFilesParsingRetryPrompt(),
        parse: parseInferredFiles,
        label: "file inference",
      });

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
