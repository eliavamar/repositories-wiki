import { logger, WikiGeneratorConfigSchema, type WikiGeneratorConfig } from "@repositories-wiki/common";
import {
  WikiGeneratorPipeline,
  SetupRepositoryStep,
  InferFilesStep,
  GeneratePagesStep,
  PushToGitHubStep,
  WriteToLocalStep,
  type PipelineResult,
  GenerateStructureStep,
} from "./pipeline";

export async function generateWiki(config: WikiGeneratorConfig): Promise<PipelineResult> {
  const validatedConfig = WikiGeneratorConfigSchema.parse(config);

  const pipeline = new WikiGeneratorPipeline()
    .addStep(new SetupRepositoryStep())
    .addStep(new InferFilesStep())
    .addStep(new GenerateStructureStep())
    .addStep(new GeneratePagesStep())
    .addStep(new WriteToLocalStep())
    .addStep(new PushToGitHubStep());

  return pipeline.execute(validatedConfig);
}

export async function main(config: WikiGeneratorConfig): Promise<void> {
  try {
    const result = await generateWiki(config);

    logger.info("\n=== Wiki Generation Complete ===\n");
    logger.info(`Title: ${result.wikiStructure.title}`);
    logger.info(`Description: ${result.wikiStructure.description}`);
    const allPages = result.wikiStructure.sections.flatMap((s) => s.pages);
    logger.info(`Total Pages: ${allPages.length}`);
    logger.info(`Commit: ${result.commitId}`);
    logger.info("\nPages:");
    for (const page of allPages) {
      logger.info(`  - ${page.title}`);
    }
  } catch (error) {
    logger.error(
      `Wiki generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

export async function run(): Promise<void> {
  // const config: WikiGeneratorConfig = {
  //   localRepoPath: "/Users/i563567/projects/eliavamar/opencode",
  //   providerConfig: {
  //     providerID: "anthropic",
  //   },
  //   llmPlaner: {
  //     modelID: "claude-sonnet-4-6",
  //   },
  //   llmExploration: {
  //     modelID: "claude-haiku-4-5-20251001",
  //   },
  //   llmBuilder: {
  //     modelID: "claude-haiku-4-5-20251001",
  //   },
  // };
    const config: WikiGeneratorConfig = {
    localRepoPath: "/Users/i563567/projects/eliavamar/opencode",
    providerConfig:{
      providerID: "sap-ai-core",
    },
    llmPlaner: {
      modelID: "anthropic--claude-4.6-opus",
    },
    llmExploration: {
      modelID: "anthropic--claude-4.5-haiku",
    },
    llmBuilder: {
      modelID: "anthropic--claude-4.5-sonnet",
    },
  };
  await main(config);
}

run().then(() => {
  process.exit(0);
}).catch(() => {
  logger.error("Wiki generation failed");
  process.exit(1);
});