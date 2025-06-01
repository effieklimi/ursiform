import { client } from "./db";
import { embed } from "./embedder";
import { getConfig } from "../config";
import { SearchHit, EmbeddingProvider } from "../schemas";

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
    const config = getConfig();

    // 1. Generate embedding for the query
    const vector = await embed(input.query, input.provider || "openai");

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
    const searchResult = await client.search(collectionName, {
      vector,
      limit: input.k || 5,
      filter,
    });

    // 5. Transform results to match our schema
    return searchResult.map((point) => ({
      id: point.id.toString(),
      score: point.score,
      payload: point.payload || {},
    }));
  } catch (error) {
    console.error("Error in translate and search:", error);
    throw new Error("Failed to perform translate and search");
  }
}
