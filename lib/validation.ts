import { z } from "zod";
import {
  VectorPayloadSchema,
  VectorPayload,
  FilterConditionSchema,
  FilterCondition,
  SearchQuerySchema,
  SearchQuery,
  ConversationContextSchema,
  ConversationContext,
  QueryIntentSchema,
  QueryIntent,
  QueryResultSchema,
  QueryResult,
  NaturalQuerySchema,
  NaturalQueryRequest,
  CollectionInfoSchema,
  CollectionInfo,
  VectorSearchResultSchema,
  VectorSearchResult,
} from "./schemas";

// === CUSTOM VALIDATION ERROR CLASS ===
export class ValidationError extends Error {
  public readonly statusCode: number;
  public readonly errors: Array<{
    path: (string | number)[];
    message: string;
    code: string;
  }>;

  constructor(message: string, zodError?: z.ZodError, statusCode = 400) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;

    if (zodError) {
      this.errors = zodError.errors.map((err) => ({
        path: err.path,
        message: err.message,
        code: err.code,
      }));
    } else {
      this.errors = [];
    }
  }
}

// === PAYLOAD VALIDATION ===
export function validatePayload(payload: unknown): VectorPayload {
  const result = VectorPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new ValidationError("Invalid vector payload structure", result.error);
  }
  return result.data;
}

