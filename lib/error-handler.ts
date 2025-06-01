import { VectorDBError } from "./errors";

export interface ErrorResponse {
  message: string;
  code: string;
  statusCode: number;
  metadata?: any;
  correlationId?: string;
}

export function generateCorrelationId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function handleVectorDBError(
  error: unknown,
  correlationId?: string
): ErrorResponse {
  const corrId = correlationId || generateCorrelationId();

  if (error instanceof VectorDBError) {
    // Log structured error with correlation ID for debugging
    console.error("VectorDB Error:", {
      correlationId: corrId,
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      metadata: error.metadata,
      stack: error.stack,
    });

    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      metadata: error.metadata,
      correlationId: corrId,
    };
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    console.error("Unexpected Error:", {
      correlationId: corrId,
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return {
      message: `Internal server error occurred. Reference: ${corrId}`,
      code: "INTERNAL_ERROR",
      statusCode: 500,
      correlationId: corrId,
    };
  }

  // Handle completely unknown error types
  console.error("Unknown Error Type:", {
    correlationId: corrId,
    error: String(error),
    type: typeof error,
  });

  return {
    message: `Unknown error occurred. Reference: ${corrId}`,
    code: "UNKNOWN_ERROR",
    statusCode: 500,
    correlationId: corrId,
  };
}

export function isRetryableError(error: VectorDBError): boolean {
  const retryableCodes = [
    "QDRANT_CONNECTION_FAILED",
    "OPERATION_TIMEOUT",
    "RATE_LIMIT_EXCEEDED",
  ];

  return retryableCodes.includes(error.code);
}

export function getRetryDelay(error: VectorDBError, attempt: number): number {
  if (error.code === "RATE_LIMIT_EXCEEDED" && error.metadata?.retryAfter) {
    return error.metadata.retryAfter * 1000; // Convert to milliseconds
  }

  // Exponential backoff with jitter
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 0.1 * delay; // 10% jitter

  return delay + jitter;
}

export function sanitizeErrorForLogging(error: any): any {
  if (!error) return error;

  // Create a copy to avoid mutating the original
  const sanitized = { ...error };

  // Remove sensitive fields that might accidentally be logged
  const sensitiveFields = ["apiKey", "password", "token", "authorization"];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeErrorForLogging(sanitized[key]);
    }
  }

  return sanitized;
}
