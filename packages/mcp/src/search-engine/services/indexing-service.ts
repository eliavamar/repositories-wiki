import { logger } from "@repositories-wiki/common";
import type { LoadedRepo } from "../../loader/wiki-loader.js";
import type { SearchEngineConfig } from "../../config.js";
import type { VectorDB } from "../vector-db.js";
import type { EmbeddingService } from "./embedding-service.js";
import { chunkAllPages } from "../chunker.js";
import type { VectorDBDoc } from "../types.js";
import { buildSectionLookup } from "../utils.js";

export async function indexRepo(
  repo: LoadedRepo,
  vectorDB: VectorDB,
  embeddingService: EmbeddingService,
  searchEngineConfig: SearchEngineConfig,
): Promise<void> {
  const sectionLookup = buildSectionLookup(repo.wiki);

  const { chunks } = await chunkAllPages(
    repo.wiki,
    repo.config.repoUrl,
    searchEngineConfig.chunkSize,
    searchEngineConfig.chunkOverlap,
  );

  if (chunks.length === 0) {
    logger.warn(`No chunks generated for ${repo.config.repoUrl} — skipping.`);
    return;
  }

  const texts = chunks.map((c) => c.content);
  logger.info(`Computing embeddings for ${texts.length} chunks from ${repo.config.repoUrl}...`);
  const embeddings = await embeddingService.embedBatch(texts);

  const docs: VectorDBDoc[] = chunks.map((chunk, i) => ({
    embedding: embeddings[i]!,
    pageId: chunk.pageId,
    repositoryUrl: chunk.repoUrl,
    sectionId: sectionLookup.get(chunk.pageId)?.id ?? "",
    content: chunk.content,
  }));

  await vectorDB.insert(docs);
  logger.info(`Indexed ${docs.length} chunks for ${repo.config.repoUrl || repo.config.localPath}.`);
}

export async function indexAllRepos(
  repos: LoadedRepo[],
  vectorDB: VectorDB,
  embeddingService: EmbeddingService,
  searchEngineConfig: SearchEngineConfig,
): Promise<void> {
  for (const repo of repos) {
    await indexRepo(repo, vectorDB, embeddingService, searchEngineConfig);
  }
}
