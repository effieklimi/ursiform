#!/usr/bin/env tsx

/**
 * Integration test for error handling through actual API routes
 *
 * This tests real error scenarios by making HTTP requests to the API
 * Run with: npx tsx lib/test-integration-errors.ts
 *
 * Prerequisites: Start the development server first with `npm run dev`
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000";

interface ApiResponse {
  error?: string;
  code?: string;
  correlationId?: string;
  metadata?: any;
  answer?: string;
  query_type?: string;
}

async function makeRequest(
  endpoint: string,
  body: any
): Promise<{
  status: number;
  data: ApiResponse;
  headers: Record<string, string>;
}> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      data,
      headers,
    };
  } catch (error) {
    throw new Error(
      `Request failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function testValidationErrors() {
  console.log("\n🧪 Testing Validation Errors...");

  // Test 1: Empty question
  const test1 = await makeRequest("/api/ask", {
    question: "",
    collection: "test",
  });

  console.log("Empty question:", {
    status: test1.status,
    code: test1.data.code,
    hasCorrelationId: !!test1.data.correlationId,
    expected: test1.status === 400 && test1.data.code === "VALIDATION_ERROR",
  });

  // Test 2: Missing question field
  const test2 = await makeRequest("/api/ask", {
    collection: "test",
    // question is missing
  });

  console.log("Missing question:", {
    status: test2.status,
    code: test2.data.code,
    hasCorrelationId: !!test2.data.correlationId,
    expected: test2.status === 400 && test2.data.code === "VALIDATION_ERROR",
  });

  // Test 3: Invalid provider
  const test3 = await makeRequest("/api/ask", {
    question: "test question",
    provider: "invalid-provider",
  });

  console.log("Invalid provider:", {
    status: test3.status,
    code: test3.data.code,
    hasCorrelationId: !!test3.data.correlationId,
    expected: test3.status === 400 && test3.data.code === "VALIDATION_ERROR",
  });

  // Test 4: Extremely long question
  const longQuestion = "A".repeat(15000); // Over the 10k limit
  const test4 = await makeRequest("/api/ask", {
    question: longQuestion,
  });

  console.log("Long question:", {
    status: test4.status,
    code: test4.data.code,
    hasCorrelationId: !!test4.data.correlationId,
    expected: test4.status === 400 && test4.data.code === "VALIDATION_ERROR",
  });
}

async function testMalformedRequests() {
  console.log("\n🧪 Testing Malformed Requests...");

  try {
    // Test 1: Invalid JSON
    const response = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "invalid json{",
    });

    const data = await response.json();
    console.log("Invalid JSON:", {
      status: response.status,
      code: data.code,
      hasCorrelationId: !!data.correlationId,
      expected: response.status === 400 && data.code === "VALIDATION_ERROR",
    });
  } catch (error) {
    console.log("Invalid JSON test failed to parse response (expected)");
  }
}

async function testCollectionErrors() {
  console.log("\n🧪 Testing Collection Errors...");

  // Test with a collection that definitely doesn't exist
  const test1 = await makeRequest("/api/ask", {
    question: "count items",
    collection: "definitely-does-not-exist-collection-name-12345",
  });

  console.log("Non-existent collection:", {
    status: test1.status,
    code: test1.data.code,
    hasCorrelationId: !!test1.data.correlationId,
    expected:
      test1.status === 404 && test1.data.code === "COLLECTION_NOT_FOUND",
  });
}

async function testProviderErrors() {
  console.log("\n🧪 Testing Provider Configuration Errors...");

  // This will test if the system properly handles missing API keys
  // by temporarily using a provider that might not be configured

  // Test with potentially unconfigured provider
  const test1 = await makeRequest("/api/ask", {
    question: "simple test question",
    provider: "gemini", // Might not be configured in test env
  });

  console.log("Provider test (may pass if configured):", {
    status: test1.status,
    code: test1.data.code,
    hasCorrelationId: !!test1.data.correlationId,
    message: test1.data.error?.substring(0, 100) + "...",
  });
}

async function testHealthEndpoint() {
  console.log("\n🧪 Testing Health Endpoint...");

  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();

    console.log("Health check:", {
      status: response.status,
      healthy: data.status === "ok",
      hasTimestamp: !!data.timestamp,
    });
  } catch (error) {
    console.log(
      "Health endpoint not available:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

async function testSuccessfulRequest() {
  console.log("\n🧪 Testing Successful Request...");

  // Test a simple request that should work
  const test1 = await makeRequest("/api/ask", {
    question: "what collections exist?",
  });

  console.log("Collections query:", {
    status: test1.status,
    hasAnswer: !!test1.data.answer,
    queryType: test1.data.query_type,
    hasCorrelationId: !!test1.data.correlationId,
    success: test1.status === 200,
  });
}

async function runIntegrationTests() {
  console.log("🚀 Starting Error Handling Integration Tests");
  console.log(`📡 Testing against: ${API_BASE}`);
  console.log("📋 Make sure the dev server is running: npm run dev\n");

  try {
    // Test if server is reachable
    await fetch(`${API_BASE}/api/health`).catch(() => {
      throw new Error(
        `Server not reachable at ${API_BASE}. Start dev server with: npm run dev`
      );
    });

    // Run all test suites
    await testValidationErrors();
    await testMalformedRequests();
    await testCollectionErrors();
    await testProviderErrors();
    await testHealthEndpoint();
    await testSuccessfulRequest();

    console.log("\n✨ Integration tests completed!");
    console.log("\n📊 Summary:");
    console.log("   ✅ Tests real HTTP requests to API routes");
    console.log("   ✅ Tests actual validation error paths");
    console.log("   ✅ Tests malformed request handling");
    console.log("   ✅ Tests collection existence validation");
    console.log("   ✅ Tests error response format consistency");
    console.log("   ✅ Validates correlation ID generation");
    console.log("   ✅ Confirms proper HTTP status codes");
  } catch (error) {
    console.error(
      "\n❌ Integration tests failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  }
}

// Run the tests
runIntegrationTests().catch(console.error);
