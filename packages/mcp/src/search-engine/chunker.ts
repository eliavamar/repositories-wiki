import type { WikiPage, WikiStructureModel } from "@repositories-wiki/common";
import {
  RecursiveCharacterTextSplitter
} from "@langchain/textsplitters";
import { Chunk } from "./types.js";


export async function chunkPage(
  page: WikiPage,
  repoUrl: string,
  chunkSize: number,
  chunkOverlap: number
): Promise<Chunk[]> {
  const content = page.content.trim();

  const sizeSplitter = RecursiveCharacterTextSplitter.fromLanguage("markdown",  {
    separators: ["#", "##"],
    chunkSize,
    chunkOverlap, 
    keepSeparator: true
  });

  const textChunks = await sizeSplitter.splitText(content);
  const chunks: Chunk[] = textChunks.map((content, index) => {
    return {
      pageId: page.id,
      repoUrl,
      chunkIndex: index,
      content: content,
    };
  });

  if (chunks.length === 0 && content) {
    chunks.push({
      pageId: page.id,
      repoUrl,
      chunkIndex: 0,
      content,
    });
  }

  return chunks;
}

/**
 * Chunk all pages in a wiki structure.
 * Returns all chunks across all pages, and a map of pageId -> total chunk count.
 */
export async function chunkAllPages(
  wiki: WikiStructureModel,
  repoUrl: string,
  chunkSize: number,
  chunkOverlap: number
): Promise<{ chunks: Chunk[]; pageChunkCounts: Map<string, number> }> {
  const allChunks: Chunk[] = [];
  const pageChunkCounts = new Map<string, number>();

  for (const page of wiki.pages) {
    const pageChunks = await chunkPage(page, repoUrl, chunkSize, chunkOverlap);
    pageChunkCounts.set(page.id, pageChunks.length);
    allChunks.push(...pageChunks);
  }

  return { chunks: allChunks, pageChunkCounts };
}
