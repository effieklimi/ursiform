export abstract class VectorDBError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      metadata: this.metadata,
    };
  }
}

export class QdrantConnectionError extends VectorDBError {
  constructor(originalError: Error, operation?: string, url?: string) {
    const operationText = operation ? ` during ${operation}` : "";
    const urlText = url ? ` at ${url}` : "";
    super(
      `Failed to connect to Qdrant${urlText}${operationText}: ${originalError.message}`,
      "QDRANT_CONNECTION_FAILED",
      503,
      {
        url,
        operation,
        originalError: originalError.message,
        originalStack: originalError.stack,
      }
    );
  }
}

export class EmbeddingGenerationError extends VectorDBError {
  constructor(provider: string, originalError: Error, text?: string) {
    super(
      `Embedding generation failed with ${provider}: ${originalError.message}`,
      "EMBEDDING_FAILED",
      502,
      {
        provider,
        textLength: text?.length,
        originalError: originalError.message,
        originalStack: originalError.stack,
      }
    );
  }
}

export class CollectionNotFoundError extends VectorDBError {
  constructor(collection: string) {
    super(
      `Collection '${collection}' does not exist`,
      "COLLECTION_NOT_FOUND",
      404,
      { collection }
    );
  }
}

export class CollectionCreationError extends VectorDBError {
  constructor(collection: string, originalError: Error) {
    super(
      `Failed to create collection '${collection}': ${originalError.message}`,
      "COLLECTION_CREATION_FAILED",
      500,
      {
        collection,
        originalError: originalError.message,
        originalStack: originalError.stack,
      }
    );
  }
}

export class AuthenticationError extends VectorDBError {
  constructor(provider: string, operation?: string) {
    const operationText = operation ? ` for ${operation}` : "";
    super(
      `Authentication failed for ${provider}${operationText}. Please check your API key configuration.`,
      "AUTHENTICATION_FAILED",
      401,
      { provider, operation }
    );
  }
}

export class ConfigurationError extends VectorDBError {
  constructor(setting: string, details?: string) {
    super(
      `Configuration error for ${setting}${details ? `: ${details}` : ""}`,
      "CONFIGURATION_ERROR",
      500,
      { setting, details }
    );
  }
}

export class SearchOperationError extends VectorDBError {
  constructor(originalError: Error, query?: string, collection?: string) {
    super(
      `Search operation failed: ${originalError.message}`,
      "SEARCH_FAILED",
      500,
      {
        query: query?.substring(0, 100), // Truncate query for logging
        collection,
        originalError: originalError.message,
        originalStack: originalError.stack,
      }
    );
  }
}

export class QueryParsingError extends VectorDBError {
  constructor(query: string, originalError?: Error) {
    super(
      `Failed to parse natural language query: ${
        originalError?.message || "Invalid query format"
      }`,
      "QUERY_PARSING_FAILED",
      400,
      {
        query: query.substring(0, 100), // Truncate for logging
        originalError: originalError?.message,
      }
    );
  }
}

export class ProviderNotConfiguredError extends VectorDBError {
  constructor(provider: string, operation: string) {
    super(
      `Provider '${provider}' is not configured for ${operation}. Please set the required environment variables.`,
      "PROVIDER_NOT_CONFIGURED",
      503,
      { provider, operation }
    );
  }
}

export class ValidationError extends VectorDBError {
  constructor(field: string, value: any, requirement: string) {
    super(
      `Validation failed for ${field}: ${requirement}`,
      "VALIDATION_ERROR",
      400,
      { field, value: typeof value, requirement }
    );
  }
}

export class RateLimitError extends VectorDBError {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${provider}${
        retryAfter ? `. Retry after ${retryAfter} seconds` : ""
      }`,
      "RATE_LIMIT_EXCEEDED",
      429,
      { provider, retryAfter }
    );
  }
}

export class TimeoutError extends VectorDBError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      "OPERATION_TIMEOUT",
      408,
      { operation, timeoutMs }
    );
  }
}
