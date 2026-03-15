import { logger, WikiGeneratorConfigSchema, type WikiGeneratorConfig } from "@repositories-wiki/core";
import {
  WikiGeneratorPipeline,
  CloneRepositoryStep,
  DetectFlowStep,
  GenerateStructureStep,
  GeneratePagesStep,
  WriteFilesStep,
  PushToGitHubStep,
  type PipelineResult,
} from "./pipeline";

export async function generateWiki(config: WikiGeneratorConfig): Promise<PipelineResult> {
  // Parse config through Zod to apply defaults (e.g., wikiBranch defaults to "repository-wiki-memory")
  const validatedConfig = WikiGeneratorConfigSchema.parse(config);
  
  const pipeline = new WikiGeneratorPipeline()
    .addStep(new CloneRepositoryStep())
    .addStep(new DetectFlowStep())
    .addStep(new GenerateStructureStep())
    .addStep(new GeneratePagesStep())
    .addStep(new WriteFilesStep())
    .addStep(new PushToGitHubStep());

  return pipeline.execute(validatedConfig);
}

export async function main(config: WikiGeneratorConfig): Promise<void> {
  try {
    const result = await generateWiki(config);

    logger.info("\n=== Wiki Generation Complete ===\n");
    logger.info(`Title: ${result.wikiStructure.title}`);
    logger.info(`Description: ${result.wikiStructure.description}`);
    logger.info(`Total Pages: ${result.wikiStructure.pages.length}`);
    logger.info(`Commit: ${result.commitId}`);
    logger.info("\nPages:");
    for (const page of result.wikiStructure.pages) {
      logger.info(`  - ${page.title} (${page.importance})`);
    }
  } catch (error) {
    logger.error(
      `Wiki generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

