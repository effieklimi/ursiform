export interface VectorPayload {
  [key: string]: any;
}

export interface VectorMetadata {
  timestamp?: Date;
  source?: string;
  tags?: string[];
  [key: string]: any;
}

export interface SearchQuery {
  vector?: number[];
  text?: string;
  filters?: Record<string, any>;
  limit?: number;
  scoreThreshold?: number;
}

export interface SearchResult {
  hits: SearchHit[];
  executionTimeMs: number;
  totalCount?: number;
}

export interface SearchHit {
  id: string;
  score: number;
  payload: VectorPayload;
  metadata?: VectorMetadata;
}

export interface UpsertResult {
  operation_id: number;
  status: "acknowledged" | "completed";
  updated_count?: number;
}

export interface CollectionConfig {
  dimension: number;
  distance?: "Cosine" | "Euclid" | "Dot";
  onDiskPayload?: boolean;
}

export interface CollectionInfo {
  name: string;
  dimension: number;
  vectorCount: number;
  status: string;
}

export interface QueryIntent {
  type: "search" | "filter" | "aggregate" | "count";
  confidence: number;
  extractedFilters?: Record<string, any>;
  reformulatedQuery?: string;
}

export interface NLPQueryResult {
  intent: QueryIntent;
  searchQuery: SearchQuery;
  context?: any;
}

// Import and re-export the main types from lib for compatibility
export type { ConversationContext, ConversationTurn } from "../../../lib/types";

export type EmbeddingProvider = "openai" | "gemini";
