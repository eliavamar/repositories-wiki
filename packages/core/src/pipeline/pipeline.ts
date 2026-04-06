import { logger, gitService } from "@repositories-wiki/common";
import type { WikiGeneratorConfig } from "@repositories-wiki/common";
import { createAgent } from "../coding-agent-v2";
import type { ModelProvider } from "../coding-agent-v2";
import type { PipelineContext, PipelineStep, PipelineResult } from "./types";

export class WikiGeneratorPipeline {
  private steps: PipelineStep[] = [];

  addStep(step: PipelineStep): this {
    this.steps.push(step);
    return this;
  }

  async execute(config: WikiGeneratorConfig): Promise<PipelineResult> {
    let context: PipelineContext = { config };

    logger.info("Starting wiki generation pipeline");
    logger.info(`Repository: ${config.repositoryUrl || config.localRepoPath}`);

    // Collect unique model IDs from config
    const models = [...new Set([config.llm.modelID, config.llmExploration.modelID])];
    const provider = (config.providerConfig?.provider ?? config.llm.providerID) as ModelProvider;

    logger.info(`Initializing agent with provider "${provider}" and models: ${models.join(", ")}`);
    context.agent = await createAgent(models, provider);

    try {
      for (const step of this.steps) {
        if (context.skipPipeline) {
          logger.info(`━━━ Skipping step: ${step.name} (${context.skipReason}) ━━━`);
          continue;
        }

        logger.info(`━━━ Executing step: ${step.name} ━━━`);
        const startTime = Date.now();

        context = await step.execute(context);

        const duration = Date.now() - startTime;
        logger.info(`✓ Step "${step.name}" completed in ${duration}ms`);
      }

      if (!context.wikiStructure) {
        throw new Error("Pipeline completed but wikiStructure is missing");
      }
      if (!context.commitId) {
        throw new Error("Pipeline completed but commitId is missing");
      }

      if (context.skipPipeline) {
        logger.info(`━━━ Pipeline skipped: ${context.skipReason} ━━━`);
      } else {
        logger.info("━━━ Pipeline completed successfully ━━━");
      }

      return {
        wikiStructure: context.wikiStructure,
        commitId: context.commitId,
      };
    } finally {
      await this.cleanup(context);
    }
  }

  private async cleanup(context: PipelineContext): Promise<void> {
    if (context.repoPath) {
      logger.info("Cleaning up temporary files...");
      await gitService.cleanup(context.repoPath);
    }
  }
}
