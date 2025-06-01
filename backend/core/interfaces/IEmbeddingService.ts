import { EmbeddingProvider } from "../entities/types";

export interface IEmbeddingService {
  generateEmbedding(
    text: string,
    provider?: EmbeddingProvider
  ): Promise<number[]>;
  batchGenerateEmbeddings(
    texts: string[],
    provider?: EmbeddingProvider
  ): Promise<number[][]>;
  getSupportedProviders(): EmbeddingProvider[];
  getDefaultProvider(): EmbeddingProvider;
  validateProvider(provider: EmbeddingProvider): boolean;
}
