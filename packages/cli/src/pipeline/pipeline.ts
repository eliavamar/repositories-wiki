import { logger, gitService } from "@repositories-wiki/core";
import type { WikiGeneratorConfig } from "@repositories-wiki/core";
import { CodingAgent } from "../coding-agent/agent";
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
    logger.info(`Repository: ${config.repositoryUrl}`);

    context.agent = new CodingAgent();
    await context.agent.startServer(config.llm);

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
      if (!context.wikiOutputPath) {
        throw new Error("Pipeline completed but wikiOutputPath is missing");
      }
      if (!context.commitId) {
        throw new Error("Pipeline completed but commitId is missing");
      }

      logger.info("━━━ Pipeline completed successfully ━━━");

      return {
        wikiStructure: context.wikiStructure,
        wikiOutputPath: context.wikiOutputPath,
        commitId: context.commitId,
      };
    } finally {
      if (context.agent) {
        logger.info("Closing agent server...");
        context.agent.closeServer();
      }

      if (context.repoPath) {
        logger.info("Cleaning up temporary files...");
        await gitService.cleanup(context.repoPath);
      }
    }
  }
}