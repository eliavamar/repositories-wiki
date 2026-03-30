export interface VectorDBOptions {
  force?: boolean;
  batchSize?: number;
  similarityWeight?: number
}

export interface VectorDBDoc {
  embedding: number[];
  pageId: string;
  repositoryUrl: string;
  sectionId: string;
  content: string;
}

export interface VectorDBSearchHit {
  id: string;
  score: number;
  document: VectorDBDoc;
}

export const DEFAULT_BATCH_SIZE = 1000;
export const DEFAULT__SIMILARITY_WEIGHT = 75;

export interface Chunk {
  pageId: string;
  repoUrl: string;
  chunkIndex: number;
  content: string;
}