export function validatePayloadArray(payloads: unknown[]): VectorPayload[] {
  return payloads.map((payload, index) => {
    try {
      return validatePayload(payload);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Invalid payload at index ${index}: ${error.message}`,
          undefined,
          400
        );
      }
      throw error;
    }
  });
}

// === FILTER VALIDATION ===
export function validateSearchFilters(filters: unknown): FilterCondition[] {
  if (!filters) return [];

  const result = z.array(FilterConditionSchema).safeParse(filters);
  if (!result.success) {
    throw new ValidationError("Invalid search filters structure", result.error);
  }
  return result.data;
}

export function validateSingleFilter(filter: unknown): FilterCondition {
  const result = FilterConditionSchema.safeParse(filter);
  if (!result.success) {
    throw new ValidationError("Invalid filter condition", result.error);
  }
  return result.data;
}

// === SEARCH QUERY VALIDATION ===
export function validateSearchQuery(query: unknown): SearchQuery {
  const result = SearchQuerySchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Invalid search query structure", result.error);
  }
  return result.data;
}

// === CONVERSATION CONTEXT VALIDATION ===
export function validateConversationContext(
  context: unknown
): ConversationContext {
  const result = ConversationContextSchema.safeParse(context);
  if (!result.success) {
    throw new ValidationError(
      "Invalid conversation context structure",
      result.error
    );
  }
  return result.data;
}

// === QUERY INTENT VALIDATION ===
export function validateQueryIntent(intent: unknown): QueryIntent {
  const result = QueryIntentSchema.safeParse(intent);
  if (!result.success) {
    throw new ValidationError("Invalid query intent structure", result.error);
  }
  return result.data;
}

// === QUERY RESULT VALIDATION ===
export function validateQueryResult(result: unknown): QueryResult {
  const parseResult = QueryResultSchema.safeParse(result);
  if (!parseResult.success) {
    throw new ValidationError(
      "Invalid query result structure",
      parseResult.error
    );
  }
  return parseResult.data;
}

// === NATURAL LANGUAGE QUERY VALIDATION ===
export function validateNaturalQueryRequest(
  request: unknown
): NaturalQueryRequest {
  const result = NaturalQuerySchema.safeParse(request);
  if (!result.success) {
    throw new ValidationError(
      "Invalid natural language query request",
      result.error
    );
  }
  return result.data;
}

// === COLLECTION VALIDATION ===
export function validateCollectionInfo(info: unknown): CollectionInfo {
  const result = CollectionInfoSchema.safeParse(info);
  if (!result.success) {
    throw new ValidationError(
      "Invalid collection info structure",
      result.error
    );
  }
  return result.data;
}

// === TYPE GUARDS FOR EXTERNAL DATA ===

// For Qdrant responses
export function isValidQdrantPoint(point: unknown): point is {
  id: string | number;
  payload?: Record<string, unknown>;
  vector?: number[];
} {
  return (
    typeof point === "object" &&
    point !== null &&
    "id" in point &&
    (typeof (point as any).id === "string" ||
      typeof (point as any).id === "number")
  );
}

// For LLM responses
export function isValidLLMResponse(response: unknown): response is string {
  return typeof response === "string" && response.trim().length > 0;
}

// For search results
export function isValidSearchResult(
  result: unknown
): result is VectorSearchResult {
  const parseResult = VectorSearchResultSchema.safeParse(result);
  return parseResult.success;
}

// For arrays of search results
export function validateSearchResults(
  results: unknown[]
): VectorSearchResult[] {
  return results.map((result, index) => {
    const parseResult = VectorSearchResultSchema.safeParse(result);
    if (!parseResult.success) {
      throw new ValidationError(
        `Invalid search result at index ${index}`,
        parseResult.error
      );
    }
    return parseResult.data;
  });
}

// === RUNTIME VALIDATION HELPERS ===

// Validate that a string is a valid UUID
export function validateUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Validate that a string is a valid URL
export function validateURL(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// Validate that a number is within a range
export function validateNumberRange(
  value: number,
  min: number,
  max: number
): boolean {
  return value >= min && value <= max;
}

// Validate email format
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// === SANITIZATION HELPERS ===

// Sanitize string input to prevent injection attacks
export function sanitizeString(input: string, maxLength = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, "") // Remove potential HTML/XML tags
    .replace(/[\x00-\x1f\x7f]/g, ""); // Remove control characters
}

// Sanitize array of strings
export function sanitizeStringArray(
  input: string[],
  maxLength = 100
): string[] {
  return input
    .slice(0, maxLength) // Limit array size
    .map((str) => sanitizeString(str))
    .filter((str) => str.length > 0); // Remove empty strings
}

// === BOUNDARY VALIDATION FUNCTIONS ===

// Validate data coming from external APIs
export function validateExternalApiResponse<T>(
  response: unknown,
  schema: z.ZodSchema<T>,
  source: string
): T {
  const result = schema.safeParse(response);
  if (!result.success) {
    throw new ValidationError(`Invalid response from ${source}`, result.error);
  }
  return result.data;
}

// Validate user input at API boundaries
export function validateUserInput<T>(
  input: unknown,
  schema: z.ZodSchema<T>,
  fieldName: string
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(`Invalid ${fieldName} provided`, result.error);
  }
  return result.data;
}

// === ERROR HANDLING UTILITIES ===

// Convert validation errors to API-friendly format
export function formatValidationError(error: ValidationError) {
  return {
    success: false,
    error: {
      type: "ValidationError",
      message: error.message,
      statusCode: error.statusCode,
      details: error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      })),
    },
  };
}

// Safely parse JSON with validation
export function safeParseJSON<T>(
  jsonString: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const parsed = JSON.parse(jsonString);
    const validated = schema.parse(parsed);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: new ValidationError("JSON validation failed", error),
      };
    }
    return {
      success: false,
      error: new ValidationError("Invalid JSON format"),
    };
  }
}

// === ASYNC VALIDATION HELPERS ===

// Validate async operations with timeout
export async function validateWithTimeout<T>(
  validationFn: () => Promise<T>,
  timeoutMs = 5000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Validation timeout")), timeoutMs);
  });

  return Promise.race([validationFn(), timeoutPromise]);
}

// === COLLECTION NAME VALIDATION ===
export function validateCollectionName(name: string): boolean {
  // Collection names should be alphanumeric with underscores/hyphens
  const nameRegex = /^[a-zA-Z0-9_-]+$/;
  return nameRegex.test(name) && name.length >= 1 && name.length <= 64;
}

// === FIELD NAME VALIDATION ===
export function validateFieldName(fieldName: string): boolean {
  // Field names should be valid identifier-like strings
  const fieldRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return fieldRegex.test(fieldName) && fieldName.length <= 64;
}
