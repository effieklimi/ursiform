import { NextRequest, NextResponse } from "next/server";
import { processNaturalQuery } from "../../../lib/qdrant/nlp-query";
import { loadConfig } from "../../../lib/config";
import {
  NaturalQueryRequest,
  NaturalQueryResponse,
  AVAILABLE_MODELS,
  ConversationContext,
} from "../../../lib/types";
import { EmbeddingProvider } from "../../../lib/schemas";
import {
  handleVectorDBError,
  generateCorrelationId,
} from "../../../lib/error-handler";
import { ValidationError, ConfigurationError } from "../../../lib/errors";

export async function POST(req: NextRequest) {
  const correlationId = generateCorrelationId();

  // Enable CORS
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Correlation-ID": correlationId,
  });

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 200, headers });
  }

  try {
    // Load and validate configuration before processing
    try {
      loadConfig();
    } catch (error) {
      throw new ConfigurationError(
        "system configuration",
        error instanceof Error ? error.message : "Failed to load configuration"
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      throw new ValidationError(
        "request body",
        "invalid JSON",
        "Request body must be valid JSON"
      );
    }

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

    // Validate required fields
    if (!question) {
      throw new ValidationError(
        "question",
        question,
        "Question is required and cannot be empty"
      );
    }

    // Validate provider
    if (provider && !["openai", "gemini"].includes(provider)) {
      throw new ValidationError(
        "provider",
        provider,
        "Provider must be either 'openai' or 'gemini'"
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
      correlationId, // Add correlation ID to successful responses
    };

    return NextResponse.json(response, { status: 200, headers });
  } catch (error: any) {
    // Use the centralized error handler
    const errorResponse = handleVectorDBError(error, correlationId);

    // Log additional context for API requests
    console.error("API Request Error:", {
      correlationId,
      path: req.url,
      method: req.method,
      userAgent: req.headers.get("user-agent"),
      contentType: req.headers.get("content-type"),
    });

    return NextResponse.json(
      {
        error: errorResponse.message,
        code: errorResponse.code,
        correlationId: errorResponse.correlationId,
        metadata: errorResponse.metadata,
      },
      {
        status: errorResponse.statusCode,
        headers,
      }
    );
  }
}
