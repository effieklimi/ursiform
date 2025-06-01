import { IEmbeddingService } from "../core/interfaces/IEmbeddingService";
import { EmbeddingProvider } from "../core/entities/types";
import { embed } from "../infrastructure/qdrant/embedder";

export class EmbeddingService implements IEmbeddingService {
  async generateEmbedding(
    text: string,
    provider: EmbeddingProvider = "openai"
  ): Promise<number[]> {
    return embed(text, provider);
  }

  async batchGenerateEmbeddings(
    texts: string[],
    provider: EmbeddingProvider = "openai"
  ): Promise<number[][]> {
    // For now, process sequentially. Could be optimized for parallel processing
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text, provider);
      embeddings.push(embedding);
    }
    return embeddings;
  }

  getSupportedProviders(): EmbeddingProvider[] {
    return ["openai", "gemini"];
  }

  getDefaultProvider(): EmbeddingProvider {
    return "openai";
  }

  validateProvider(provider: EmbeddingProvider): boolean {
    return this.getSupportedProviders().includes(provider);
  }
}
