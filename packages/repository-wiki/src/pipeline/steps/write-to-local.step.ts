import fs from "fs";
import path from "path";
import { logger } from "@repositories-wiki/common";
import type { WikiStructureModel } from "@repositories-wiki/common";
import type { PipelineContext, PipelineStep } from "../types";
import { REPOSITORY_WIKI_DIR, AGENTS_MD_FILENAME } from "../../utils/consts";

const INDEX_MD_FILENAME = "INDEX.md";
const WIKI_SECTION_HEADER = "## Repository Wiki";

export class WriteToLocalStep implements PipelineStep {
  readonly name = "Write to Local";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.wikiStructure) {
      throw new Error("wikiStructure is required");
    }
    if (!context.repoPath) {
      throw new Error("repoPath is required");
    }

    const { wikiStructure } = context;
    const outputDirPath = context.config.outputDirPath ? context.config.outputDirPath : REPOSITORY_WIKI_DIR;
    const outputPath = path.join(context.repoPath, outputDirPath);

    // Delete existing output directory for a clean write
    if (fs.existsSync(outputPath)) {
      fs.rmSync(outputPath, { recursive: true, force: true });
      logger.info(`Deleted existing output directory: ${outputPath}`);
    }
    fs.mkdirSync(outputPath, { recursive: true });

    // Create wiki/sections directory
    const sectionsDir = path.join(outputPath, "sections");
    fs.mkdirSync(sectionsDir, { recursive: true });

    // Write pages organized by sections
    for (const section of wikiStructure.sections) {
      const sectionSlug = slugify(section.title);
      const sectionDir = path.join(sectionsDir, sectionSlug);
      fs.mkdirSync(sectionDir, { recursive: true });

      for (const page of section.pages) {
        const fileName = slugify(page.title) + ".md";
        const filePath = path.join(sectionDir, fileName);
        fs.writeFileSync(filePath, page.content ?? "");
        logger.info(`Written: ${filePath}`);
      }
    }

    // Generate INDEX.md inside the wiki output directory
    const indexContent = generateIndexMd(wikiStructure, outputDirPath);
    const indexPath = path.join(outputPath, INDEX_MD_FILENAME);
    fs.writeFileSync(indexPath, indexContent);
    logger.info(`Written: ${indexPath}`);

    // Generate or update AGENTS.md at the repository root
    const agentsMdPath = path.join(context.repoPath, AGENTS_MD_FILENAME);
    const wikiSection = generateAgentsMdSection(wikiStructure.description, outputDirPath);
    writeAgentsMd(agentsMdPath, wikiSection);
    logger.info(`Updated: ${agentsMdPath}`);

    logger.info(`Wiki files written to: ${outputPath}`);

    return context;
  }
}


export function generateAgentsMdSection(description: string, outputDirPath: string): string {
  return `${WIKI_SECTION_HEADER}

This repository has a pre-generated wiki at \`${outputDirPath}/\` that documents its architecture, modules, and key systems. ${description}

### When to consult the wiki
Before exploring multiple files or working on unfamiliar areas, start by reading \`${outputDirPath}/${INDEX_MD_FILENAME}\` to find relevant pages for your task.

### Keeping the wiki updated
If your changes impact documented wiki content — whether updating, adding, or removing pages and sections — use the \`update-wiki\` skill.`;
}

/**
 * Write the wiki section to AGENTS.md.
 * If AGENTS.md already exists, replace the existing wiki section or append it.
 * If it doesn't exist, create a new file.
 */
export function writeAgentsMd(agentsMdPath: string, wikiSection: string): void {
  if (fs.existsSync(agentsMdPath)) {
    const existingContent = fs.readFileSync(agentsMdPath, "utf-8");
    const updatedContent = replaceOrAppendSection(existingContent, wikiSection);
    fs.writeFileSync(agentsMdPath, updatedContent);
  } else {
    fs.writeFileSync(agentsMdPath, wikiSection + "\n");
  }
}

/**
 * Replace the existing "## Repository Wiki" section in the content,
 * or append it at the end if no such section exists.
 */
function replaceOrAppendSection(content: string, newSection: string): string {
  const sectionStart = content.indexOf(WIKI_SECTION_HEADER);
  if (sectionStart === -1) {
    // No existing wiki section — append
    const separator = content.endsWith("\n") ? "\n" : "\n\n";
    return content + separator + newSection + "\n";
  }

  // Find the end of the wiki section (next ## heading or end of file)
  const afterHeader = sectionStart + WIKI_SECTION_HEADER.length;
  const nextSectionMatch = content.slice(afterHeader).search(/^## /m);
  const sectionEnd = nextSectionMatch === -1
    ? content.length
    : afterHeader + nextSectionMatch;

  const before = content.slice(0, sectionStart);
  const after = content.slice(sectionEnd);

  return before + newSection + "\n" + after;
}


export function generateIndexMd(wikiStructure: WikiStructureModel, outputDirPath: string): string {
  const lines: string[] = [
    `# ${wikiStructure.title}`,
    "",
    `Generated from commit \`${wikiStructure.commitId}\`.`,
    "",
  ];

  for (const section of wikiStructure.sections) {
    const sectionSlug = slugify(section.title);
    lines.push(`## ${section.title}`);
    lines.push("");
    lines.push("| Page | Importance | Relevant Source Files |");
    lines.push("|------|------------|----------------------|");

    for (const page of section.pages) {
      const pageSlug = slugify(page.title);
      const pagePath = `sections/${sectionSlug}/${pageSlug}.md`;
      const filesList = page.relevantFiles
        .map((f) => `\`${typeof f === "string" ? f : f.filePath}\``)
        .join(", ");

      lines.push(`| [${page.title}](${pagePath}) | ${page.importance} | ${filesList} |`);
    }

    lines.push("");
  }

  return lines.join("\n");
}


function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
