import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { client } from "./db";
import { EmbeddingProvider } from "../schemas";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface QueryIntent {
  type:
    | "count"
    | "search"
    | "list"
    | "filter"
    | "describe"
    | "collections"
    | "database";
  target: string; // what to count/search/list
  filter?: any; // any filters to apply
  limit?: number;
  scope: "collection" | "database"; // new: scope of the query
  extractedCollection?: string; // new: collection name extracted from query text
}

export async function processNaturalQuery(
  collection: string | null, // Make collection optional
  question: string,
  provider: EmbeddingProvider = "openai"
): Promise<{
  answer: string;
  query_type: string;
  data?: any;
  execution_time_ms: number;
}> {
  const startTime = Date.now();

  try {
    // Step 1: Understand the intent using LLM
    const intent = await parseQueryIntent(question, provider);

    // Step 2: Use extracted collection name if available and no explicit collection provided
    const finalCollection = collection || intent.extractedCollection || null;

    // Step 3: Execute the appropriate operation (database or collection level)
    const result = await executeQuery(finalCollection, intent);

    // Step 4: Generate natural language response
    const answer = await generateResponse(question, intent, result, provider);

    const execution_time_ms = Date.now() - startTime;

    return {
      answer,
      query_type: intent.type,
      data: result,
      execution_time_ms,
    };
  } catch (error) {
    console.error("Error processing natural query:", error);

    // Create fallback response even if everything fails
    const fallbackAnswer =
      "I encountered an issue processing your query, but I'm using pattern matching to help. " +
      generateFallbackResponse(question, inferIntentFromQuestion(question), {
        count: 0,
      });

    return {
      answer: fallbackAnswer,
      query_type: "fallback",
      data: null,
      execution_time_ms: Date.now() - startTime,
    };
  }
}

