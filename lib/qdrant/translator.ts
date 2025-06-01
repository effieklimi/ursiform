import { client } from "./db";
import { embed } from "./embedder";
import { getConfig } from "../config";
import { SearchHit, EmbeddingProvider } from "../schemas";
import {
  CollectionNotFoundError,
  QdrantConnectionError,
  SearchOperationError,
  ValidationError,
  EmbeddingGenerationError,
} from "../errors";

interface TranslateAndSearchInput {
  query: string;
  collection?: string; // Allow override of default collection
  filters?: Record<string, any>;
  k?: number;
  provider?: EmbeddingProvider;
}

export async function translateAndSearch(
  input: TranslateAndSearchInput
): Promise<SearchHit[]> {
  try {
    // Validate input
    if (!input.query || input.query.trim().length === 0) {
      throw new ValidationError("query", input.query, "Query cannot be empty");
    }

    if (input.k !== undefined && (input.k <= 0 || input.k > 1000)) {
      throw new ValidationError("k", input.k, "k must be between 1 and 1000");
    }

    const config = getConfig();

    // 1. Generate embedding for the query
    let vector: number[];
    try {
      vector = await embed(input.query, input.provider || "openai");
    } catch (error) {
      if (error instanceof EmbeddingGenerationError) {
        throw error; // Re-throw specific embedding errors
      }
      throw new EmbeddingGenerationError(
        input.provider || "openai",
        error as Error,
        input.query
      );
    }

    // 2. Build filter object if filters are provided
    let filter;
    if (input.filters && Object.keys(input.filters).length > 0) {
      filter = {
        must: Object.entries(input.filters).map(([key, value]) => ({
          key,
          match: { value },
        })),
      };
    }

    // 3. Use provided collection or default from config
    const collectionName = input.collection || config.qdrant.defaultCollection;

    // 4. Search in Qdrant
    let searchResult;
    try {
      searchResult = await client.search(collectionName, {
        vector,
        limit: input.k || 5,
        filter,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (
        errorMessage.includes("collection") &&
        errorMessage.includes("not found")
      ) {
        throw new CollectionNotFoundError(collectionName);
      }

      if (
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout")
      ) {
        throw new QdrantConnectionError(error as Error, "search operation");
      }

      throw new SearchOperationError(
        error as Error,
        input.query,
        collectionName
      );
    }

    // 5. Transform results to match our schema
    return searchResult.map((point) => ({
      id: point.id.toString(),
      score: point.score,
      payload: point.payload || {},
    }));
  } catch (error) {
    // Re-throw VectorDBError instances as-is
    if (
      error instanceof Error &&
      error.constructor.name.endsWith("Error") &&
      "code" in error
    ) {
      throw error;
    }

    // Wrap unexpected errors
    console.error("Unexpected error in translate and search:", error);
    throw new SearchOperationError(
      error instanceof Error ? error : new Error(String(error)),
      input.query,
      input.collection
    );
  }
}
