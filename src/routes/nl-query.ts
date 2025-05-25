import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { processNaturalQuery } from "../qdrant/nlp-query";
import {
  NaturalQuerySchema,
  NaturalQueryRequest,
  NaturalQueryResponse,
} from "../schemas";

export async function nlQueryRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: NaturalQueryRequest;
    Reply: NaturalQueryResponse;
  }>(
    "/ask",
    async (
      request: FastifyRequest<{ Body: NaturalQueryRequest }>,
      reply: FastifyReply
    ) => {
      try {
        // Validate request body with Zod
        const validationResult = NaturalQuerySchema.safeParse(request.body);

        if (!validationResult.success) {
          return reply.code(400).send({
            error: "Validation error",
            details: validationResult.error.errors,
          });
        }

        const { collection, question, provider } = validationResult.data;

        console.log(
          `Processing natural language query: "${question}" for collection: ${collection}`
        );

        // Process the natural language query
        const result = await processNaturalQuery(
          collection,
          question,
          provider
        );

        return reply.code(200).send({
          question,
          answer: result.answer,
          query_type: result.query_type,
          data: result.data,
          execution_time_ms: result.execution_time_ms,
        });
      } catch (error) {
        console.error("Error processing natural language query:", error);
        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to process natural language query",
        });
      }
    }
  );
}
