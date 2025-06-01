import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  EmbeddingProviderSchema,
  VectorPayloadSchema,
  FilterConditionSchema,
  DocumentMetadataSchema,
  QueryResultSchema,
} from "../lib/schemas";

// Re-export commonly used types for convenience
export type EmbeddingProvider = z.infer<typeof EmbeddingProviderSchema>;
export type VectorPayload = z.infer<typeof VectorPayloadSchema>;
export type FilterCondition = z.infer<typeof FilterConditionSchema>;
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;

// Collection schemas
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

// Vector schemas - now with strongly typed payload
export const PointSchema = z.object({
  id: z.union([z.string().uuid(), z.number().int().nonnegative()]),
  vector: z.array(z.number()),
  payload: VectorPayloadSchema.optional(),
});

export const UpsertVectorsSchema = z.object({
  points: z.array(PointSchema),
});

export type UpsertVectorsRequest = z.infer<typeof UpsertVectorsSchema>;

export const UpsertVectorsResponseSchema = z.object({
  upserted: z.number(),
});

export type UpsertVectorsResponse = z.infer<typeof UpsertVectorsResponseSchema>;

// Document schemas (for automatic embedding generation) - now with strongly typed metadata
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

// Translate/Search schemas - now with strongly typed filters
export const TranslateQuerySchema = z.object({
  query: z.string().min(1),
  filters: z.array(FilterConditionSchema).optional(),
  k: z.number().int().positive().optional().default(5),
  provider: EmbeddingProviderSchema.optional().default("openai"),
});

export type TranslateQueryRequest = z.infer<typeof TranslateQuerySchema>;

// Search hit schema - now with strongly typed payload
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

// Health schema
export const HealthResponseSchema = z.object({
  status: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Natural Language Query schemas
export const NaturalQuerySchema = z.object({
  collection: z.string().min(1, "Collection name is required"),
  question: z.string().min(1, "Question is required"),
  provider: EmbeddingProviderSchema.optional().default("openai"),
});

export type NaturalQueryRequest = z.infer<typeof NaturalQuerySchema>;

// Natural query response - now with strongly typed data field
export const NaturalQueryResponseSchema = z.object({
  question: z.string(),
  answer: z.string(),
  query_type: z.string(),
  data: QueryResultSchema.optional(),
  execution_time_ms: z.number(),
});

export type NaturalQueryResponse = z.infer<typeof NaturalQueryResponseSchema>;
