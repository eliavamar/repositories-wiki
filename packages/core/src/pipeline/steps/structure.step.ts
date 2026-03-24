import { logger } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import { GenerateStructureStep } from "./generate-structure.step";
import { UpdateStructureStep } from "./update-structure.step";

/**
 * Conditional structure step that delegates to either:
 * - GenerateStructureStep for "new" flow (creates wiki from scratch)
 * - UpdateStructureStep for "update" flow (updates existing wiki based on changes)
 */
export class StructureStep implements PipelineStep {
  readonly name = "Structure";

  private generateStep = new GenerateStructureStep();
  private updateStep = new UpdateStructureStep();

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.flowType) {
      throw new Error("flowType is required - DetectFlowStep must run first");
    }

    if (context.flowType === "update") {
      logger.info("Using update flow for wiki structure");
      return this.updateStep.execute(context);
    }

    logger.info("Using new flow for wiki structure");
    return this.generateStep.execute(context);
  }
}