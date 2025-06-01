# Comprehensive Error Handling System

This document describes the comprehensive error handling system implemented for the vector database operations.

## Overview

The error handling system provides:

- **Specific error types** for different failure scenarios
- **Proper HTTP status codes** for API responses
- **Correlation IDs** for debugging and tracking
- **Actionable error messages** with context
- **Retry logic** for transient failures
- **Centralized error processing**

## Error Classes

### Base Error Class

```typescript
abstract class VectorDBError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly metadata?: Record<string, any>
  );
}
```

All custom errors inherit from `VectorDBError` and include:

- Human-readable error message
- Machine-readable error code
- Appropriate HTTP status code
- Additional metadata for debugging

### Error Types

| Error Class                | Status Code | Description              | Retryable |
| -------------------------- | ----------- | ------------------------ | --------- |
| `ValidationError`          | 400         | Invalid input data       | ❌        |
| `AuthenticationError`      | 401         | Invalid API keys         | ❌        |
| `CollectionNotFoundError`  | 404         | Collection doesn't exist | ❌        |
| `TimeoutError`             | 408         | Operation timed out      | ✅        |
| `RateLimitError`           | 429         | API rate limit exceeded  | ✅        |
| `EmbeddingGenerationError` | 502         | Embedding service failed | ❌        |
| `QdrantConnectionError`    | 503         | Cannot connect to Qdrant | ✅        |
| `SearchOperationError`     | 500         | Search operation failed  | ❌        |
| `QueryParsingError`        | 400         | Failed to parse query    | ❌        |
| `ConfigurationError`       | 500         | System misconfiguration  | ❌        |

## Usage Examples

### Throwing Specific Errors

```typescript
import { ValidationError, CollectionNotFoundError } from "./lib/errors";

// Validate input
if (!query || query.trim().length === 0) {
  throw new ValidationError("query", query, "Query cannot be empty");
}

// Handle missing collection
if (!collectionExists) {
  throw new CollectionNotFoundError("my-collection");
}
```

### Catching and Handling Errors

```typescript
import { handleVectorDBError } from "./lib/error-handler";

try {
  const result = await vectorOperation();
} catch (error) {
  const errorResponse = handleVectorDBError(error);

  return Response.json(
    {
      error: errorResponse.message,
      code: errorResponse.code,
      correlationId: errorResponse.correlationId,
    },
    { status: errorResponse.statusCode }
  );
}
```

### Retry Logic

```typescript
import { isRetryableError, getRetryDelay } from "./lib/error-handler";

async function operationWithRetry(maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await vectorOperation();
    } catch (error) {
      if (error instanceof VectorDBError && isRetryableError(error)) {
        if (attempt < maxAttempts - 1) {
          const delay = getRetryDelay(error, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }
}
```

## Error Response Format

### API Error Response

```json
{
  "error": "Collection 'my-collection' does not exist",
  "code": "COLLECTION_NOT_FOUND",
  "correlationId": "err_1703123456789_abc123def",
  "metadata": {
    "collection": "my-collection"
  }
}
```

### Success Response with Correlation ID

```json
{
  "answer": "Found 42 items...",
  "query_type": "search",
  "execution_time_ms": 234,
  "correlationId": "req_1703123456789_xyz789abc"
}
```

## Error Codes Reference

### Client Errors (4xx)

- `VALIDATION_ERROR` (400): Invalid input parameters
- `AUTHENTICATION_FAILED` (401): Invalid API credentials
- `COLLECTION_NOT_FOUND` (404): Requested collection doesn't exist
- `OPERATION_TIMEOUT` (408): Request timed out
- `RATE_LIMIT_EXCEEDED` (429): API rate limit exceeded

### Server Errors (5xx)

- `SEARCH_FAILED` (500): Search operation failed
- `CONFIGURATION_ERROR` (500): System configuration issue
- `EMBEDDING_FAILED` (502): External embedding service failed
- `QDRANT_CONNECTION_FAILED` (503): Cannot connect to Qdrant database
- `PROVIDER_NOT_CONFIGURED` (503): Required service not configured

## Debugging with Correlation IDs

Every error includes a unique correlation ID for tracking:

```
err_1703123456789_abc123def
```

Format: `err_{timestamp}_{random}`

Use correlation IDs to:

- Track specific request failures
- Correlate frontend and backend logs
- Debug issues across service boundaries

## Configuration

Set environment variables for proper error context:

```bash
# Required for database operations
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key

# Required for embedding generation
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
```

## Testing

Run the error handling test suite:

```bash
npx tsx lib/test-error-handling.ts
```

This validates:

- Error creation and inheritance
- Centralized error handling
- Retry logic
- Error serialization

## Best Practices

### 1. Use Specific Error Types

```typescript
// ❌ Generic error
throw new Error("Something went wrong");

// ✅ Specific error with context
throw new CollectionNotFoundError("user-data");
```

### 2. Include Relevant Metadata

```typescript
// ❌ No context
throw new ValidationError("field", value, "Invalid");

// ✅ Helpful context
throw new ValidationError(
  "email",
  userInput,
  "Must be a valid email address (user@domain.com)"
);
```

### 3. Handle Errors at the Right Level

```typescript
// ❌ Catch and swallow everywhere
try {
  await operation();
} catch (error) {
  console.log("Error occurred");
  return null;
}

// ✅ Let specific errors bubble up, handle at API boundary
try {
  return await operation();
} catch (error) {
  if (error instanceof VectorDBError) {
    throw error; // Re-throw for proper handling
  }
  throw new SearchOperationError(error, query, collection);
}
```

### 4. Log Structured Error Information

```typescript
console.error("Vector Operation Failed:", {
  correlationId: error.correlationId,
  errorCode: error.code,
  operation: "search",
  collection: "user-data",
  query: query.substring(0, 100), // Truncate for logs
  metadata: error.metadata,
});
```

## Migration from Generic Errors

### Before

```typescript
try {
  await vectorSearch(query);
} catch (error) {
  console.error("Error:", error);
  throw new Error("Failed to perform search");
}
```

### After

```typescript
try {
  return await vectorSearch(query);
} catch (error) {
  if (error instanceof VectorDBError) {
    throw error; // Preserve specific error
  }
  throw new SearchOperationError(error, query, collection);
}
```

This system ensures every error provides actionable information while maintaining proper HTTP semantics and debugging capabilities.
