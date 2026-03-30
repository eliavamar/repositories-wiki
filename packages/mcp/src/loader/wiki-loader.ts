import { readFileSync, existsSync } from "node:fs";
import { gitService, WikiStructureModelSchema, type WikiStructureModel } from "@repositories-wiki/common";
import { logger } from "@repositories-wiki/common";
import type { RepoConfig } from "../config.js";

export interface LoadedRepo {
  config: RepoConfig;
  commitId: string;
  wiki: WikiStructureModel;
}

export async function loadRepo(config: RepoConfig): Promise<LoadedRepo> {

  const wikiJsonContent = config.localPath
    ? loadFromDisk(config.localPath, config.repoUrl)
    : await loadFromGitHub(config, config.repoUrl);

  const wiki = parseAndValidate(wikiJsonContent, config.repoUrl);

  logger.info(
    `Loaded wiki for ${config.repoUrl}: "${wiki.title}" — ${wiki.pages.length} pages, ` +
      `${wiki.sections?.length ?? 0} sections, commit ${wiki.commitId.substring(0, 7)}`
  );

  return {
    config,
    commitId: wiki.commitId,
    wiki,
  };
}

export async function loadAllRepos(configs: RepoConfig[]): Promise<LoadedRepo[]> {
  const results: LoadedRepo[] = [];

  for (const config of configs) {
    try {
      const loaded = await loadRepo(config);
      results.push(loaded);
    } catch (error) {
      logger.error(`Failed to load wiki for ${config.repoUrl}: ${error}`);
      throw error;
    }
  }

  return results;
}

function loadFromDisk(localPath: string, repoUrl: string): string {
  logger.info(`Loading wiki for ${repoUrl} from local path "${localPath}"...`);

  if (!existsSync(localPath)) {
    throw new Error(`Local wiki file not found: ${localPath}`);
  }

  return readFileSync(localPath, "utf-8");
}

async function loadFromGitHub(config: RepoConfig, repoUrl: string): Promise<string> {
  logger.info(`Loading wiki for ${repoUrl} from branch "${config.branch}"...`);

  const content = await gitService.getFileFromGitHub(
    config.repoUrl,
    "wiki.json",
    config.branch,
    config.ghToken
  );

  if (!content) {
    throw new Error(
      `wiki.json not found on branch "${config.branch}" in ${repoUrl}. ` +
        "Make sure the wiki has been generated for this repository."
    );
  }

  return content;
}

function parseAndValidate(wikiJsonContent: string, repoUrl: string): WikiStructureModel {
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(wikiJsonContent);
  } catch {
    throw new Error(`wiki.json for ${repoUrl} is not valid JSON.`);
  }

  const parseResult = WikiStructureModelSchema.safeParse(rawJson);
  if (!parseResult.success) {
    throw new Error(`wiki.json validation failed for ${repoUrl}: ${parseResult.error.message}`);
  }

  return parseResult.data;
}
