#!/usr/bin/env tsx

/**
 * Test script for the comprehensive error handling system
 *
 * Run with: npx tsx lib/test-error-handling.ts
 */

import {
  VectorDBError,
  QdrantConnectionError,
  EmbeddingGenerationError,
  CollectionNotFoundError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
} from "./errors";

import {
  handleVectorDBError,
  isRetryableError,
  getRetryDelay,
} from "./error-handler";

console.log("🔥 Testing Comprehensive Error Handling System\n");

// Test 1: Custom error creation and serialization
console.log("1. Testing custom error creation:");
try {
  throw new ValidationError(
    "email",
    "invalid-email",
    "Must be a valid email address"
  );
} catch (error) {
  const vdbError = error as VectorDBError;
  console.log("✅ Validation Error caught:", vdbError.message);
  console.log("   Code:", vdbError.code);
  console.log("   Status:", vdbError.statusCode);
  console.log("   Metadata:", vdbError.metadata);
}

// Test 2: Error hierarchy
console.log("\n2. Testing error hierarchy:");
const connectionError = new QdrantConnectionError(
  new Error("ECONNREFUSED"),
  "search operation",
  "http://localhost:6333"
);
console.log("✅ Connection Error created:", connectionError.message);
console.log("   Is VectorDBError?", connectionError instanceof VectorDBError);

// Test 3: Error handler with different error types
console.log("\n3. Testing centralized error handler:");

const testErrors = [
  new CollectionNotFoundError("my-collection"),
  new AuthenticationError("OpenAI", "embedding generation"),
  new RateLimitError("Gemini", 60),
  new Error("Unexpected error"), // Standard Error
  "Unknown error type", // String
];

testErrors.forEach((error, index) => {
  const handled = handleVectorDBError(error);
  console.log(`   Test ${index + 1}:`, {
    message: handled.message,
    code: handled.code,
    statusCode: handled.statusCode,
    hasCorrelationId: !!handled.correlationId,
  });
});

// Test 4: Retry logic
console.log("\n4. Testing retry logic:");
const retryableErrors = [
  new QdrantConnectionError(new Error("timeout"), "test"),
  new RateLimitError("OpenAI", 30),
  new ValidationError("field", "value", "requirement"), // Not retryable
];

retryableErrors.forEach((error, index) => {
  const isRetryable = isRetryableError(error);
  const delay = isRetryable ? getRetryDelay(error, 1) : 0;
  console.log(
    `   Error ${index + 1}: Retryable=${isRetryable}, Delay=${Math.round(
      delay
    )}ms`
  );
});

// Test 5: Error serialization
console.log("\n5. Testing error serialization:");
const embeddingError = new EmbeddingGenerationError(
  "openai",
  new Error("Rate limit exceeded"),
  "test text"
);
console.log("   JSON serialization:", JSON.stringify(embeddingError, null, 2));

console.log("\n✨ All error handling tests completed!\n");

console.log("📋 Error Code Reference:");
console.log("   - VALIDATION_ERROR (400): Invalid input data");
console.log("   - AUTHENTICATION_FAILED (401): Invalid API keys");
console.log("   - COLLECTION_NOT_FOUND (404): Collection does not exist");
console.log("   - RATE_LIMIT_EXCEEDED (429): API rate limit hit");
console.log("   - EMBEDDING_FAILED (502): Embedding generation failed");
console.log("   - QDRANT_CONNECTION_FAILED (503): Cannot connect to Qdrant");
console.log("   - SEARCH_FAILED (500): Search operation failed");
console.log("   - INTERNAL_ERROR (500): Unexpected system error");
