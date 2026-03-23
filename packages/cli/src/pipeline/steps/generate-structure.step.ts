import { logger } from "@repositories-wiki/core";
import type { WikiStructureModel } from "@repositories-wiki/core";
import type { PipelineContext, PipelineStep } from "../types";
import { generateWikiStructurePrompt, inferImportantFilesPrompt } from "../prompts";
import { parseWikiStructure, parseInferredFiles } from "../../parsers";
import { walkRepo, formatFileTree, selectCoreFiles, loadInferredFiles } from "../../utils/files";
import { createTokenizer } from "../../utils/tokenizer";

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
   * Generate wiki structure using the agent
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
    const prompt = generateWikiStructurePrompt(repoName, commitId, fileTree, enrichedFiles);

    const { result, sessionId } = await agent.run({
      repoPath,
      prompt,
      title: "Generate Wiki Structure",
      llmConfig,
    });

    const wikiStructure = parseWikiStructure(result);
    return { wikiStructure, sessionId };
  }

  /**
   * Make a fast, cheap LLM call to infer important files from the file tree
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
      const { result: inferResult } = await agent.run({
        repoPath,
        prompt: inferPrompt,
        title: "Infer Important Files",
        llmConfig: llmExplorationConfig || llmConfig,
      });

      const inferredPaths = parseInferredFiles(inferResult);
      if (inferredPaths.length === 0) {
        logger.warn("No files inferred, using tier-selected files only");
        return coreFiles;
      }

      logger.info(`LLM inferred ${inferredPaths.length} important files, loading into context...`);
      return await loadInferredFiles(
        repoPath,
        inferredPaths,
        tokenizer,
        coreFiles,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to infer important files, using tier-selected files only: ${errorMessage}`);
      return coreFiles;
    }
  }
}
