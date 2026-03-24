import { logger, WikiGeneratorConfigSchema, type WikiGeneratorConfig } from "@repositories-wiki/core";
import {
  WikiGeneratorPipeline,
  CloneRepositoryStep,
  DetectFlowStep,
  StructureStep,
  GeneratePagesStep,
  PushToGitHubStep,
  type PipelineResult,
} from "./pipeline";

export async function generateWiki(config: WikiGeneratorConfig): Promise<PipelineResult> {
  const validatedConfig = WikiGeneratorConfigSchema.parse(config);
  
  const pipeline = new WikiGeneratorPipeline()
    .addStep(new CloneRepositoryStep())
    .addStep(new DetectFlowStep())
    .addStep(new StructureStep()) 
    .addStep(new GeneratePagesStep())
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
  //   repositoryUrl: "https://github.com/eliavamar/mcp-of-mcps",
  //   githubToken: process.env.GITHUB_TOKEN,
  //   wikiBranch: "repository-wiki-memory",
  //   commitId: "21c02bbc0b7f20f110db31feab8f9aa9e1a87500",
  //   llm: {
  //     provider: "anthropic",
  //     model: "claude-sonnet-4-5",
  //     apiKey: process.env.ANTHROPIC_API_KEY,
  //   },
  // };
  const config: WikiGeneratorConfig = {
    repositoryUrl: "https://github.wdf.sap.corp/devx-wing/vscode-service-center",
    githubToken: process.env.GITHUB_TOKEN,
    wikiBranch: "memory",
    llm: {
      providerID: "sap-ai-core",
      modelID: "anthropic--claude-4.6-sonnet",
    },
    llmExploration:{
      providerID: "sap-ai-core",
      modelID: "anthropic--claude-4.5-haiku",
    }
    
  };
  await main(config);
}

run().catch(() => {
  logger.error("Wiki generation failed");
  process.exit(1);
});