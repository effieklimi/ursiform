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
    let baseUrl = qdrantUrl;

    // Handle different URL formats
    if (!qdrantUrl.startsWith("http://") && !qdrantUrl.startsWith("https://")) {
      // If no protocol specified, determine based on the URL
      const protocol =
        qdrantUrl.includes("localhost") || qdrantUrl.includes("127.0.0.1")
          ? "http"
          : "https";
      baseUrl = `${protocol}://${qdrantUrl}`;
    }

    // Remove any trailing port if it's already in a full URL for cloud instances
    if (baseUrl.includes(".cloud.qdrant.io:6333")) {
      baseUrl = baseUrl.replace(":6333", "");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (qdrantApiKey) {
      headers["api-key"] = qdrantApiKey;
    }

    console.log(`Testing Qdrant connection to: ${baseUrl}/collections`);
    console.log(`Headers:`, Object.keys(headers));

    const response = await fetch(`${baseUrl}/collections`, {
      method: "GET",
      headers,
      // Add timeout
      signal: AbortSignal.timeout(10000), // Increased timeout for cloud instances
    });

    databaseConnected = response.ok;
    if (!response.ok) {
      const responseText = await response
        .text()
        .catch(() => "Unable to read response");
      databaseError = `HTTP ${response.status}: ${response.statusText} - ${responseText}`;
      console.error(`Qdrant connection failed: ${databaseError}`);
    } else {
      console.log("Qdrant connection successful");
    }
  } catch (error) {
    databaseConnected = false;
    if (error instanceof Error) {
      databaseError = `${error.name}: ${error.message}`;
      console.error(`Qdrant connection error:`, error);
    } else {
      databaseError = "Unknown connection error";
      console.error(`Qdrant connection error:`, error);
    }
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
