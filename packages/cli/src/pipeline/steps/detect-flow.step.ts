import type { PipelineContext, PipelineStep } from "../types";

export class DetectFlowStep implements PipelineStep {
  readonly name = "Detect Flow";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath) {
      throw new Error("repoPath is required for DetectFlowStep");
    }
    return { ...context, flowType: "new" };
  }
}