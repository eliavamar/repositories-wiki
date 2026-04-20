#!/usr/bin/env node
import { Command } from "commander";
import { logger, WikiGeneratorConfigSchema, type WikiGeneratorConfig } from "@repositories-wiki/common";
import { WikiGeneratorPipeline } from "./pipeline/index.js";

const program = new Command()
  .name("repository-wiki")
  .description(
    "Generate a wiki from a source code repository using LLMs\n\n" +
    "Before running, make sure to export the environment variables required by your LLM provider.\n" +
    "Provider setup guides:\n" +
    "  - openai, anthropic, azure_openai, google-genai, bedrock:\n" +
    "      https://docs.langchain.com/oss/javascript/integrations/chat\n" +
    "  - sap-ai-core:\n" +
    "      https://sap.github.io/ai-sdk/docs/js/overview-cloud-sdk-for-ai-js"
  )
  .requiredOption("--provider-id <id>", "LLM provider ID (options: openai, anthropic, azure_openai, google-genai, bedrock, sap-ai-core)")
  .requiredOption("--planer-model <id>", "Model ID for the planning LLM (recommended: Opus family)")
  .requiredOption("--exploration-model <id>", "Model ID for the exploration LLM (recommended: Haiku family)")
  .requiredOption("--builder-model <id>", "Model ID for the builder LLM (recommended: Sonnet family)")
  .option("--repo-url <url>", "Repository URL to clone (conflicts with --local-repo-path)")
  .option("--local-repo-path <path>", "Path to a local repository (conflicts with --repo-url)")
  .option("--github-token <token>", "GitHub token (required with --repo-url or --push-to-github)")
  .option("--commit-id <id>", "(optional) Specific commit ID to generate wiki from (default: main/master)")
  .option("--output-dir <path>", "(optional) Output directory for generated wiki files (default: repository-wiki)")
  .option("--push-to-github", "(optional) Push generated wiki to GitHub", false)
  .option("--wiki-branch <branch>", "(optional) Wiki branch name (default: repository-wiki-<timestamp>)")
  .addHelpText("after", `
Examples:

  # Generate wiki from a local repository using Anthropic
  $ export ANTHROPIC_API_KEY=sk-...
  $ repository-wiki \\
      --provider-id anthropic \\
      --planer-model claude-opus-4-6 \\
      --exploration-model claude-haiku-4-5 \\
      --builder-model claude-sonnet-4-6 \\
      --local-repo-path /path/to/my-project

  # Generate wiki from a GitHub repository URL
  $ export ANTHROPIC_API_KEY=sk-...
  $ repository-wiki \\
      --provider-id anthropic \\
      --planer-model claude-opus-4-6 \\
      --exploration-model claude-haiku-4-5 \\
      --builder-model claude-sonnet-4-6 \\
      --repo-url https://github.com/owner/repo \\
      --github-token ghp_xxxxxxxxxxxx

  # Generate wiki using SAP AI Core and push to GitHub
  $ repository-wiki \\
      --provider-id sap-ai-core \\
      --planer-model anthropic--claude-4.6-opus \\
      --exploration-model anthropic--claude-4.5-haiku \\
      --builder-model anthropic--claude-4.5-sonnet \\
      --repo-url https://github.com/owner/repo \\
      --github-token ghp_xxxxxxxxxxxx \\
      --push-to-github \\
      --wiki-branch my-wiki-branch

  # Generate wiki with custom output directory
  $ repository-wiki \\
      --provider-id openai \\
      --planer-model o3 \\
      --exploration-model gpt-4o-mini \\
      --builder-model gpt-4o \\
      --local-repo-path /path/to/my-project \\
      --output-dir docs/wiki
`);

program.parse();

const opts = program.opts();

const config: WikiGeneratorConfig = {
  repositoryUrl: opts.repoUrl,
  localRepoPath: opts.localRepoPath,
  githubToken: opts.githubToken,
  wikiBranch: opts.wikiBranch,
  commitId: opts.commitId,
  providerConfig: {
    providerID: opts.providerId,
  },
  llmPlaner: {
    modelID: opts.planerModel,
  },
  llmExploration: {
    modelID: opts.explorationModel,
  },
  llmBuilder: {
    modelID: opts.builderModel,
  },
  outputDirPath: opts.outputDir,
  pushToGithub: opts.pushToGithub,
};

async function run(): Promise<void> {
  try {
    const validatedConfig = WikiGeneratorConfigSchema.parse(config);

    const pipeline = WikiGeneratorPipeline.create();
    const result = await pipeline.execute(validatedConfig);

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
    if (error instanceof Error && error.name === "ZodError") {
      logger.error(`Invalid configuration: ${error.message}`);
    } else {
      logger.error(
        `Wiki generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    process.exit(1);
  }
}

run().then(() => {
  process.exit(0);
});
