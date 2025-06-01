import { IVectorRepository } from "../core/interfaces/IVectorRepository";
import { IEmbeddingService } from "../core/interfaces/IEmbeddingService";
import {
  SearchQuery,
  SearchResult,
  EmbeddingProvider,
} from "../core/entities/types";
import { ValidationError } from "../../lib/errors";

export class VectorSearchService {
  constructor(
    private vectorRepo: IVectorRepository,
    private embeddingService: IEmbeddingService
  ) {}

  async semanticSearch(
    collection: string,
    query: string,
    options?: {
      provider?: EmbeddingProvider;
      limit?: number;
      scoreThreshold?: number;
      filters?: Record<string, any>;
    }
  ): Promise<SearchResult> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError("query", query, "Query cannot be empty");
    }

    // Generate embedding for the query
    const embedding = await this.embeddingService.generateEmbedding(
      query,
      options?.provider
    );

    // Build search query
    const searchQuery: SearchQuery = {
      vector: embedding,
      text: query,
      limit: options?.limit || 5,
      scoreThreshold: options?.scoreThreshold,
      filters: options?.filters,
    };

    // Execute search
    return await this.vectorRepo.search(collection, searchQuery);
  }

  async vectorSearch(
    collection: string,
    searchQuery: SearchQuery
  ): Promise<SearchResult> {
    return await this.vectorRepo.search(collection, searchQuery);
  }

  async testConnection(): Promise<boolean> {
    return await this.vectorRepo.testConnection();
  }
}
