import { NextRequest, NextResponse } from "next/server";
import { processNaturalQuery } from "../../../lib/qdrant/nlp-query";
import {
  NaturalQueryRequest,
  NaturalQueryResponse,
  AVAILABLE_MODELS,
  ConversationContext,
} from "../../../lib/types";
import { EmbeddingProvider } from "../../../lib/schemas";

export async function POST(req: NextRequest) {
  // Enable CORS
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 200, headers });
  }

  try {
    const body = await req.json();
    const {
      question,
      collection,
      provider = "openai",
      model,
      context,
    }: {
      question: string;
      collection?: string;
      provider?: EmbeddingProvider;
      model?: string;
      context?: ConversationContext;
    } = body as NaturalQueryRequest;

    if (!question) {
      return NextResponse.json(
        { error: "Missing required field: question" },
        { status: 400, headers }
      );
    }

    const selectedModel = model || "gemini-2.0-flash";
    const modelInfo =
      AVAILABLE_MODELS[selectedModel as keyof typeof AVAILABLE_MODELS];
    const providerInfo = modelInfo?.provider || "gemini";

    const result = await processNaturalQuery(
      collection || null,
      question,
      providerInfo,
      selectedModel,
      context
    );

    const response: NaturalQueryResponse = {
      question,
      answer: result.answer,
      query_type: result.query_type,
      data: result.data,
      execution_time_ms: result.execution_time_ms,
      context: result.context,
    };

    return NextResponse.json(response, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500, headers }
    );
  }
}
