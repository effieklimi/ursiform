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
    {
      schema: {
        body: CreateCollectionSchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateCollectionRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const { name, dimension } = request.body;

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
