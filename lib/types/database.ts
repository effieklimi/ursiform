import {
  VectorPayload,
  FilterCondition,
  CollectionInfo,
  EmbeddingProvider,
  ConversationContext,
} from "../schemas";

// === CORE DATABASE TYPES ===

export interface VectorSearchResult {
  id: string;
  score: number;
  payload: VectorPayload;
}

export interface SearchQuery {
  vector?: number[];
  text?: string;
  filters?: FilterCondition[];
  limit: number;
  threshold?: number;
  offset?: string;
}

export interface PaginatedSearchResult {
  results: VectorSearchResult[];
  hasMore: boolean;
  nextOffset?: string;
  totalCount?: number;
}

// === QUERY INTENT TYPES ===

export type QueryType =
  | "count"
  | "search"
  | "list"
  | "filter"
  | "describe"
  | "collections"
  | "database"
  | "summarize"
  | "analyze"
  | "top"
  | "ranking"
  | "aggregate";

export type QueryScope = "collection" | "database";

export type SortOrder = "asc" | "desc";

export type AggregationFunction = "sum" | "average" | "min" | "max";

export interface QueryIntent {
  type: QueryType;
  target: string;
  filter?: FilterCondition[];
  limit?: number;
  scope: QueryScope;
  extractedCollection?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  aggregationFunction?: AggregationFunction;
  aggregationField?: string;
}

// === QUERY RESULT TYPES ===

export interface BaseQueryResult {
  count?: number;
  execution_time_ms?: number;
}

export interface CountResult extends BaseQueryResult {
  count: number;
  entities?: string[];
}

export interface SearchResult extends BaseQueryResult {
  items: VectorSearchResult[];
  count: number;
  hasMore?: boolean;
  nextOffset?: string;
  totalCount?: number;
}

export interface ListResult extends BaseQueryResult {
  entities?: string[];
  items?: VectorSearchResult[];
  count: number;
}

export interface AggregationResult extends BaseQueryResult {
  aggregation_function: AggregationFunction;
  aggregation_field: string;
  result: number | null;
  item_count_considered: number;
  total_items_scanned: number;
}

export interface DatabaseCountResult extends BaseQueryResult {
  total_vectors_count: number;
  count_of_queried_item_type?: number;
  queried_item_type?: string;
  by_collection: Array<{
    name: string;
    count: number;
    itemTypeHint?: string;
  }>;
}

export interface EntityCountResult extends BaseQueryResult {
  count: number;
  entity: string;
  by_collection?: Array<{
    collection: string;
    count: number;
  }>;
  sample_items?: VectorSearchResult[];
}

export interface SummaryResult extends BaseQueryResult {
  entity?: string;
  total_items: number;
  displayed_items: number;
  file_types?: string[];
  sample_filenames?: string[];
  collections_found?: number;
  by_collection?: Array<{
    collection: string;
    item_count: number;
    sample_filenames?: string[];
  }>;
  items: VectorSearchResult[];
}

export interface AnalysisResult extends BaseQueryResult {
  entity?: string;
  total_items: number;
  file_type_distribution: Record<string, number>;
  common_naming_patterns: Record<string, number>;
  source_domains: Record<string, number>;
  sample_items: VectorSearchResult[];
}

export interface RankingResult extends BaseQueryResult {
  top_entities: Array<{
    name: string;
    item_count: number;
    collections?: string[];
  }>;
  total_entities_found: number;
  max_item_count: number;
  entities_with_max_count: Array<{
    name: string;
    item_count: number;
  }>;
  has_tie: boolean;
  tie_count: number;
  total_items: number;
  average_items_per_entity: number;
}

export interface CollectionDescription extends BaseQueryResult {
  total_items: number;
  unique_entities: number;
  sample_entities: string[];
  sample_items: VectorSearchResult[];
}

export interface DatabaseOverview extends BaseQueryResult {
  total_collections: number;
  total_vectors: number;
  collections: CollectionInfo[];
}

export interface SearchAcrossCollectionsResult extends BaseQueryResult {
  total_count: number;
  collections_searched: number;
  results_by_collection: Array<{
    collection: string;
    count: number;
    items: VectorSearchResult[];
  }>;
}

// Union type for all possible query results
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

// === DATABASE CONFIGURATION TYPES ===

export interface DatabaseConfig {
  entityField: string;
  entityType: string;
  itemType: string;
  additionalFields?: {
    filename?: string;
    url?: string;
    description?: string;
  };
}

export interface ProcessingConfig {
  chunkSize: number;
  maxEntities: number | "unlimited";
  maxRecordsPerCollection: number | "unlimited";
  enableProgressLogging: boolean;
}

export interface PaginationOptions {
  limit: number;
  offset?: string;
}

// === QDRANT SPECIFIC TYPES ===

export interface QdrantPoint {
  id: string | number;
  vector?: number[];
  payload?: Record<string, unknown>;
}

export interface QdrantScrollResult {
  points: QdrantPoint[];
  next_page_offset: string | number | null;
}

export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
  vector?: number[];
}

export interface QdrantFilter {
  must?: Array<{
    key: string;
    match?: {
      value?: unknown;
      text?: string;
      any?: unknown[];
      except?: unknown[];
    };
    range?: {
      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;
    };
  }>;
  should?: Array<{
    key: string;
    match?: {
      value?: unknown;
      text?: string;
      any?: unknown[];
      except?: unknown[];
    };
  }>;
  must_not?: Array<{
    key: string;
    match?: {
      value?: unknown;
      text?: string;
      any?: unknown[];
    };
  }>;
}

// === NATURAL LANGUAGE PROCESSING TYPES ===

export interface NaturalQueryRequest {
  collection?: string;
  question: string;
  provider?: EmbeddingProvider;
  model?: string;
  context?: ConversationContext;
  pagination?: PaginationOptions;
  processingConfig?: ProcessingConfig;
}

export interface NaturalQueryResponse {
  answer: string;
  query_type: string;
  data?: QueryResult;
  execution_time_ms: number;
  context: ConversationContext;
  pagination?: {
    hasMore: boolean;
    nextOffset?: string;
    totalCount?: number;
    limit: number;
  };
}

// === ERROR TYPES ===

export interface DatabaseError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

// === EMBEDDING TYPES ===

export interface EmbeddingRequest {
  text: string;
  provider: EmbeddingProvider;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// === PERFORMANCE MONITORING TYPES ===

export interface QueryPerformanceMetrics {
  queryType: string;
  collection?: string;
  duration: number;
  recordsProcessed: number;
  memoryEfficient: boolean;
  processingMode?: string;
}

// === COLLECTION MANAGEMENT TYPES ===

export interface CreateCollectionRequest {
  name: string;
  dimension: number;
  distance?: "cosine" | "euclidean" | "dot";
}

export interface CreateCollectionResponse {
  success: boolean;
  message?: string;
}

export interface CollectionStats {
  name: string;
  vectors_count: number;
  indexed_fields: string[];
  points_count: number;
  segments_count: number;
  disk_data_size: number;
  ram_data_size: number;
}

// === UTILITY TYPES ===

// Type for ensuring exhaustive switch statements
export type Never = never;

// Type for making certain fields required
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Type for making certain fields optional
export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Type for deep readonly
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Type for function return values
export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : any;

// === EXPORT ALL TYPES ===
export type {
  VectorPayload,
  FilterCondition,
  CollectionInfo,
  EmbeddingProvider,
  ConversationContext,
} from "../schemas";
