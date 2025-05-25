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
    | "database"
    | "summarize"
    | "analyze";
  target: string; // what to count/search/list
  filter?: any; // any filters to apply
  limit?: number;
  scope: "collection" | "database"; // new: scope of the query
  extractedCollection?: string; // new: collection name extracted from query text
}

export async function processNaturalQuery(
  collection: string | null, // Make collection optional
  question: string,
  provider: EmbeddingProvider = "openai",
  model?: string // Add specific model parameter
): Promise<{
  answer: string;
  query_type: string;
  data?: any;
  execution_time_ms: number;
}> {
  const startTime = Date.now();

  try {
    // Step 1: Understand the intent using LLM
    const intent = await parseQueryIntent(question, provider, model);

    // Step 2: Use extracted collection name if available and no explicit collection provided
    const finalCollection = collection || intent.extractedCollection || null;

    // Step 3: Execute the appropriate operation (database or collection level)
    const result = await executeQuery(finalCollection, intent);

    // Step 4: Generate natural language response
    const answer = await generateResponse(
      question,
      intent,
      result,
      provider,
      model
    );

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
  provider: EmbeddingProvider,
  model?: string
): Promise<QueryIntent> {
  // First try simple pattern matching as fallback
  const fallbackIntent = inferIntentFromQuestion(question);

  // If we don't have API keys, use fallback
  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    console.log("No API keys available, using pattern matching fallback");
    return fallbackIntent;
  }

  const systemPrompt = `You are an expert query analyzer for a vector database system containing image data with artist information. Parse the user's question and return a JSON object with the query intent.

The system contains multiple collections, each with image data with these fields:
- name (artist name)
- file_name (image filename)
- image_url (URL to image)
- url (style URL)

Available query types:
- "count": count items (e.g., "how many images by Chris Dyer")
- "search": find specific items (e.g., "find Chris Dyer images", "show me artwork by specific artist")
- "list": list unique values (e.g., "list all artists")
- "filter": filter by criteria (e.g., "images with .jpeg extension")
- "describe": get general info (e.g., "describe this collection")
- "summarize": provide detailed summary of specific subset (e.g., "summarize Chris Dyer's images")
- "analyze": analyze or categorize specific artist's work
- "collections": collection management (e.g., "what collections exist")
- "database": database-level queries (e.g., "describe the database")

Available scopes:
- "collection": query operates on a specific collection
- "database": query operates on the entire database

IMPORTANT: If the user asks about a specific artist's work, images, or style:
1. Set type to "search" or "summarize" (not just "describe")
2. Extract the artist name in the filter
3. Be specific about what they want to know

Return ONLY a JSON object in this format:
{
  "type": "count|search|list|filter|describe|summarize|analyze|collections|database",
  "target": "what to count/search/list (e.g., 'images', 'artists', 'collections')",
  "filter": {"field": "value"} or null,
  "limit": number or null,
  "scope": "collection|database",
  "extractedCollection": "collection_name_if_mentioned_in_query" or null
}

Examples:
- "How many images by Chris Dyer?" → {"type": "count", "target": "images", "filter": {"name": "Chris Dyer"}, "limit": null, "scope": "database", "extractedCollection": null}
- "Summarize Chris Dyer's images in midjourneysample" → {"type": "summarize", "target": "images", "filter": {"name": "Chris Dyer"}, "limit": 10, "scope": "collection", "extractedCollection": "midjourneysample"}
- "Give me a summary of the images by Chris Dyer" → {"type": "summarize", "target": "images", "filter": {"name": "Chris Dyer"}, "limit": 10, "scope": "database", "extractedCollection": null}
- "Find all Chris Dyer artwork" → {"type": "search", "target": "images", "filter": {"name": "Chris Dyer"}, "limit": 20, "scope": "database", "extractedCollection": null}
- "Show me Peter Paul Rubens images in midjourneysample" → {"type": "search", "target": "images", "filter": {"name": "Peter Paul Rubens"}, "limit": 10, "scope": "collection", "extractedCollection": "midjourneysample"}`;

  try {
    let response: string;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      const geminiModel = genAI.getGenerativeModel({
        model: model || "gemini-2.0-flash", // Use specific model parameter
      });
      const result = await geminiModel.generateContent([
        { text: systemPrompt },
        { text: `Question: "${question}"` },
      ]);
      response = result.response.text();
    } else if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const completion = await openai.chat.completions.create({
        model: model || "gpt-3.5-turbo", // Use specific model parameter
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

  // Check for artist-specific queries first - fixed regex with lookahead
  const artistMatch =
    question.match(
      /artist\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+(?:in|from|of|at|with|for)\b|$)/i
    ) ||
    question.match(
      /(?:by|from|of)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)(?=\s+(?:in|from|of|at|with|for)\b|$)/i
    );
  const artistName = artistMatch ? artistMatch[1].trim() : null;

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

  // Artist-specific queries (high priority)
  if (artistName) {
    const filter = { name: artistName };
    const scope = extractedCollection ? "collection" : "database";

    if (
      q.includes("summary") ||
      q.includes("summarize") ||
      (q.includes("give me") && q.includes("summary"))
    ) {
      return {
        type: "summarize",
        target: "images",
        filter,
        limit: 20,
        scope,
        ...(extractedCollection && { extractedCollection }),
      };
    }

    if (q.includes("how many") || q.includes("count")) {
      return {
        type: "count",
        target: "images",
        filter,
        scope,
        ...(extractedCollection && { extractedCollection }),
      };
    }

    if (q.includes("find") || q.includes("search") || q.includes("show")) {
      return {
        type: "search",
        target: "images",
        filter,
        limit: 10,
        scope,
        ...(extractedCollection && { extractedCollection }),
      };
    }

    if (q.includes("analyze") || q.includes("analysis")) {
      return {
        type: "analyze",
        target: "images",
        filter,
        limit: 50,
        scope,
        ...(extractedCollection && { extractedCollection }),
      };
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

    // Try to extract artist name (fallback pattern) - fixed with lookahead
    const fallbackArtistMatch = question.match(
      /(?:by|from|of)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)(?=\s+(?:in|from|of|at|with|for)\b|$)/i
    );
    if (fallbackArtistMatch) {
      return {
        type: "search",
        target: "images",
        filter: { name: fallbackArtistMatch[1] },
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
      if (intent.target === "images" && intent.filter) {
        return await countImagesByArtistAcrossDatabase(intent.filter);
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

    case "summarize":
      if (intent.filter) {
        return await summarizeArtistAcrossDatabase(
          intent.filter,
          intent.limit || 20
        );
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
      } else if (intent.target === "images" && intent.filter) {
        return await countImagesByArtist(collection, intent.filter);
      } else {
        return await countTotal(collection);
      }

    case "search":
      return await searchImages(collection, intent.filter, intent.limit || 10);

    case "summarize":
      return await summarizeArtistWork(
        collection,
        intent.filter,
        intent.limit || 20
      );

    case "analyze":
      return await analyzeArtistWork(
        collection,
        intent.filter,
        intent.limit || 50
      );

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
  provider: EmbeddingProvider,
  model?: string
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
      const geminiModel = genAI.getGenerativeModel({
        model: model || "gemini-2.0-flash", // Use specific model parameter
      });
      const result = await geminiModel.generateContent(systemPrompt);
      response = result.response.text();
    } else if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const completion = await openai.chat.completions.create({
        model: model || "gpt-3.5-turbo", // Use specific model parameter
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
        if (intent.target === "images" && intent.filter?.name) {
          return `I found ${data.count || 0} images by ${
            data.artist
          } across all collections. ${
            data.by_collection?.length > 0
              ? `Found in: ${data.by_collection
                  .map((c: any) => `${c.collection} (${c.count})`)
                  .join(", ")}.`
              : ""
          }`;
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
      case "summarize":
        if (intent.filter?.name) {
          return (
            `**Summary of ${data.artist}'s work across the database:**\n\n` +
            `• **Total Images**: ${data.total_images || 0}\n` +
            `• **Collections**: Found in ${
              data.collections_found || 0
            } collections\n` +
            `• **File Types**: ${
              data.file_types?.join(", ") || "Various"
            }\n\n` +
            `**Breakdown by collection:**\n${
              data.by_collection
                ?.map((c: any) => `• ${c.collection}: ${c.image_count} images`)
                .join("\n") || "No collections found"
            }\n\n` +
            `**Sample Images**: ${
              data.sample_images
                ?.slice(0, 3)
                .map((img: any) => `${img.filename} (${img.collection})`)
                .join(", ") || "None found"
            }`
          );
        }
        break;
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

  // Collection-level responses
  switch (intent.type) {
    case "count":
      if (intent.target === "artists") {
        return `I found ${
          data.count || 0
        } unique artists in the collection. Some of them include: ${
          data.artists?.slice(0, 5).join(", ") || "No artists found"
        }.`;
      } else if (intent.target === "images" && intent.filter?.name) {
        return `I found ${data.count || 0} images by ${
          data.artist
        } in this collection.${
          data.sample_images?.length > 0
            ? ` Sample files: ${data.sample_images
                .slice(0, 3)
                .map((img: any) => img.filename)
                .join(", ")}.`
            : ""
        }`;
      } else {
        return `The collection contains ${data.count || 0} total images.`;
      }

    case "search":
    case "filter":
      return `I found ${data.count || 0} images matching your criteria.`;

    case "summarize":
      if (intent.filter?.name) {
        return (
          `**Summary of ${data.artist}'s work in this collection:**\n\n` +
          `• **Total Images**: ${data.total_images || 0}\n` +
          `• **File Types**: ${data.file_types?.join(", ") || "Various"}\n` +
          `• **Sample Files**: ${
            data.sample_filenames?.slice(0, 5).join(", ") || "None"
          }\n\n` +
          `**Image Details:**\n${
            data.images
              ?.slice(0, 5)
              .map(
                (img: any, i: number) =>
                  `${i + 1}. ${img.filename || "Unknown file"}`
              )
              .join("\n") || "No images found"
          }`
        );
      }
      break;

    case "analyze":
      if (intent.filter?.name) {
        return (
          `**Analysis of ${data.artist}'s work patterns:**\n\n` +
          `• **Total Images**: ${data.total_images || 0}\n` +
          `• **File Types**: ${
            Object.entries(data.file_type_distribution || {})
              .map(([type, count]) => `${type} (${count})`)
              .join(", ") || "Various"
          }\n` +
          `• **Common Patterns**: ${
            Object.entries(data.common_naming_patterns || {})
              .slice(0, 3)
              .map(([pattern, count]) => `"${pattern}" (${count} files)`)
              .join(", ") || "No patterns found"
          }\n` +
          `• **Source Domains**: ${
            Object.keys(data.source_domains || {}).join(", ") || "Various"
          }`
        );
      }
      break;

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

  return "I processed your query successfully.";
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

// New function to count images by specific artist
async function countImagesByArtist(
  collection: string,
  filter: any
): Promise<{ count: number; artist: string; sample_images: any[] }> {
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

  return {
    count: filteredPoints.length,
    artist: filter?.name || "unknown",
    sample_images: filteredPoints.slice(0, 5).map((point: any) => ({
      id: point.id,
      filename: point.payload?.file_name,
      url: point.payload?.image_url,
    })),
  };
}

// New function to provide detailed summary of artist's work
async function summarizeArtistWork(
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

  // Analyze file types and patterns
  const fileExtensions = new Set<string>();
  const fileNames: string[] = [];
  const imageUrls: string[] = [];

  limitedPoints.forEach((point: any) => {
    if (point.payload?.file_name) {
      const ext = point.payload.file_name.split(".").pop()?.toLowerCase();
      if (ext) fileExtensions.add(ext);
      fileNames.push(point.payload.file_name);
    }
    if (point.payload?.image_url) {
      imageUrls.push(point.payload.image_url);
    }
  });

  return {
    artist: filter?.name || "unknown",
    total_images: filteredPoints.length,
    displayed_images: limitedPoints.length,
    file_types: Array.from(fileExtensions),
    sample_filenames: fileNames.slice(0, 8),
    sample_urls: imageUrls.slice(0, 5),
    images: limitedPoints.map((point: any) => ({
      id: point.id,
      filename: point.payload?.file_name,
      image_url: point.payload?.image_url,
      style_url: point.payload?.url,
    })),
  };
}

// New function to analyze artist's work patterns
async function analyzeArtistWork(
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

  // Analyze patterns in the artist's work
  const fileTypes = new Map();
  const namingPatterns = new Map();
  const urlPatterns = new Map();

  filteredPoints.forEach((point: any) => {
    // File type analysis
    if (point.payload?.file_name) {
      const ext = point.payload.file_name.split(".").pop()?.toLowerCase();
      if (ext) {
        fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
      }

      // Naming pattern analysis
      const namePattern = point.payload.file_name
        .replace(/\d+/g, "#")
        .replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
      namingPatterns.set(
        namePattern,
        (namingPatterns.get(namePattern) || 0) + 1
      );
    }

    // URL pattern analysis
    if (point.payload?.url) {
      const domain = point.payload.url.split("/")[2];
      if (domain) {
        urlPatterns.set(domain, (urlPatterns.get(domain) || 0) + 1);
      }
    }
  });

  return {
    artist: filter?.name || "unknown",
    total_images: filteredPoints.length,
    file_type_distribution: Object.fromEntries(fileTypes),
    common_naming_patterns: Object.fromEntries(
      Array.from(namingPatterns.entries())
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    ),
    source_domains: Object.fromEntries(urlPatterns),
    sample_images: filteredPoints.slice(0, 10).map((point: any) => ({
      id: point.id,
      filename: point.payload?.file_name,
      image_url: point.payload?.image_url,
    })),
  };
}

// New function to count specific artist images across all collections
async function countImagesByArtistAcrossDatabase(filter: any): Promise<{
  count: number;
  artist: string;
  by_collection: Array<{ collection: string; count: number }>;
}> {
  const collectionsData = await listCollections();
  const resultsByCollection: Array<{ collection: string; count: number }> = [];
  let totalCount = 0;

  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        const result = await countImagesByArtist(collection.name, filter);
        if (result.count > 0) {
          resultsByCollection.push({
            collection: collection.name,
            count: result.count,
          });
          totalCount += result.count;
        }
      }
    } catch (error) {
      console.warn(
        `Failed to count images in collection ${collection.name}:`,
        error
      );
    }
  }

  return {
    count: totalCount,
    artist: filter?.name || "unknown",
    by_collection: resultsByCollection,
  };
}

// New function to summarize artist work across all collections
async function summarizeArtistAcrossDatabase(
  filter: any,
  limit: number
): Promise<any> {
  const collectionsData = await listCollections();
  const allImages: any[] = [];
  const collectionSummaries: any[] = [];
  const fileTypes = new Set<string>();

  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        const summary = await summarizeArtistWork(collection.name, filter, 50);
        if (summary.total_images > 0) {
          collectionSummaries.push({
            collection: collection.name,
            ...summary,
          });
          allImages.push(...summary.images);
          summary.file_types?.forEach((type: string) => fileTypes.add(type));
        }
      }
    } catch (error) {
      console.warn(
        `Failed to summarize artist work in collection ${collection.name}:`,
        error
      );
    }
  }

  const totalImages = allImages.length;
  const displayedImages = allImages.slice(0, limit);

  return {
    artist: filter?.name || "unknown",
    total_images: totalImages,
    displayed_images: displayedImages.length,
    collections_found: collectionSummaries.length,
    file_types: Array.from(fileTypes),
    by_collection: collectionSummaries.map((summary) => ({
      collection: summary.collection,
      image_count: summary.total_images,
      sample_filenames: summary.sample_filenames?.slice(0, 3),
    })),
    sample_images: displayedImages.map((image: any) => ({
      id: image.id,
      filename: image.filename,
      image_url: image.image_url,
      collection: collectionSummaries.find((c) =>
        c.images?.some((img: any) => img.id === image.id)
      )?.collection,
    })),
  };
}
