import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createCollection } from "../qdrant/db";
import {
  CreateCollectionSchema,
  CreateCollectionRequest,
  CreateCollectionResponse,
} from "../schemas";

export async function collectionsRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: CreateCollectionRequest;
    Reply: CreateCollectionResponse;
  }>(
    "/collections",
    async (
      request: FastifyRequest<{ Body: CreateCollectionRequest }>,
      reply: FastifyReply
    ) => {
      try {
        // Validate request body with Zod
        const validationResult = CreateCollectionSchema.safeParse(request.body);

        if (!validationResult.success) {
          return reply.code(400).send({
            error: "Validation error",
            details: validationResult.error.errors,
          });
        }

        const { name, dimension } = validationResult.data;

        await createCollection(name, dimension);

        return reply.code(201).send({ success: true });
      } catch (error) {
        console.error("Error creating collection:", error);
        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to create collection",
        });
      }
    }
  );
}
