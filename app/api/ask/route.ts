import { NextRequest, NextResponse } from "next/server";
import { processNaturalQuery } from "../../../lib/qdrant/nlp-query";
import { loadConfig } from "../../../lib/config";
import {
  NaturalQueryRequest,
  NaturalQueryResponse,
  AVAILABLE_MODELS,
  ConversationContext,
} from "../../../lib/types";
import { EmbeddingProvider, NaturalQuerySchema } from "../../../lib/schemas";
import {
  handleVectorDBError,
  generateCorrelationId,
} from "../../../lib/error-handler";
import { ValidationError, ConfigurationError } from "../../../lib/errors";
import { validateUserInput } from "../../../lib/validation";

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

    // Basic validation using our schemas for core fields
    const validatedCore = validateUserInput(
      {
        collection: body.collection,
        question: body.question,
        provider: body.provider,
      },
      NaturalQuerySchema.partial().extend({
        collection: NaturalQuerySchema.shape.collection.optional(),
      }),
      "request parameters"
    );

    const { question, collection, provider = "openai" } = validatedCore;

    // Extract additional fields with basic validation
    const model = typeof body.model === "string" ? body.model : undefined;
    const context: ConversationContext | undefined = body.context;

    const selectedModel = model || "gemini-2.0-flash";
    const modelInfo =
      AVAILABLE_MODELS[selectedModel as keyof typeof AVAILABLE_MODELS];
    const providerInfo = modelInfo?.provider || "gemini";

    const result = await processNaturalQuery(
      collection || null,
      question!,
      providerInfo,
      selectedModel,
      context as any // Type assertion to handle schema mismatch
    );

    const response: NaturalQueryResponse = {
      answer: result.answer,
      query_type: result.query_type,
      data: result.data,
      execution_time_ms: result.execution_time_ms,
      context: result.context,
    };

    // Add correlation ID to the response headers (not in body since interface doesn't include it)
    headers.set("X-Correlation-ID", correlationId);

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
