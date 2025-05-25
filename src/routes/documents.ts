import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { client } from "../qdrant/db";
import { embed } from "../qdrant/embedder";
import {
  AddDocumentSchema,
  AddDocumentsSchema,
  AddDocumentRequest,
  AddDocumentsRequest,
  AddDocumentResponse,
  AddDocumentsResponse,
} from "../schemas";

export async function documentsRoutes(fastify: FastifyInstance) {
  // Add single document with automatic embedding
  fastify.post<{
    Params: { collection: string };
    Body: AddDocumentRequest;
    Reply: AddDocumentResponse;
  }>(
    "/collections/:collection/documents",
    async (
      request: FastifyRequest<{
        Params: { collection: string };
        Body: AddDocumentRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Validate request body with Zod
        const validationResult = AddDocumentSchema.safeParse(request.body);

        if (!validationResult.success) {
          return reply.code(400).send({
            error: "Validation error",
            details: validationResult.error.errors,
          });
        }

        const { collection } = request.params;
        const { document, provider } = validationResult.data;

        // Generate embedding from text
        console.log(
          `Generating embedding for document ${document.id} using ${provider}...`
        );
        const vector = await embed(document.text, provider);

        // Prepare point for Qdrant
        const point = {
          id: document.id,
          vector,
          payload: {
            text: document.text,
            ...document.metadata,
            created_at: new Date().toISOString(),
          },
        };

        // Insert into Qdrant
        await client.upsert(collection, {
          wait: true,
          points: [point],
        });

        console.log(
          `Document ${document.id} added successfully to collection ${collection}`
        );

        return reply.code(201).send({
          success: true,
          id: document.id,
          message: `Document ${document.id} added successfully`,
        });
      } catch (error) {
        console.error("Error adding document:", error);

        if (error instanceof Error && error.message.includes("Collection")) {
          return reply.code(404).send({
            error: "Collection not found",
            message:
              "Please create the collection first using POST /collections",
          });
        }

        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to add document",
        });
      }
    }
  );

  // Bulk add documents with automatic embedding
  fastify.post<{
    Params: { collection: string };
    Body: AddDocumentsRequest;
    Reply: AddDocumentsResponse;
  }>(
    "/collections/:collection/documents/bulk",
    async (
      request: FastifyRequest<{
        Params: { collection: string };
        Body: AddDocumentsRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Validate request body with Zod
        const validationResult = AddDocumentsSchema.safeParse(request.body);

        if (!validationResult.success) {
          return reply.code(400).send({
            error: "Validation error",
            details: validationResult.error.errors,
          });
        }

        const { collection } = request.params;
        const { documents, provider } = validationResult.data;

        console.log(
          `Processing ${documents.length} documents for collection ${collection} using ${provider}...`
        );

        const results: Array<{ id: string; success: boolean; error?: string }> =
          [];
        const points: Array<any> = [];

        // Process each document
        for (const document of documents) {
          try {
            // Generate embedding from text
            const vector = await embed(document.text, provider);

            // Prepare point for Qdrant
            const point = {
              id: document.id,
              vector,
              payload: {
                text: document.text,
                ...document.metadata,
                created_at: new Date().toISOString(),
              },
            };

            points.push(point);
            results.push({ id: document.id, success: true });
          } catch (error) {
            console.error(`Error processing document ${document.id}:`, error);
            results.push({
              id: document.id,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        // Bulk insert successful points into Qdrant
        if (points.length > 0) {
          await client.upsert(collection, {
            wait: true,
            points,
          });
        }

        const processed = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        console.log(
          `Bulk operation completed: ${processed} processed, ${failed} failed`
        );

        return reply.code(200).send({
          success: true,
          processed,
          failed,
          results,
        });
      } catch (error) {
        console.error("Error in bulk document operation:", error);

        if (error instanceof Error && error.message.includes("Collection")) {
          return reply.code(404).send({
            error: "Collection not found",
            message:
              "Please create the collection first using POST /collections",
          });
        }

        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to process bulk documents",
        });
      }
    }
  );
}
