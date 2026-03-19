import type { WikiGeneratorConfig, WikiStructureModel, ChangedFilesResult } from "@repositories-wiki/core";
import type { CodingAgent } from "../coding-agent/agent";

/**
 * Shared context passed between pipeline steps.
 * Each step can read from and write to this context.
 */
export interface PipelineContext {
  // Input configuration
  config: WikiGeneratorConfig;

  // Repository info (set by CloneRepositoryStep)
  repoPath?: string;
  repoName?: string;
  commitId?: string;

  // Flow detection (set by DetectFlowStep)
  flowType?: "new" | "update";
  previousCommitId?: string; // Commit ID from existing wiki.json
  previousWikiStructure?: WikiStructureModel; // Loaded from wiki branch
  changedFiles?: ChangedFilesResult; // Changed files between commits
  changedFilesDirPath?: string; // Path to directory with diff files

  // Pipeline control
  skipPipeline?: boolean; // If true, skip remaining steps
  skipReason?: string; // Reason for skipping

  // Wiki generation (set by GenerateStructureStep & GeneratePagesStep)
  wikiStructure?: WikiStructureModel;

  // Session tracking (set by StructureStep for page generation inheritance)
  structureSessionId?: string;

  // Agent (managed by pipeline)
  agent?: CodingAgent;
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
