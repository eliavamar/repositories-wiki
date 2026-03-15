import { gitService, logger } from "@repositories-wiki/core";
import type { PipelineContext, PipelineStep } from "../types";

export class DetectFlowStep implements PipelineStep {
  readonly name = "Detect Flow";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath) {
      throw new Error("repoPath is required for DetectFlowStep");
    }

    const { wikiBranch } = context.config;
    const branchExists = await gitService.branchExists(context.repoPath, wikiBranch);

    const flowType = branchExists ? "update" : "new";
    logger.info(`Wiki branch "${wikiBranch}" ${branchExists ? "exists" : "does not exist"}`);
    logger.info(`Flow type: ${flowType}`);

    return {
      ...context,
      flowType,
    };
  }
}