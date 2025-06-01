import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Embedding provider enum
export const EmbeddingProviderSchema = z.enum(["openai", "gemini"]);
export type EmbeddingProvider = z.infer<typeof EmbeddingProviderSchema>;

// === STRONGLY TYPED VECTOR PAYLOAD SCHEMA ===
export const VectorPayloadSchema = z.object({
  // Core identifier fields
  id: z.string().uuid().optional(),

  // Content fields
  name: z.string().min(1).optional(),
  file_name: z.string().optional(),
  image_url: z.string().url().optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  text: z.string().optional(),

  // Technical metadata
  mime_type: z.string().optional(),
  file_size: z.number().optional(),
  dimensions: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .optional(),

  // Timestamps
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  // Classification and organization
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  collection_name: z.string().optional(),

  // Numerical fields for aggregation
  price: z.number().optional(),
  rating: z.number().min(0).max(5).optional(),
  popularity_score: z.number().optional(),

  // Custom fields (controlled extension point)
  custom_fields: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional(),
});

export type VectorPayload = z.infer<typeof VectorPayloadSchema>;

// === FILTER CONDITIONS ===
export const FilterOperatorSchema = z.enum([
  "equals",
  "contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not_in",
  "exists",
]);

export const FilterConditionSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;

export const FilterGroupSchema = z.object({
  conditions: z.array(FilterConditionSchema),
  operator: z.enum(["AND", "OR"]).default("AND"),
});

export type FilterGroup = z.infer<typeof FilterGroupSchema>;

// === VECTOR SEARCH SCHEMAS ===
export const VectorSearchResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  payload: VectorPayloadSchema,
});

export type VectorSearchResult = z.infer<typeof VectorSearchResultSchema>;

export const SearchQuerySchema = z.object({
  vector: z.array(z.number()).optional(),
  text: z.string().optional(),
  filters: z.array(FilterConditionSchema).optional(),
  limit: z.number().int().min(1).max(1000).default(10),
  threshold: z.number().min(0).max(1).optional(),
  offset: z.string().optional(),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// === COLLECTION SCHEMAS ===
export const CollectionInfoSchema = z.object({
  name: z.string(),
  vectors_count: z.number().int().nonnegative(),
  indexed_fields: z.array(z.string()),
  itemTypeHint: z.enum(["image", "document", "mixed", "unknown"]).optional(),
  sample_payloads: z.array(VectorPayloadSchema).optional(),
});

export type CollectionInfo = z.infer<typeof CollectionInfoSchema>;

export const CreateCollectionSchema = z.object({
  name: z.string().min(1),
  dimension: z.number().int().positive().optional().default(768),
});

export type CreateCollectionRequest = z.infer<typeof CreateCollectionSchema>;

export const CreateCollectionResponseSchema = z.object({
  success: z.boolean(),
});

export type CreateCollectionResponse = z.infer<
  typeof CreateCollectionResponseSchema
>;

// === UPDATED POINT SCHEMA ===
export const PointSchema = z.object({
  id: z.union([z.string().uuid(), z.number().int().nonnegative()]),
  vector: z.array(z.number()),
  payload: VectorPayloadSchema.optional(),
});

export type Point = z.infer<typeof PointSchema>;

export const UpsertVectorsSchema = z.object({
  points: z.array(PointSchema),
});

export type UpsertVectorsRequest = z.infer<typeof UpsertVectorsSchema>;

export const UpsertVectorsResponseSchema = z.object({
  upserted: z.number(),
});

export type UpsertVectorsResponse = z.infer<typeof UpsertVectorsResponseSchema>;

// === DOCUMENT SCHEMAS ===
export const DocumentMetadataSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  source: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.string().datetime().optional(),
  custom_fields: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

export const DocumentSchema = z.object({
  id: z.string().transform((val) => {
    // If it's already a UUID, keep it
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        val
      )
    ) {
      return val;
    }
    // If not a UUID, generate a new one
    return uuidv4();
  }),
  text: z.string().min(1, "Text content is required"),
  metadata: DocumentMetadataSchema.optional(),
});

export type Document = z.infer<typeof DocumentSchema>;

export const AddDocumentSchema = z.object({
  document: DocumentSchema,
  provider: EmbeddingProviderSchema.optional().default("openai"),
});

export type AddDocumentRequest = z.infer<typeof AddDocumentSchema>;

export const AddDocumentsSchema = z.object({
  documents: z.array(DocumentSchema),
  provider: EmbeddingProviderSchema.optional().default("openai"),
});

export type AddDocumentsRequest = z.infer<typeof AddDocumentsSchema>;

export const AddDocumentResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(),
  message: z.string(),
});

export type AddDocumentResponse = z.infer<typeof AddDocumentResponseSchema>;

export const AddDocumentsResponseSchema = z.object({
  success: z.boolean(),
  processed: z.number(),
  failed: z.number(),
  results: z.array(
    z.object({
      id: z.string(),
      success: z.boolean(),
      error: z.string().optional(),
    })
  ),
});

export type AddDocumentsResponse = z.infer<typeof AddDocumentsResponseSchema>;

// === SEARCH SCHEMAS (UPDATED) ===
export const TranslateQuerySchema = z.object({
  query: z.string().min(1),
  filters: z.array(FilterConditionSchema).optional(),
  k: z.number().int().positive().optional().default(5),
  provider: EmbeddingProviderSchema.optional().default("openai"),
});