async function parseQueryIntent(
  question: string,
  provider: EmbeddingProvider
): Promise<QueryIntent> {
  // First try simple pattern matching as fallback
  const fallbackIntent = inferIntentFromQuestion(question);

  // If we don't have API keys, use fallback
  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    console.log("No API keys available, using pattern matching fallback");
    return fallbackIntent;
  }

  const systemPrompt = `You are a query analyzer for a vector database system. Parse the user's question and return a JSON object with the query intent.

The system contains multiple collections, each with image data with these fields:
- name (artist name)
- file_name (image filename)
- image_url (URL to image)
- url (style URL)

Available query types:
- "count": count items (e.g., "how many artists", "count images")
- "search": find specific items (e.g., "find Chris Dyer images")
- "list": list unique values (e.g., "list all artists")
- "filter": filter by criteria (e.g., "images with .jpeg extension")
- "describe": get general info (e.g., "describe this collection")
- "collections": collection management (e.g., "what collections exist", "list collections")
- "database": database-level queries (e.g., "describe the database", "how many collections")

Available scopes:
- "collection": query operates on a specific collection
- "database": query operates on the entire database

Return ONLY a JSON object in this format:
{
  "type": "count|search|list|filter|describe|collections|database",
  "target": "what to count/search/list (e.g., 'artists', 'images', 'collections')",
  "filter": {"field": "value"} or null,
  "limit": number or null,
  "scope": "collection|database",
  "extractedCollection": "collection_name_if_mentioned_in_query" or null
}

Examples:
- "How many artists?" → {"type": "count", "target": "artists", "filter": null, "limit": null, "scope": "database", "extractedCollection": null}
- "How many artists in midjourneysample?" → {"type": "count", "target": "artists", "filter": null, "limit": null, "scope": "collection", "extractedCollection": "midjourneysample"}
- "What collections exist?" → {"type": "collections", "target": "list", "filter": null, "limit": null, "scope": "database", "extractedCollection": null}
- "How many collections are there?" → {"type": "count", "target": "collections", "filter": null, "limit": null, "scope": "database", "extractedCollection": null}
- "Describe the database" → {"type": "database", "target": "overview", "filter": null, "limit": null, "scope": "database", "extractedCollection": null}
- "Find Chris Dyer images across all collections" → {"type": "search", "target": "images", "filter": {"name": "Chris Dyer"}, "limit": 10, "scope": "database", "extractedCollection": null}
- "How many vectors in test_collection?" → {"type": "count", "target": "total", "filter": null, "limit": null, "scope": "collection", "extractedCollection": "test_collection"}`;

  try {
    let response: string;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash", // Use stable Gemini 2.0 Flash model
      });
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: `Question: "${question}"` },
      ]);
      response = result.response.text();
    } else if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Question: "${question}"` },
        ],
        temperature: 0,
      });
      response = completion.choices[0].message.content || "{}";
    } else {
      throw new Error("No valid API key for the specified provider");
    }

    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    return JSON.parse(jsonStr);
  } catch (e) {
    // Fallback parsing
    console.warn("Failed to parse LLM response, using fallback:", e);
    return fallbackIntent;
  }
}

function inferIntentFromQuestion(question: string): QueryIntent {
  const q = question.toLowerCase();

  // Try to extract collection name from the question
  const extractedCollection = extractCollectionFromQuestion(question);

  // Database-level queries
  if (q.includes("collections") || q.includes("database")) {
    if (q.includes("how many") || q.includes("count")) {
      return { type: "count", target: "collections", scope: "database" };
    }
    if (q.includes("list") || q.includes("what") || q.includes("show")) {
      return { type: "collections", target: "list", scope: "database" };
    }
    if (q.includes("describe")) {
      return { type: "database", target: "overview", scope: "database" };
    }
  }

  // Collection-level queries (existing logic)
  if (q.includes("how many") || q.includes("count")) {
    if (q.includes("artist")) {
      return {
        type: "count",
        target: "artists",
        scope: extractedCollection ? "collection" : "database",
        ...(extractedCollection && { extractedCollection }),
      };
    }
    if (q.includes("vector") || q.includes("image") || q.includes("item")) {
      return {
        type: "count",
        target: "total",
        scope: extractedCollection ? "collection" : "database",
        ...(extractedCollection && { extractedCollection }),
      };
    }
    return {
      type: "count",
      target: "total",
      scope: extractedCollection ? "collection" : "database",
      ...(extractedCollection && { extractedCollection }),
    };
  }

  if (q.includes("find") || q.includes("search")) {
    // Check if it's across all collections
    const scope =
      q.includes("all collections") || q.includes("across")
        ? "database"
        : extractedCollection
        ? "collection"
        : "database";

    // Try to extract artist name
    const artistMatch = question.match(
      /(?:by|from|of)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
    );
    if (artistMatch) {
      return {
        type: "search",
        target: "images",
        filter: { name: artistMatch[1] },
        limit: 10,
        scope,
        ...(extractedCollection && { extractedCollection }),
      };
    }
    return {
      type: "search",
      target: "images",
      limit: 10,
      scope,
      ...(extractedCollection && { extractedCollection }),
    };
  }

  if (q.includes("list") || q.includes("show")) {
    if (q.includes("artist")) {
      return {
        type: "list",
        target: "artists",
        scope: extractedCollection ? "collection" : "database",
        ...(extractedCollection && { extractedCollection }),
      };
    }
    return {
      type: "list",
      target: "images",
      limit: 20,
      scope: extractedCollection ? "collection" : "database",
      ...(extractedCollection && { extractedCollection }),
    };
  }

  if (q.includes("describe")) {
    return {
      type: "describe",
      target: extractedCollection ? "collection" : "database",
      scope: extractedCollection ? "collection" : "database",
      ...(extractedCollection && { extractedCollection }),
    };
  }

  return {
    type: "describe",
    target: "collection",
    scope: extractedCollection ? "collection" : "database",
    ...(extractedCollection && { extractedCollection }),
  };
}

// New function to extract collection names from natural language
function extractCollectionFromQuestion(question: string): string | undefined {
  const q = question.toLowerCase();

  // Common patterns for mentioning collections
  const patterns = [
    // "in [collection]" or "from [collection]"
    /(?:in|from)\s+([a-zA-Z][a-zA-Z0-9_-]*)/g,
    // "[collection] collection"
    /([a-zA-Z][a-zA-Z0-9_-]*)\s+collection/g,
    // "collection [collection]"
    /collection\s+([a-zA-Z][a-zA-Z0-9_-]*)/g,
  ];

  for (const pattern of patterns) {
    const matches = [...q.matchAll(pattern)];
    for (const match of matches) {
      const candidate = match[1];
      // Filter out common words that aren't collection names
      if (
        ![
          "the",
          "this",
          "that",
          "my",
          "your",
          "our",
          "their",
          "all",
          "some",
          "any",
          "each",
          "every",
        ].includes(candidate)
      ) {
        return candidate;
      }
    }
  }

  // Look for specific common collection names that might appear without prepositions
  const commonCollectionNames = [
    "midjourneysample",
    "test_collection",
    "my_docs",
    "test_small",
    "new_test_yearn",
    "docs_openai",
    "docs_gemini",
  ];
  for (const name of commonCollectionNames) {
    if (q.includes(name)) {
      return name;
    }
  }

  return undefined;
}

async function executeQuery(
  collection: string | null,
  intent: QueryIntent
): Promise<any> {
  if (intent.scope === "database") {
    return await executeDatabaseQuery(intent);
  } else {
    // Collection-level query - require collection name
    if (!collection) {
      throw new Error(
        "Collection name is required for collection-level queries"
      );
    }
    return await executeCollectionQuery(collection, intent);
  }
}

async function executeDatabaseQuery(intent: QueryIntent): Promise<any> {
  switch (intent.type) {
    case "count":
      if (intent.target === "collections") {
        return await countCollections();
      }
      if (intent.target === "artists") {
        return await countArtistsAcrossDatabase();
      }
      if (intent.target === "total") {
        return await countTotalVectorsAcrossDatabase();
      }
      break;

    case "collections":
      return await listCollections();

    case "database":
      return await describeDatabaseInfo();

    case "search":
      if (intent.filter) {
        return await searchAcrossCollections(intent.filter, intent.limit || 10);
      }
      break;

    case "list":
      if (intent.target === "artists") {
        return await listArtistsAcrossDatabase(intent.limit || 50);
      }
      break;

    default:
      throw new Error(
        `Database-level query type '${intent.type}' not implemented yet`
      );
  }
}

async function executeCollectionQuery(
  collection: string,
  intent: QueryIntent
): Promise<any> {
  switch (intent.type) {
    case "count":
      if (intent.target === "artists") {
        return await countUniqueArtists(collection);
      } else {
        return await countTotal(collection);
      }

    case "search":
      return await searchImages(collection, intent.filter, intent.limit || 10);

    case "list":
      if (intent.target === "artists") {
        return await listUniqueArtists(collection, intent.limit || 50);
      } else {
        return await listImages(collection, intent.limit || 20);
      }

    case "filter":
      return await filterImages(collection, intent.filter, intent.limit || 20);

    case "describe":
      return await describeCollection(collection);

    default:
      throw new Error(`Unknown collection-level query type: ${intent.type}`);
  }
}

// New database-level functions
async function countCollections(): Promise<{
  count: number;
  collections: string[];
}> {
  const collectionsInfo = await client.getCollections();
  const collections = collectionsInfo.collections.map((c: any) => c.name);

  return {
    count: collections.length,
    collections: collections,
  };
}

async function listCollections(): Promise<{
  collections: Array<{ name: string; vectors_count?: number }>;
}> {
  const collectionsInfo = await client.getCollections();
  const collections = collectionsInfo.collections;

  // Get detailed info for each collection using actual count
  const detailedCollections = await Promise.all(
    collections.map(async (collection: any) => {
      try {
        // Use the same count method that works for individual queries
        const countResult = await client.count(collection.name, {});
        return {
          name: collection.name,
          vectors_count: countResult.count || 0,
        };
      } catch (error) {
        console.warn(
          `Failed to count vectors in collection ${collection.name}:`,
          error
        );
        return {
          name: collection.name,
          vectors_count: 0,
        };
      }
    })
  );

  return { collections: detailedCollections };
}

async function describeDatabaseInfo(): Promise<any> {
  const collectionsData = await listCollections();
  const totalVectors = collectionsData.collections.reduce(
    (sum, col) => sum + (col.vectors_count || 0),
    0
  );

  return {
    total_collections: collectionsData.collections.length,
    total_vectors: totalVectors,
    collections: collectionsData.collections,
  };
}

async function searchAcrossCollections(
  filter: any,
  limit: number
): Promise<any> {
  const collectionsData = await listCollections();
  const allResults: any[] = [];

  // Search each collection
  for (const collection of collectionsData.collections) {
    try {
      const results = await searchImages(collection.name, filter, limit);
      if (results.images && results.images.length > 0) {
        allResults.push({
          collection: collection.name,
          count: results.count,
          images: results.images,
        });
      }
    } catch (error) {
      console.warn(`Failed to search collection ${collection.name}:`, error);
    }
  }

  const totalCount = allResults.reduce((sum, result) => sum + result.count, 0);

  return {
    total_count: totalCount,
    collections_searched: collectionsData.collections.length,
    results_by_collection: allResults,
  };
}

// Existing collection-level functions remain the same
async function countTotal(collection: string): Promise<{ count: number }> {
  const response = await client.count(collection, {});
  return { count: response.count };
}

async function countUniqueArtists(
  collection: string
): Promise<{ count: number; artists: string[] }> {
  const response = await client.scroll(collection, {
    limit: 1000,
    with_payload: true,
    with_vector: false,
  });

  const artists = new Set(
    response.points.map((point: any) => point.payload?.name).filter(Boolean)
  );

  return {
    count: artists.size,
    artists: Array.from(artists).slice(0, 20),
  };
}

async function searchImages(
  collection: string,
  filter: any,
  limit: number
): Promise<any> {
  const response = await client.scroll(collection, {
    limit: 1000,
    with_payload: true,
    with_vector: false,
  });

  let filteredPoints = response.points;

  if (filter) {
    filteredPoints = response.points.filter((point: any) => {
      return Object.entries(filter).every(([key, value]) => {
        return point.payload?.[key] === value;
      });
    });
  }

  const limitedPoints = filteredPoints.slice(0, limit);

  return {
    count: limitedPoints.length,
    images: limitedPoints,
  };
}

async function listUniqueArtists(
  collection: string,
  limit: number
): Promise<{ artists: string[] }> {
  const response = await client.scroll(collection, {
    limit,
    with_payload: true,
    with_vector: false,
  });

  const artists = new Set(
    response.points.map((point: any) => point.payload?.name).filter(Boolean)
  );

  return { artists: Array.from(artists) };
}

async function listImages(collection: string, limit: number): Promise<any> {
  const response = await client.scroll(collection, {
    limit,
    with_payload: true,
    with_vector: false,
  });

  return {
    count: response.points.length,
    images: response.points.map((point: any) => ({
      id: point.id,
      artist: point.payload?.name,
      filename: point.payload?.file_name,
    })),
  };
}

async function filterImages(
  collection: string,
  filter: any,
  limit: number
): Promise<any> {
  return await searchImages(collection, filter, limit);
}

async function describeCollection(collection: string): Promise<any> {
  const totalCount = await countTotal(collection);
  const artistsData = await countUniqueArtists(collection);
  const sampleImages = await listImages(collection, 5);

  return {
    total_images: totalCount.count,
    unique_artists: artistsData.count,
    sample_artists: artistsData.artists.slice(0, 10),
    sample_images: sampleImages.images,
  };
}

async function generateResponse(
  question: string,
  intent: QueryIntent,
  data: any,
  provider: EmbeddingProvider
): Promise<string> {
  const fallbackResponse = generateFallbackResponse(question, intent, data);

  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    return fallbackResponse;
  }

  const systemPrompt = `You are a helpful assistant that explains vector database query results in natural language.
  
