import { z } from "zod";

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

// Vector schemas
export const PointSchema = z.object({
  id: z.string(),
  vector: z.array(z.number()),
  payload: z.record(z.any()).optional(),
});

export const UpsertVectorsSchema = z.object({
  points: z.array(PointSchema),
});

export type UpsertVectorsRequest = z.infer<typeof UpsertVectorsSchema>;

export const UpsertVectorsResponseSchema = z.object({
  upserted: z.number(),
});

export type UpsertVectorsResponse = z.infer<typeof UpsertVectorsResponseSchema>;

// Document schemas (for automatic embedding generation)
export const DocumentSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Text content is required"),
  metadata: z.record(z.any()).optional(),
});

export const AddDocumentSchema = z.object({
  document: DocumentSchema,
});

export type AddDocumentRequest = z.infer<typeof AddDocumentSchema>;

export const AddDocumentsSchema = z.object({
  documents: z.array(DocumentSchema),
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

// Translate/Search schemas
export const TranslateQuerySchema = z.object({
  query: z.string().min(1),
  filters: z.record(z.any()).optional(),
  k: z.number().int().positive().optional().default(5),
});

export type TranslateQueryRequest = z.infer<typeof TranslateQuerySchema>;

export const SearchHitSchema = z.object({
  id: z.string(),
  score: z.number(),
  payload: z.any(),
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
