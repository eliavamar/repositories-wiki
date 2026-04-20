import { logger, WikiStructureOutputSchema } from "@repositories-wiki/common";
import type { WikiStructureModel, WikiStructureOutput } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import { generateWikiStructurePrompt, structureTimeoutRetryPrompt } from "../prompts";
import { walkRepo, formatFileTree } from "../../utils/files";
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
    if (!context.enrichedFiles) {
      throw new Error("enrichedFiles is required — ensure InferFilesStep runs before this step");
    }

    const entries = walkRepo(context.repoPath);
    const fileTree = formatFileTree(entries);
    logger.debug(`Generated file tree with structure`);

    const wikiStructure = await this.generateWikiStructure(
      context.agent,
      context.repoName,
      context.commitId,
      context.config.llmPlaner,
      fileTree,
      context.enrichedFiles,
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
    llmConfig: PipelineContext['config']['llmPlaner'],
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
}