The user asked: "${question}"
The query type was: ${intent.type}
The query scope was: ${intent.scope}
The data returned is: ${JSON.stringify(data, null, 2)}

Provide a concise, natural language response that directly answers the user's question. Be specific with numbers and names when available.`;

  try {
    let response: string;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash", // Use stable Gemini 2.0 Flash model
      });
      const result = await model.generateContent(systemPrompt);
      response = result.response.text();
    } else if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.3,
        max_tokens: 200,
      });
      response = completion.choices[0].message.content || fallbackResponse;
    } else {
      return fallbackResponse;
    }

    return response.trim();
  } catch (error) {
    console.warn("Failed to generate LLM response, using fallback:", error);
    return fallbackResponse;
  }
}

function generateFallbackResponse(
  question: string,
  intent: QueryIntent,
  data: any
): string {
  if (intent.scope === "database") {
    switch (intent.type) {
      case "count":
        if (intent.target === "collections") {
          return `I found ${data.count || 0} collections in the database: ${
            data.collections?.join(", ") || "None found"
          }.`;
        }
        if (intent.target === "artists") {
          return `I found ${
            data.count || 0
          } unique artists across all collections. Some of them include: ${
            data.artists?.slice(0, 5).join(", ") || "No artists found"
          }.`;
        }
        if (intent.target === "total") {
          return `The database contains ${
            data.count || 0
          } total vectors across all collections.`;
        }
        break;
      case "collections":
        return `The database contains ${
          data.collections?.length || 0
        } collections: ${
          data.collections
            ?.map((c: any) => `${c.name} (${c.vectors_count || 0} vectors)`)
            .join(", ") || "None found"
        }.`;
      case "database":
        return `The database contains ${
          data.total_collections || 0
        } collections with a total of ${data.total_vectors || 0} vectors.`;
      case "search":
        return `I searched across ${
          data.collections_searched || 0
        } collections and found ${data.total_count || 0} matching items.`;
      case "list":
        if (intent.target === "artists") {
          return `I found ${
            data.artists?.length || 0
          } unique artists across all collections: ${
            data.artists?.slice(0, 10).join(", ") || "No artists found"
          }.`;
        }
        break;
    }
  }

  // Collection-level responses (existing logic)
  switch (intent.type) {
    case "count":
      if (intent.target === "artists") {
        return `I found ${
          data.count || 0
        } unique artists in the collection. Some of them include: ${
          data.artists?.slice(0, 5).join(", ") || "No artists found"
        }.`;
      } else {
        return `The collection contains ${data.count || 0} total images.`;
      }

    case "search":
    case "filter":
      return `I found ${data.count || 0} images matching your criteria.`;

    case "list":
      if (intent.target === "artists") {
        return `Here are the artists in the collection: ${
          data.artists?.slice(0, 10).join(", ") || "No artists found"
        }${data.artists?.length > 10 ? "..." : ""}.`;
      } else {
        return `I found ${data.count || 0} items in the collection.`;
      }

    case "describe":
      return `This collection contains ${data.total_images || 0} images from ${
        data.unique_artists || 0
      } unique artists. Some featured artists include: ${
        data.sample_artists?.slice(0, 5).join(", ") || "No artists found"
      }.`;

    default:
      return "I processed your query successfully using pattern matching.";
  }
}

