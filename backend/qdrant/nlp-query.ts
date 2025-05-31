import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { client } from "./db";
import { EmbeddingProvider } from "../schemas";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface QueryIntent {
  type: "count" | "search" | "list" | "filter" | "describe";
  target: string; // what to count/search/list
  filter?: any; // any filters to apply
  limit?: number;
}

export async function processNaturalQuery(
  collection: string,
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

    // Step 2: Execute the appropriate Qdrant operation
    const result = await executeQuery(collection, intent);

    // Step 3: Generate natural language response
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
    throw new Error("Failed to process natural language query");
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

  const systemPrompt = `You are a query analyzer for a vector database. Parse the user's question and return a JSON object with the query intent.

The database contains image data with these fields:
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

Return ONLY a JSON object in this format:
{
  "type": "count|search|list|filter|describe",
  "target": "what to count/search/list (e.g., 'artists', 'images', 'total')",
  "filter": {"field": "value"} or null,
  "limit": number or null
}

Examples:
- "How many artists?" → {"type": "count", "target": "artists", "filter": null, "limit": null}
- "Find Chris Dyer images" → {"type": "search", "target": "images", "filter": {"name": "Chris Dyer"}, "limit": 10}
- "List all artists" → {"type": "list", "target": "artists", "filter": null, "limit": null}`;

  try {
    let response: string;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ text: systemPrompt }, { text: `Question: "${question}"` }],
      });
      response = result.text || "{}";
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

  if (q.includes("how many") || q.includes("count")) {
    if (q.includes("artist")) return { type: "count", target: "artists" };
    return { type: "count", target: "total" };
  }

  if (q.includes("find") || q.includes("search")) {
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
      };
    }
    return { type: "search", target: "images", limit: 10 };
  }

  if (q.includes("list") || q.includes("show")) {
    if (q.includes("artist")) return { type: "list", target: "artists" };
    return { type: "list", target: "images", limit: 20 };
  }

  return { type: "describe", target: "collection" };
}

async function executeQuery(
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
      throw new Error(`Unknown query type: ${intent.type}`);
  }
}

async function countTotal(collection: string): Promise<{ count: number }> {
  const response = await client.count(collection, {});
  return { count: response.count };
}

async function countUniqueArtists(
  collection: string
): Promise<{ count: number; artists: string[] }> {
  // Get sample of images to count unique artists
  const response = await client.scroll(collection, {
    limit: 1000, // Adjust based on collection size
    with_payload: true,
    with_vector: false,
  });

  const artists = new Set(
    response.points.map((point: any) => point.payload?.name).filter(Boolean)
  );

  return {
    count: artists.size,
    artists: Array.from(artists).slice(0, 20), // Show first 20
  };
}

async function searchImages(
  collection: string,
  filter: any,
  limit: number
): Promise<any> {
  // For now, let's get all images and filter in memory to avoid index requirements
  const response = await client.scroll(collection, {
    limit: 1000, // Get more to filter from
    with_payload: true,
    with_vector: false,
  });

  let filteredPoints = response.points;

  // Apply filters in memory if provided
  if (filter) {
    filteredPoints = response.points.filter((point: any) => {
      return Object.entries(filter).every(([key, value]) => {
        return point.payload?.[key] === value;
      });
    });
  }

  // Limit results
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
  // Simple fallback responses
  const fallbackResponse = generateFallbackResponse(question, intent, data);

  // If no API keys, use fallback
  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    return fallbackResponse;
  }

  const systemPrompt = `You are a helpful assistant that explains database query results in natural language.
  
The user asked: "${question}"
The query type was: ${intent.type}
The data returned is: ${JSON.stringify(data, null, 2)}

Provide a concise, natural language response that directly answers the user's question. Be specific with numbers and names when available.`;

  try {
    let response: string;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
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
  switch (intent.type) {
    case "count":
      if (intent.target === "artists") {
        return `I found ${
          data.count
        } unique artists in the collection. Some of them include: ${data.artists
          ?.slice(0, 5)
          .join(", ")}.`;
      } else {
        return `The collection contains ${data.count} total images.`;
      }

    case "search":
    case "filter":
      return `I found ${data.count} images matching your criteria.`;

    case "list":
      if (intent.target === "artists") {
        return `Here are the artists in the collection: ${data.artists
          ?.slice(0, 10)
          .join(", ")}${data.artists?.length > 10 ? "..." : ""}.`;
      } else {
        return `I found ${data.count} items in the collection.`;
      }

    case "describe":
      return `This collection contains ${data.total_images} images from ${
        data.unique_artists
      } unique artists. Some featured artists include: ${data.sample_artists
        ?.slice(0, 5)
        .join(", ")}.`;

    default:
      return "I processed your query successfully.";
  }
}
