// Remove circular imports from schemas.ts
// import {
//   ConversationContext,
//   ConversationTurn,
//   QueryResult,
//   EmbeddingProvider,
// } from "./schemas";

// Import strongly typed database interfaces with specific names to avoid conflicts
import type {
  NaturalQueryRequest as DatabaseNaturalQueryRequest,
  NaturalQueryResponse as DatabaseNaturalQueryResponse,
  QueryType,
  QueryScope,
  SortOrder,
  AggregationFunction,
  VectorSearchResult,
  SearchQuery,
  PaginatedSearchResult,
  DatabaseConfig,
  ProcessingConfig,
  PaginationOptions,
  QdrantPoint,
  QdrantScrollResult,
  QdrantSearchResult,
  QdrantFilter,
  DatabaseError,
  ValidationErrorDetail,
  EmbeddingRequest,
  EmbeddingResponse,
  QueryPerformanceMetrics,
  CreateCollectionRequest,
  CreateCollectionResponse,
  CollectionStats,
  CountResult,
  SearchResult,
  ListResult,
  AggregationResult,
  DatabaseCountResult,
  EntityCountResult,
  SummaryResult,
  AnalysisResult,
  RankingResult,
  CollectionDescription,
  DatabaseOverview,
  SearchAcrossCollectionsResult,
} from "./types/database";

// Import only non-conflicting types from schemas
import type {
  QueryIntent,
  FilterCondition,
  VectorPayload,
  CollectionInfo,
} from "./schemas";

// === CORE TYPE DEFINITIONS (to avoid circular dependencies) ===

// Define EmbeddingProvider locally to avoid circular import
export type EmbeddingProvider = "openai" | "gemini";

// Define QueryResult type union for all possible result types
export type QueryResult =
  | CountResult
  | SearchResult
  | ListResult
  | AggregationResult
  | DatabaseCountResult
  | EntityCountResult
  | SummaryResult
  | AnalysisResult
  | RankingResult
  | CollectionDescription
  | DatabaseOverview
  | SearchAcrossCollectionsResult;

// Define conversation types locally to avoid circular import
export interface ConversationTurn {
  id: string;
  question: string;
  intent: {
    type: QueryType;
    target: string;
    filter?: FilterCondition[];
    scope: "collection" | "database";
    extractedCollection?: string;
  };
  result: QueryResult;
  timestamp: Date;
}

export interface ConversationContext {
  lastEntity?: string;
  lastCollection?: string;
  lastQueryType?: QueryType;
  lastTarget?: string;
  conversationHistory: ConversationTurn[];
  currentTopic?: string;
}

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  queryType?: QueryType;
  executionTime?: number;
  data?: QueryResult;
  context?: ConversationContext;
}

// === STRONGLY TYPED INTERFACES ===

// Re-export the strongly typed interfaces as the main types
export interface NaturalQueryRequest extends DatabaseNaturalQueryRequest {}

export interface NaturalQueryResponse extends DatabaseNaturalQueryResponse {}

// === MODEL DEFINITIONS ===

// Available models with proper typing
export const AVAILABLE_MODELS = {
  // OpenAI models (using correct model names)
  "gpt-4o-2024-08-06": {
    provider: "openai" as const,
    name: "GPT-4o 2024-08-06",
  },
  "gpt-4.1-2025-04-14": {
    provider: "openai" as const,
    name: "GPT-4.1 2025-04-14",
  },
  "gpt-4o-mini": { provider: "openai" as const, name: "GPT-4o Mini" },
  "o3-2025-04-16": { provider: "openai" as const, name: "O3 2025-04-16" },
  "o3-mini-2025-01-31": {
    provider: "openai" as const,
    name: "O3 Mini 2025-01-31",
  },
  "o4-mini-2025-04-16": {
    provider: "openai" as const,
    name: "O4 Mini 2025-04-16",
  },
  "o1-2024-12-17": { provider: "openai" as const, name: "O1 2024-12-17" },

  // Gemini models (using correct model names)
  "gemini-2.0-flash": { provider: "gemini" as const, name: "Gemini 2.0 Flash" },
  "gemini-1.5-pro": { provider: "gemini" as const, name: "Gemini 1.5 Pro" },
  "gemini-1.5-flash": { provider: "gemini" as const, name: "Gemini 1.5 Flash" },
} as const;

export type ModelKey = keyof typeof AVAILABLE_MODELS;

// === API RESPONSE TYPES ===

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    statusCode: number;
    details?: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    statusCode: number;
    correlationId?: string;
    details?: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
}

// === HTTP STATUS CODES ===
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

// === REQUEST/RESPONSE VALIDATION HELPERS ===

export interface RequestValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// === UTILITY TYPES ===

// Type for ensuring all properties are defined
export type NonOptional<T> = {
  [K in keyof T]-?: T[K];
};

// Type for making specific fields required
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Type for making specific fields optional
export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Type for extracting promise return type
export type PromiseType<T> = T extends Promise<infer U> ? U : T;

// Type for function parameters
export type Parameters<T extends (...args: any) => any> = T extends (
  ...args: infer P
) => any
  ? P
  : never;

// === ENVIRONMENT CONFIGURATION TYPES ===

export interface EnvironmentConfig {
  nodeEnv: "development" | "production" | "test";
  port: number;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

// === LOGGING TYPES ===

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

// === RE-EXPORT TYPES ===

// Export specific types from schemas
export type {
  VectorPayload,
  FilterCondition,
  CollectionInfo,
  QueryIntent,
} from "./schemas";

// Export specific types from database
export type {
  QueryType,
  QueryScope,
  SortOrder,
  AggregationFunction,
  VectorSearchResult,
  SearchQuery,
  PaginatedSearchResult,
  DatabaseConfig,
  ProcessingConfig,
  PaginationOptions,
  QdrantPoint,
  QdrantScrollResult,
  QdrantSearchResult,
  QdrantFilter,
  DatabaseError,
  ValidationErrorDetail,
  EmbeddingRequest,
  EmbeddingResponse,
  QueryPerformanceMetrics,
  CreateCollectionRequest,
  CreateCollectionResponse,
  CollectionStats,
  CountResult,
  SearchResult,
  ListResult,
  AggregationResult,
  DatabaseCountResult,
  EntityCountResult,
  SummaryResult,
  AnalysisResult,
  RankingResult,
  CollectionDescription,
  DatabaseOverview,
  SearchAcrossCollectionsResult,
};

// Export validation utilities
export type { ValidationError } from "./validation";
