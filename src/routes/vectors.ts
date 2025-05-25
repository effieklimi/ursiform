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
          return reply.code(400).send({
            error: "Validation error",
            details: validationResult.error.errors,
          });
        }

        const { collection } = request.params;
        const { points } = validationResult.data;

        const result = await client.upsert(collection, {
          wait: true,
          points: points.map((point) => ({
            id: point.id,
            vector: point.vector,
            payload: point.payload || {},
          })),
        });

        return reply.code(200).send({
          upserted: points.length,
        });
      } catch (error) {
        console.error("Error upserting vectors:", error);
        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to upsert vectors",
        });
      }
    }
  );
}
