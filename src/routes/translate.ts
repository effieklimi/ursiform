import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { translateAndSearch } from "../qdrant/translator";
import {
  TranslateQuerySchema,
  TranslateQueryRequest,
  TranslateQueryResponse,
} from "../schemas";

export async function translateRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: TranslateQueryRequest;
    Reply: TranslateQueryResponse;
  }>(
    "/translate-query",
    async (
      request: FastifyRequest<{ Body: TranslateQueryRequest }>,
      reply: FastifyReply
    ) => {
      try {
        // Validate request body with Zod
        const validationResult = TranslateQuerySchema.safeParse(request.body);

        if (!validationResult.success) {
          return reply.code(400).send({
            error: "Validation error",
            details: validationResult.error.errors,
          });
        }

        const { query, filters, k } = validationResult.data;

        const results = await translateAndSearch({
          query,
          filters,
          k,
        });

        return reply.code(200).send(results);
      } catch (error) {
        console.error("Error in translate query:", error);
        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to translate and search query",
        });
      }
    }
  );
}
