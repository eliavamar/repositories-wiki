import { logger, type InferredFilesOutput } from "@repositories-wiki/common";
import { InferredFilesOutputSchema } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import { inferImportantFilesPrompt, inferFilesTimeoutRetryPrompt } from "../prompts";
import { walkRepo, formatFileTree, readReadme, loadInferredFiles } from "../../utils/files";
import { createTokenizer } from "../../utils/tokenizer";
import { retryWithRecovery } from "../../utils/retry";
import { TreeSitterManager } from "../../tree-sitter/tree-sitter-manager";

export class InferFilesStep implements PipelineStep {
  readonly name = "Infer Files";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath) {
      throw new Error("repoPath is required");
    }
    if (!context.agent) {
      throw new Error("agent is required");
    }

    const entries = walkRepo(context.repoPath);
    const fileTree = formatFileTree(entries);
    logger.debug(`Generated file tree with structure`);

    const readmeContent = readReadme(context.repoPath);
    const tokenizer = await createTokenizer();
    const treeSitter = new TreeSitterManager();

    const enrichedFiles = await this.inferAndLoadImportantFiles(
      context.agent,
      context.repoPath,
      context.config.llmExploration,
      fileTree,
      readmeContent,
      tokenizer,
      treeSitter,
    );

    return {
      ...context,
      enrichedFiles,
    };
  }

  /**
   * Make a fast, cheap LLM call to infer important files from the file tree and README,
   * then load and convert them to signatures.
   */
  private async inferAndLoadImportantFiles(
    agent: PipelineContext['agent'],
    repoPath: string,
    llmExplorationConfig: PipelineContext['config']['llmExploration'],
    fileTree: string,
    readmeContent: string | null,
    tokenizer: Awaited<ReturnType<typeof createTokenizer>>,
    treeSitter: TreeSitterManager,
  ): Promise<Map<string, string>> {
    try {
      const inferPrompt = inferImportantFilesPrompt(fileTree, readmeContent);
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
        logger.warn("No files inferred by LLM");
        return new Map();
      }

      logger.info(`LLM inferred ${inferredPaths.length} important files, loading into context...`);
      return await loadInferredFiles(repoPath, inferredPaths, tokenizer, treeSitter);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to infer important files: ${errorMessage}`);
      return new Map();
    }
  }
}
