import fs from "fs";
import path from "path";
import { gitService, logger } from "@repositories-wiki/core";
import type { PipelineContext, PipelineStep } from "../types";

export class PushToGitHubStep implements PipelineStep {
  readonly name = "Push to GitHub";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.repoPath) {
      throw new Error("repoPath is required");
    }
    if (!context.wikiOutputPath) {
      throw new Error("wikiOutputPath is required");
    }
    if (!context.commitId) {
      throw new Error("commitId is required");
    }

    const { repoPath, wikiOutputPath, commitId } = context;
    const { wikiBranch } = context.config;

    // Checkout or create the wiki branch (orphan if new)
    await gitService.checkoutOrCreateOrphanBranch(repoPath, wikiBranch);

    // Move wiki output files to repo root
    const wikiJsonSrc = path.join(wikiOutputPath, "wiki.json");
    const pagesSrc = path.join(wikiOutputPath, "pages");

    const wikiJsonDest = path.join(repoPath, "wiki.json");
    const pagesDest = path.join(repoPath, "pages");

    // Remove old files if they exist
    if (fs.existsSync(wikiJsonDest)) fs.unlinkSync(wikiJsonDest);
    if (fs.existsSync(pagesDest)) fs.rmSync(pagesDest, { recursive: true });

    // Copy files
    fs.copyFileSync(wikiJsonSrc, wikiJsonDest);
    fs.cpSync(pagesSrc, pagesDest, { recursive: true });

    // Remove the .wiki-output directory
    fs.rmSync(wikiOutputPath, { recursive: true });

    // Commit and push
    await gitService.addAll(repoPath);
    const commitMessage = `Wiki generated from commit ${commitId.substring(0, 7)}`;
    await gitService.commit(repoPath, commitMessage);
    logger.info(`Committed: ${commitMessage}`);

    // Force push for orphan branch (it has different history)
    const isNewBranch = context.flowType === "new";
    await gitService.push(repoPath, wikiBranch, isNewBranch);
    logger.info(`Pushed to branch: ${wikiBranch}`);

    return context;
  }
}