export type TranslateQueryRequest = z.infer<typeof TranslateQuerySchema>;

export const SearchHitSchema = z.object({
  id: z.string(),
  score: z.number(),
  payload: VectorPayloadSchema,
});

export type SearchHit = z.infer<typeof SearchHitSchema>;

export const TranslateQueryResponseSchema = z.array(SearchHitSchema);

export type TranslateQueryResponse = z.infer<
  typeof TranslateQueryResponseSchema
>;

// === CONVERSATION CONTEXT SCHEMAS ===
export const ConversationTurnSchema = z.object({
  id: z.string(),
  question: z.string(),
  intent: z.object({
    type: z.string(),
    target: z.string(),
    filter: z.array(FilterConditionSchema).optional(),
    scope: z.enum(["collection", "database"]),
    extractedCollection: z.string().optional(),
  }),
  result: z.record(z.unknown()), // Keep as unknown for flexibility, validate at boundaries
  timestamp: z.date(),
});

export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

export const ConversationContextSchema = z.object({
  lastEntity: z.string().optional(),
  lastCollection: z.string().optional(),
  lastQueryType: z.string().optional(),
  lastTarget: z.string().optional(),
  conversationHistory: z.array(ConversationTurnSchema),
  currentTopic: z.string().optional(),
});

export type ConversationContext = z.infer<typeof ConversationContextSchema>;

// === QUERY INTENT SCHEMAS ===
export const QueryIntentSchema = z.object({
  type: z.enum([
    "count",
    "search",
    "list",
    "filter",
    "describe",
    "collections",
    "database",
    "summarize",
    "analyze",
    "top",
    "ranking",
    "aggregate",
  ]),
  target: z.string(),
  filter: z.array(FilterConditionSchema).optional(),
  limit: z.number().optional(),
  scope: z.enum(["collection", "database"]),
  extractedCollection: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  aggregationFunction: z.enum(["sum", "average", "min", "max"]).optional(),
  aggregationField: z.string().optional(),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

// === QUERY RESULT SCHEMAS ===
export const QueryResultSchema = z.object({
  count: z.number().optional(),
  items: z.array(VectorSearchResultSchema).optional(),
  entities: z.array(z.string()).optional(),
  aggregations: z.record(z.number()).optional(),
  hasMore: z.boolean().optional(),
  nextOffset: z.string().optional(),
  totalCount: z.number().optional(),
  by_collection: z
    .array(
      z.object({
        name: z.string(),
        count: z.number(),
        itemTypeHint: z.string().optional(),
      })
    )
    .optional(),
});

export type QueryResult = z.infer<typeof QueryResultSchema>;

// === NATURAL LANGUAGE QUERY SCHEMAS ===
export const PaginationSchema = z.object({
  limit: z.number().min(1).max(1000).default(20),
  offset: z.string().optional(),
});

export type PaginationRequest = z.infer<typeof PaginationSchema>;

export const NaturalQuerySchema = z.object({
  collection: z.string().optional(),
  question: z.string().min(1, "Question is required").max(10000),
  provider: EmbeddingProviderSchema.optional().default("openai"),
  model: z.string().optional(),
  pagination: PaginationSchema.optional(),
  context: ConversationContextSchema.optional(),
});

export type NaturalQueryRequest = z.infer<typeof NaturalQuerySchema>;

export const NaturalQueryResponseSchema = z.object({
  question: z.string(),
  answer: z.string(),
  query_type: z.string(),
  data: QueryResultSchema.optional(),
  execution_time_ms: z.number(),
  context: ConversationContextSchema,
  pagination: z
    .object({
      hasMore: z.boolean(),
      nextOffset: z.string().optional(),
      totalCount: z.number().optional(),
      limit: z.number(),
    })
    .optional(),
});

export type NaturalQueryResponse = z.infer<typeof NaturalQueryResponseSchema>;

// === HEALTH SCHEMA ===
export const HealthResponseSchema = z.object({
  status: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// === PAGINATED RESPONSE SCHEMA ===
export const PaginatedResponseSchema = z.object({
  data: z.array(z.unknown()), // Will be validated by specific schemas
  pagination: z.object({
    hasMore: z.boolean(),
    nextOffset: z.string().optional(),
    totalCount: z.number().optional(),
    limit: z.number(),
  }),
});

export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;

// === CONFIGURATION SCHEMAS ===
export const QdrantConfigSchema = z.object({
  url: z.string().url(),
  apiKey: z.string().optional(),
  defaultCollection: z.string(),
});

export const EmbeddingConfigSchema = z.object({
  providers: z.array(EmbeddingProviderSchema),
  defaultProvider: EmbeddingProviderSchema,
  openai: z
    .object({
      apiKey: z.string(),
      baseUrl: z.string().optional(),
    })
    .optional(),
  gemini: z
    .object({
      apiKey: z.string(),
    })
    .optional(),
});

export const TypedConfigSchema = z.object({
  qdrant: QdrantConfigSchema,
  embeddings: EmbeddingConfigSchema,
});

export type TypedConfig = z.infer<typeof TypedConfigSchema>;

// === VALIDATION ERROR SCHEMA ===
export const ValidationErrorSchema = z.object({
  message: z.string(),
  errors: z.array(
    z.object({
      path: z.array(z.union([z.string(), z.number()])),
      message: z.string(),
      code: z.string(),
    })
  ),
  statusCode: z.number().default(400),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;
