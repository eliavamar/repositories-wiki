import type { WikiPage } from "@repositories-wiki/common";
import { VectorDB } from "../vector-db";
import { SearchEngineConfig } from "../../config";
import { LoadedRepo } from "../../loader/wiki-loader";
import { EmbeddingService } from "./embedding-service";
import { buildSectionLookup } from "../utils.js";


interface MatchingChunk {
  content: string;
  score: number;
}

export interface ScoredPageResult {
  pageId: string;
  title: string;
  repoUrl: string;
  sectionTitle: string | undefined;
  importance: string;
  score: number;
  relatedPages: string[];
  relevantFiles: { filePath: string; importance?: string }[];
  matchingChunks: { content: string; score: number }[];
}

export interface SearchResult {
  results: ScoredPageResult[];
  total: number;
}

export interface SearchOptions {
  repoUrl?: string;
  limit?: number;
}

export async function searchWiki(
  query: string,
  vectorDB: VectorDB,
  embeddingService: EmbeddingService,
  loadedRepos: LoadedRepo[],
  searchEngineConfig: SearchEngineConfig,
  options: SearchOptions = {},
): Promise<SearchResult> {
  const { repoUrl, limit = 10 } = options;

  const queryEmbedding = await embeddingService.embed(query);

  const chunkLimit = Math.min(limit * 5, 100);
  const hits = await vectorDB.searchBM25(query, queryEmbedding, chunkLimit, repoUrl);

  if (hits.length === 0) {
    return { results: [], total: 0 };
  }

  const pagesMap = buildPagesMap(loadedRepos);

  const pageChunks = new Map<string, { chunks: MatchingChunk[]; repoUrl: string }>();
  for (const hit of hits) {
    const key = `${hit.document.repositoryUrl}::${hit.document.pageId}`;
    const existing = pageChunks.get(key);
    if (existing) {
      existing.chunks.push({ content: hit.document.content, score: hit.score });
    } else {
      pageChunks.set(key, {
        chunks: [{ content: hit.document.content, score: hit.score }],
        repoUrl: hit.document.repositoryUrl,
      });
    }
  }

  const maxChunksPerPage = Math.max(...[...pageChunks.values()].map((v) => v.chunks.length), 1);
  const { bestChunkWeight, chunkCountWeight, importanceBoost } = searchEngineConfig;

  const scoredPages: ScoredPageResult[] = [];
  for (const [key, { chunks }] of pageChunks) {
    const pageInfo = pagesMap.get(key);
    if (!pageInfo) continue;

    const { page, repoUrl: pageRepoUrl, sectionTitle } = pageInfo;
    const bestChunkScore = Math.max(...chunks.map((c) => c.score));
    const chunkCountRatio = chunks.length / maxChunksPerPage;
    const boost = importanceBoost[page.importance as keyof typeof importanceBoost] ?? importanceBoost.medium;

    const score = bestChunkWeight * bestChunkScore + chunkCountWeight * chunkCountRatio + boost;

    scoredPages.push({
      pageId: page.id,
      title: page.title,
      repoUrl: pageRepoUrl,
      sectionTitle,
      importance: page.importance ?? "medium",
      score: Math.round(score * 1000) / 1000,
      relatedPages: page.relatedPages,
      relevantFiles: page.relevantFiles.map((f) => ({
        filePath: f.filePath,
        importance: f.importance,
      })),
      matchingChunks: chunks
        .sort((a, b) => b.score - a.score)
        .map((c) => ({ content: c.content, score: Math.round(c.score * 1000) / 1000 })),
    });
  }

  scoredPages.sort((a, b) => b.score - a.score);
  const topPages = scoredPages.slice(0, limit);

  return { results: topPages, total: topPages.length };
}

function buildPagesMap(
  loadedRepos: LoadedRepo[],
): Map<string, { page: WikiPage; repoUrl: string; sectionTitle?: string }> {
  const pagesMap = new Map<string, { page: WikiPage; repoUrl: string; sectionTitle?: string }>();

  for (const repo of loadedRepos) {
    const sectionLookup = buildSectionLookup(repo.wiki);
    for (const page of repo.wiki.pages) {
      pagesMap.set(`${repo.config.repoUrl}::${page.id}`, {
        page,
        repoUrl: repo.config.repoUrl,
        sectionTitle: sectionLookup.get(page.id)?.title,
      });
    }
  }

  return pagesMap;
}
