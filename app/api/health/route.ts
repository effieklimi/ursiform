import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Check API key availability
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // Check database configuration
  const qdrantUrl = process.env.QDRANT_URL || "localhost:6333";
  const qdrantApiKey = process.env.QDRANT_API_KEY;

  let databaseConnected = false;
  let databaseError = null;

  try {
    // Test Qdrant connection
    const protocol = qdrantUrl.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${qdrantUrl}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (qdrantApiKey) {
      headers["api-key"] = qdrantApiKey;
    }

    const response = await fetch(`${baseUrl}/collections`, {
      method: "GET",
      headers,
      // Add timeout
      signal: AbortSignal.timeout(5000),
    });

    databaseConnected = response.ok;
    if (!response.ok) {
      databaseError = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    databaseConnected = false;
    databaseError =
      error instanceof Error ? error.message : "Connection failed";
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),

    // API Key Status
    openai_available: !!openaiApiKey,
    gemini_available: !!geminiApiKey,

    // Database Status
    database_connected: databaseConnected,
    database_url: qdrantUrl,
    database_api_key: !!qdrantApiKey,
    database_error: databaseError,

    // Environment info (for debugging)
    environment: process.env.NODE_ENV,
  });
}
