import { logger } from "@repositories-wiki/common";
import { pipeline, FeatureExtractionPipeline } from "@huggingface/transformers"


export class EmbeddingService {
  private extractor: FeatureExtractionPipeline | undefined = undefined;
  private initialized = false;

  readonly embeddingDimension: number;
  private readonly model: string;
  private readonly batchSize: number;

  constructor(model: string, embeddingDimension: number, batchSize: number) {
    this.model = model;
    this.embeddingDimension = embeddingDimension;
    this.batchSize = batchSize;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info(`Loading embedding model (${this.model})...`);

    // @ts-expect-error — pipeline() return type union is too complex for TS to resolve
    this.extractor = await pipeline("feature-extraction", this.model, { dtype: "fp32" });

    this.initialized = true;
    logger.info("Embedding model loaded successfully.");
  }

  async embed(text: string): Promise<number[]> {
    if (!this.extractor) {
      throw new Error("EmbeddingService not initialized. Call initialize() first.");
    }

    const output = await this.extractor(text, {
      pooling: "mean",
      normalize: true,
    });

    const vectors = output.tolist();
    return vectors[0]!;
  }


  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.extractor) {
      throw new Error("EmbeddingService not initialized. Call initialize() first.");
    }

    if (texts.length === 0) return [];

    // Process in batches to avoid memory issues
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const output = await this.extractor(batch, {
        pooling: "mean",
        normalize: true,
      });
      const vectors = output.tolist();
      allEmbeddings.push(...vectors);

      if (texts.length > this.batchSize) {
        logger.info(
          `Embedding progress: ${Math.min(i + this.batchSize, texts.length)}/${texts.length} chunks`
        );
      }
    }

    return allEmbeddings;
  }
}
