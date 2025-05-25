import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { client } from "../qdrant/db";
import {
  UpsertVectorsSchema,
  UpsertVectorsRequest,
  UpsertVectorsResponse,
} from "../schemas";

export async function vectorsRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Params: { collection: string };
    Body: UpsertVectorsRequest;
    Reply: UpsertVectorsResponse;
  }>(
    "/collections/:collection/vectors",
    async (
      request: FastifyRequest<{
        Params: { collection: string };
        Body: UpsertVectorsRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Validate request body with Zod
        const validationResult = UpsertVectorsSchema.safeParse(request.body);

        if (!validationResult.success) {
          console.error("Validation failed:", validationResult.error.errors);
          return reply.code(400).send({
            error: "Validation error",
            details: validationResult.error.errors,
          });
        }

        const { collection } = request.params;
        const { points } = validationResult.data;

        console.log(
          `Upserting ${points.length} points to collection: ${collection}`
        );
        console.log("Points data:", JSON.stringify(points, null, 2));

        // Check if collection exists first
        try {
          await client.getCollection(collection);
        } catch (collectionError: any) {
          console.error("Collection error:", collectionError);
          if (collectionError.status === 404) {
            return reply.code(404).send({
              error: "Collection not found",
              message: `Collection "${collection}" does not exist. Please create it first.`,
            });
          }
          throw collectionError;
        }

        const result = await client.upsert(collection, {
          points: points.map((point) => ({
            id: point.id,
            vector: point.vector,
            payload: point.payload || {},
          })),
        });

        console.log("Upsert result:", result);

        return reply.code(200).send({
          upserted: points.length,
        });
      } catch (error: any) {
        console.error("Error upserting vectors:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.status,
          code: error.code,
          stack: error.stack,
        });

        // Provide more specific error messages
        if (error.status === 404) {
          return reply.code(404).send({
            error: "Collection not found",
            message: "Collection does not exist. Please create it first.",
          });
        } else if (error.status === 422) {
          return reply.code(422).send({
            error: "Invalid vector data",
            message: "Vector dimensions or format is incorrect.",
          });
        } else {
          return reply.code(500).send({
            error: "Internal server error",
            message: "Failed to upsert vectors",
          });
        }
      }
    }
  );
}
