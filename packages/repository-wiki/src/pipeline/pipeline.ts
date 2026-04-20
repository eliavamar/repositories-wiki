import { logger, gitService } from "@repositories-wiki/common";
import type { WikiGeneratorConfig } from "@repositories-wiki/common";
import { createAgent } from "../coding-agent";
import type { ModelProvider } from "../coding-agent";
import type { PipelineContext, PipelineStep, PipelineResult } from "./types";
import {
  SetupRepositoryStep,
  InferFilesStep,
  GenerateStructureStep,
  GeneratePagesStep,
  WriteToLocalStep,
  PushToGitHubStep,
} from "./steps";

export class WikiGeneratorPipeline {
  private steps: PipelineStep[] = [];


  static create(): WikiGeneratorPipeline {
    return new WikiGeneratorPipeline()
      .addStep(new SetupRepositoryStep())
      .addStep(new InferFilesStep())
      .addStep(new GenerateStructureStep())
      .addStep(new GeneratePagesStep())
      .addStep(new WriteToLocalStep())
      .addStep(new PushToGitHubStep());
  }

  addStep(step: PipelineStep): this {
    this.steps.push(step);
    return this;
  }

  async execute(config: WikiGeneratorConfig): Promise<PipelineResult> {

    logger.info("Starting wiki generation pipeline");
    logger.info(`Repository: ${config.repositoryUrl || config.localRepoPath}`);

    // Collect unique model IDs from config
    const models = [...new Set([config.llmPlaner.modelID, config.llmExploration.modelID, config.llmBuilder.modelID])];
    const provider = (config.providerConfig.providerID) as ModelProvider;

    logger.info(`Initializing agent with provider "${provider}" and models: ${models.join(", ")}`);
    const agent = await createAgent(models, provider);
    let context: PipelineContext = { config, agent };

    try {
      for (const step of this.steps) {
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
      logger.info("━━━ Pipeline completed successfully ━━━");
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
