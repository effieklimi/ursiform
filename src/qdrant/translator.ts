import { client } from "./db";
import { embed } from "./embedder";
import { SearchHit } from "../schemas";

interface TranslateAndSearchInput {
  query: string;
  filters?: Record<string, any>;
  k?: number;
}

export async function translateAndSearch(
  input: TranslateAndSearchInput
): Promise<SearchHit[]> {
  try {
    // 1. Generate embedding for the query
    const vector = await embed(input.query);

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

    // 3. Search in Qdrant
    const searchResult = await client.search("my_collection", {
      vector,
      limit: input.k || 5,
      filter,
    });

    // 4. Transform results to match our schema
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
