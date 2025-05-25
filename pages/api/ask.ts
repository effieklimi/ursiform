import type { NextApiRequest, NextApiResponse } from "next";
import { processNaturalQuery } from "../../lib/qdrant/nlp-query";
import { NaturalQueryRequest, NaturalQueryResponse } from "../../lib/types";

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
    const { collection, question, provider } = req.body as NaturalQueryRequest;

    if (!collection || !question) {
      res.status(400).json({
        error: "Missing required fields: collection and question",
      });
      return;
    }

    console.log(
      `Processing natural language query: "${question}" for collection: ${collection}`
    );

    const result = await processNaturalQuery(
      collection,
      question,
      provider || "openai"
    );

    // Transform the result to match NaturalQueryResponse interface
    const response: NaturalQueryResponse = {
      question,
      answer: result.answer,
      query_type: result.query_type,
      data: result.data,
      execution_time_ms: result.execution_time_ms,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error processing natural language query:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
