import {
  create,
  insertMultiple,
  search,
  removeMultiple,
  save,
  load,
  count,
} from "@orama/orama";
import type { AnyOrama } from "@orama/orama";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { logger } from "@repositories-wiki/common";
import { DEFAULT_BATCH_SIZE, DEFAULT__SIMILARITY_WEIGHT, VectorDBOptions, VectorDBDoc, VectorDBSearchHit } from "./types.js";


export class VectorDB {
  private db: AnyOrama | undefined = undefined;
  private dbPath: string | undefined = undefined;
  private embeddingDimension: number | undefined = undefined;
  private batchSize: number = DEFAULT_BATCH_SIZE;
  private similarityWeight: number = DEFAULT__SIMILARITY_WEIGHT

  /** 
   * @param dbPath              - Required file path where the DB is persisted on disk.
   * @param embeddingDimension  - The vector dimension for the embedding field.
   * @param options             - Optional settings: force (recreate DB), batchSize (for insert/remove).
   */
  async init(dbPath: string, embeddingDimension: number, options?: VectorDBOptions): Promise<void> {
    this.dbPath = dbPath;
    this.embeddingDimension = embeddingDimension;
    this.batchSize = options?.batchSize ?? this.batchSize;
    this.similarityWeight = options?.similarityWeight ?? this.similarityWeight;

    const schema = this.buildSchema();

    // Force: delete existing file so we start fresh
    if (options?.force && existsSync(dbPath)) {
      logger.info(`Force flag set — deleting existing DB file at ${dbPath}`);
      unlinkSync(dbPath);
    }

    if (existsSync(dbPath)) {
      // Restore from disk
      logger.info(`Loading Orama index from ${dbPath}...`);
      try {
        const raw = JSON.parse(readFileSync(dbPath, "utf-8"));
        this.db = create({ schema });
        load(this.db, raw);
        const docCount = count(this.db);
        logger.info(`Orama index loaded successfully (${docCount} documents).`);
      } catch (err) {
        logger.error(`Failed to load Orama index from disk, creating new: ${err}`);
        this.db = create({ schema });
      }
    } else {
      // Create new
      logger.info("No existing Orama index found — creating new instance.");
      mkdirSync(dirname(dbPath), { recursive: true });
      this.db = create({ schema });
    }
  }

  /**
   * Batch-insert documents into the index, then auto-save to disk.
   *
   * @param docs - Array of VectorDBDoc to insert.
   */
  async insert(docs: VectorDBDoc[]): Promise<void> {
    const db = await this.getDB();

    if (docs.length === 0) {
      logger.info("insert() called with 0 documents — nothing to do.");
      return;
    }

    logger.info(`Inserting ${docs.length} documents into Orama index...`);
    await insertMultiple(db, docs, this.batchSize);
    logger.info(`Inserted ${docs.length} documents. Total: ${count(db)}.`);

    await this.persist();
  }

  /**
   * Hybrid search combining BM25 full-text + vector similarity.
   *
   * @param query           - The search term for BM25 text matching.
   * @param queryEmbedding  - Pre-computed embedding vector for the query.
   * @param repositoryUrl   - Optional filter: only return results from this repository.
   * @param sectionId       - Optional filter: only return results from this section.
   * @returns Array of search hits.
   */
  async searchBM25(
    query: string,
    queryEmbedding: number[],
    limit: number,
    repositoryUrl?: string,
    sectionId?: string,
  ): Promise<VectorDBSearchHit[]> {
    const db = await this.getDB();

    const where: Record<string, string> = {};
    if (repositoryUrl) {
      where["repositoryUrl"] = repositoryUrl;
    }
    if (sectionId) {
      where["sectionId"] = sectionId;
    }

    const results = await search(db, {
      term: query,
      mode: "hybrid",
      vector: {
        value: queryEmbedding,
        property: "embedding",
      },
      properties: ["content"],
      similarity: this.similarityWeight,
      limit,
      ...(Object.keys(where).length > 0 ? { where } : {}),
    });

    return results.hits as unknown as VectorDBSearchHit[];
  }

  /**
   * Remove all documents matching a given repositoryUrl, then auto-save.
   *
   * @param repositoryUrl - All documents with this repositoryUrl will be deleted.
   */
  async remove(repositoryUrl: string): Promise<void> {
    const db = await this.getDB();

    logger.info(`Removing all documents for repositoryUrl: ${repositoryUrl}...`);

    // Orama doesn't have a "delete where" API, so we search to collect IDs, then remove them.
    // We paginate in case there are many documents.
    const idsToRemove: string[] = [];
    const PAGE_SIZE = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const results = await search(db, {
        term: "",
        where: { repositoryUrl },
        limit: PAGE_SIZE,
        offset,
      });

      for (const hit of results.hits) {
        idsToRemove.push(hit.id);
      }

      if (results.hits.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        offset += PAGE_SIZE;
      }
    }

    if (idsToRemove.length === 0) {
      logger.info(`No documents found for repositoryUrl: ${repositoryUrl}`);
      return;
    }

    logger.info(`Found ${idsToRemove.length} documents to remove.`);

    await removeMultiple(db, idsToRemove, this.batchSize);

    logger.info(`Removed ${idsToRemove.length} documents. Remaining: ${count(db)}.`);

    await this.persist();
  }


  private buildSchema() {
    if (!this.embeddingDimension) {
      throw new Error("embeddingDimension is not set. Call init() first.");
    }
    const dim = this.embeddingDimension;
    return {
      embedding: `vector[${dim}]` as `vector[${number}]`,
      pageId: "string" as const,
      repositoryUrl: "string" as const,
      sectionId: "string" as const,
      content: "string" as const,
    };
  }

  /**
   * Persist the current state to disk as JSON.
   */
  private async persist(): Promise<void> {
    if (!this.dbPath) return;

    const db = await this.getDB();
    const raw = save(db);
    const json = JSON.stringify(raw);
    writeFileSync(this.dbPath, json, "utf-8");

    logger.info(`Orama index persisted to ${this.dbPath}.`);
  }

  private async getDB(): Promise<AnyOrama> {
    if (!this.db) {
      if (!this.dbPath || !this.embeddingDimension) {
        throw new Error("VectorDB not initialized. Call init(dbPath, embeddingDimension) first.");
      }
      await this.init(this.dbPath, this.embeddingDimension);
    }
    return this.db!;
  }
}
