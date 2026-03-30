import fs from "fs";
import path from "path";
import { gitService, logger } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";

export class PushToGitHubStep implements PipelineStep {
  readonly name = "Push to GitHub";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (context.config.outputPath) {
      logger.info("Skipping GitHub push — outputPath is configured");
      return context;
    }

    if (!context.repoPath) {
      throw new Error("repoPath is required");
    }
    if (!context.wikiStructure) {
      throw new Error("wikiStructure is required");
    }
    if (!context.commitId) {
      throw new Error("commitId is required");
    }
    if (!context.config.wikiBranch) {
      throw new Error("wikiBranch is required when pushing to GitHub");
    }
    
    const { repoPath, wikiStructure, commitId } = context;
    const { wikiBranch } = context.config;

    // Checkout or create the wiki branch (orphan if new)
    await gitService.checkoutOrCreateOrphanBranch(repoPath, wikiBranch);

    // Clean the directory (delete everything except .git)
    this.cleanRepoDirectory(repoPath);

    // Create wiki/sections directory
    const wikiDir = path.join(repoPath, "wiki");
    const sectionsDir = path.join(wikiDir, "sections");
    fs.mkdirSync(sectionsDir, { recursive: true });

    // Write wiki.json at repo root
    const jsonPath = path.join(repoPath, "wiki.json");
    fs.writeFileSync(jsonPath, JSON.stringify(wikiStructure, null, 2));
    logger.info(`Written: wiki.json`);

    // Track which pages are assigned to sections
    const pagesInSections = new Set<string>();

    // Write pages organized by sections
    if (wikiStructure.sections) {
      for (const section of wikiStructure.sections) {
        const sectionSlug = slugify(section.title);
        const sectionDir = path.join(sectionsDir, sectionSlug);
        fs.mkdirSync(sectionDir, { recursive: true });

        for (const pageId of section.pages) {
          const page = wikiStructure.pages.find((p) => p.id === pageId);
          if (page) {
            pagesInSections.add(pageId);
            const fileName = slugify(page.title) + ".md";
            const filePath = path.join(sectionDir, fileName);
            fs.writeFileSync(filePath, page.content);
            logger.info(`Written: wiki/sections/${sectionSlug}/${fileName}`);
          }
        }
      }
    }

    // Write orphan pages (not in any section) directly in wiki/
    for (const page of wikiStructure.pages) {
      if (!pagesInSections.has(page.id)) {
        const fileName = slugify(page.title) + ".md";
        const filePath = path.join(wikiDir, fileName);
        fs.writeFileSync(filePath, page.content);
        logger.info(`Written: wiki/${fileName}`);
      }
    }

    logger.info(`Wiki files written to: ${repoPath}`);

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

  private cleanRepoDirectory(repoPath: string): void {
    const entries = fs.readdirSync(repoPath);

    for (const entry of entries) {
      if (entry === ".git") {
        continue; // Preserve .git directory
      }

      const fullPath = path.join(repoPath, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }

    logger.info("Cleaned repository directory (preserved .git)");
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}