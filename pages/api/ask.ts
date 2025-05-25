import type { NextApiRequest, NextApiResponse } from "next";
import { processNaturalQuery } from "../../lib/qdrant/nlp-query";
import {
  NaturalQueryRequest,
  NaturalQueryResponse,
  AVAILABLE_MODELS,
  ConversationContext,
} from "../../lib/types";
import { EmbeddingProvider } from "../../lib/schemas";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NaturalQueryResponse | { error: string }>
) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  try {
    const {
      question,
      collection,
      provider = "openai",
      model,
      context, // Add conversation context parameter
    }: {
      question: string;
      collection?: string;
      provider?: EmbeddingProvider;
      model?: string;
      context?: ConversationContext; // Add context type
    } = req.body as NaturalQueryRequest;

    if (!question) {
      res.status(400).json({
        error: "Missing required field: question",
      });
      return;
    }

    // Determine provider from model, default to gemini-2.0-flash
    const selectedModel = model || "gemini-2.0-flash";
    const modelInfo =
      AVAILABLE_MODELS[selectedModel as keyof typeof AVAILABLE_MODELS];
    const providerInfo = modelInfo?.provider || "gemini";

    console.log(
      `Processing natural language query: "${question}" for collection: ${
        collection || "database-level"
      } using model: ${selectedModel}`
    );

    const result = await processNaturalQuery(
      collection || null,
      question,
      providerInfo,
      selectedModel,
      context // Pass context to processing function
    );

    // Transform the result to match NaturalQueryResponse interface
    const response: NaturalQueryResponse = {
      question,
      answer: result.answer,
      query_type: result.query_type,
      data: result.data,
      execution_time_ms: result.execution_time_ms,
      context: result.context, // Return updated conversation context
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error processing natural language query:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
