import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Check API key availability and test them
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // API Key testing results
  let openaiStatus = "missing"; // missing, testing, working, failed
  let geminiStatus = "missing"; // missing, testing, working, failed
  let openaiError = null;
  let geminiError = null;

  // Test OpenAI API Key
  if (openaiApiKey) {
    openaiStatus = "testing";
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        openaiStatus = "working";
      } else {
        openaiStatus = "failed";
        const responseText = await response.text();

        try {
          const errorData = JSON.parse(responseText);
          // Extract the specific error message from OpenAI
          if (errorData.error && errorData.error.message) {
            openaiError = errorData.error.message;
          } else {
            openaiError = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch {
          // If we can't parse the JSON, use the raw response
          openaiError = `HTTP ${response.status}: ${response.statusText} - ${responseText}`;
        }
      }
    } catch (error) {
      openaiStatus = "failed";
      if (error instanceof Error) {
        openaiError = `${error.name}: ${error.message}`;
      } else {
        openaiError = "Unknown error testing OpenAI API";
      }
    }
  } else {
    // Only set to missing if there's literally no API key at all
    openaiStatus = "missing";
  }

  // Test Gemini API Key
  if (geminiApiKey) {
    geminiStatus = "testing";
    try {
      // Test Gemini API with a simple request to list models
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (response.ok) {
        geminiStatus = "working";
      } else {
        geminiStatus = "failed";
        const errorText = await response
          .text()
          .catch(() => "Unable to read response");

        try {
          const errorData = JSON.parse(errorText);
          // Extract the specific error message from Google
          if (errorData.error && errorData.error.message) {
            geminiError = errorData.error.message;
          } else {
            geminiError = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch {
          // If we can't parse the JSON, use the raw response
          geminiError = `HTTP ${response.status}: ${response.statusText} - ${errorText}`;
        }
      }
    } catch (error) {
      geminiStatus = "failed";
      if (error instanceof Error) {
        geminiError = `${error.name}: ${error.message}`;
      } else {
        geminiError = "Unknown error testing Gemini API";
      }
    }
  } else {
    // Only set to missing if there's literally no API key at all
    geminiStatus = "missing";
  }

  // Check database configuration
  const qdrantUrl = process.env.QDRANT_URL || "localhost:6333";
  const qdrantApiKey = process.env.QDRANT_API_KEY;

  let databaseConnected = false;
  let databaseError = null;

  // Check for placeholder values
  const hasPlaceholderUrl =
    qdrantUrl.includes("your-cluster-url") || qdrantUrl.includes("<your-");
  const hasPlaceholderApiKey =
    qdrantApiKey?.includes("<your-") ||
    qdrantApiKey?.includes("your-qdrant-api-key");

  if (hasPlaceholderUrl || hasPlaceholderApiKey) {
    databaseConnected = false;
    databaseError =
      "Configuration contains placeholder values. Please update your .env file with actual Qdrant credentials.";
  } else {
    try {
      // Test Qdrant connection
      let baseUrl = qdrantUrl;

      // Handle different URL formats
      if (
        !qdrantUrl.startsWith("http://") &&
        !qdrantUrl.startsWith("https://")
      ) {
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
        // Use the correct authorization header format for Qdrant Cloud
        headers["Authorization"] = `Bearer ${qdrantApiKey}`;
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
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),

    // API Key Status with detailed testing results
    openai_status: openaiStatus,
    openai_error: openaiError,
    gemini_status: geminiStatus,
    gemini_error: geminiError,

    // Legacy compatibility (deprecated but keeping for now)
    openai_available: openaiStatus === "working",
    gemini_available: geminiStatus === "working",

    // Database Status
    database_connected: databaseConnected,
    database_url: qdrantUrl,
    database_api_key: !!qdrantApiKey && !hasPlaceholderApiKey,
    database_error: databaseError,

    // Configuration diagnostics
    diagnostics: {
      has_placeholder_url: hasPlaceholderUrl,
      has_placeholder_api_key: hasPlaceholderApiKey,
      is_local_setup:
        qdrantUrl.includes("localhost") || qdrantUrl.includes("127.0.0.1"),
    },

    // Environment info (for debugging)
    environment: process.env.NODE_ENV,
  });
}