// New database-level functions for artists and total counts
async function countArtistsAcrossDatabase(): Promise<{
  count: number;
  artists: string[];
}> {
  const collectionsData = await listCollections();
  const allArtists = new Set<string>();

  // Collect artists from each collection
  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        const artistsData = await countUniqueArtists(collection.name);
        artistsData.artists.forEach((artist) => allArtists.add(artist));
      }
    } catch (error) {
      console.warn(
        `Failed to get artists from collection ${collection.name}:`,
        error
      );
    }
  }

  return {
    count: allArtists.size,
    artists: Array.from(allArtists).slice(0, 20), // Show first 20
  };
}

async function countTotalVectorsAcrossDatabase(): Promise<{
  count: number;
  by_collection: Array<{ name: string; count: number }>;
}> {
  const collectionsData = await listCollections();
  const totalVectors = collectionsData.collections.reduce(
    (sum, col) => sum + (col.vectors_count || 0),
    0
  );

  return {
    count: totalVectors,
    by_collection: collectionsData.collections.map((col) => ({
      name: col.name,
      count: col.vectors_count || 0,
    })),
  };
}

async function listArtistsAcrossDatabase(limit: number): Promise<{
  artists: string[];
  by_collection: Array<{ collection: string; artists: string[] }>;
}> {
  const collectionsData = await listCollections();
  const allArtists = new Set<string>();
  const byCollection: Array<{ collection: string; artists: string[] }> = [];

  // Collect artists from each collection
  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        const artistsData = await listUniqueArtists(
          collection.name,
          Math.min(limit, 20)
        );
        artistsData.artists.forEach((artist) => allArtists.add(artist));
        byCollection.push({
          collection: collection.name,
          artists: artistsData.artists,
        });
      }
    } catch (error) {
      console.warn(
        `Failed to get artists from collection ${collection.name}:`,
        error
      );
    }
  }

  return {
    artists: Array.from(allArtists).slice(0, limit),
    by_collection: byCollection,
  };
}
