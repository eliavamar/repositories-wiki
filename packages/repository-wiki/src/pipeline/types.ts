import type { WikiGeneratorConfig, WikiStructureModel } from "@repositories-wiki/common";
import type { Agent } from "../coding-agent";

/**
 * Shared context passed between pipeline steps.
 * Each step can read from and write to this context.
 */
export interface PipelineContext {
  // Input configuration
  config: WikiGeneratorConfig;

  // Repository info (set by SetupRepositoryStep)
  repoPath?: string;
  repoName?: string;
  commitId?: string;

  // Wiki generation (set by GenerateStructureStep & GeneratePagesStep)
  wikiStructure?: WikiStructureModel;

  // Agent (managed by pipeline)
  agent: Agent;
}

/**
 * Interface for pipeline steps.
 * Each step receives a context and returns an updated context.
 */
export interface PipelineStep {
  /** Human-readable name for logging */
  readonly name: string;

  /**
   * Execute the step.
   * @param context - The current pipeline context
   * @returns Updated context with any new data added by this step
   */
  execute(context: PipelineContext): Promise<PipelineContext>;
}

/**
 * Result returned by the pipeline after all steps complete.
 */
export interface PipelineResult {
  /** The generated wiki structure with all page content */
  wikiStructure: WikiStructureModel;

  /** The commit ID of the source repository */
  commitId: string;
}
