import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { HealthResponse } from "../schemas";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Reply: HealthResponse;
  }>("/health", async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ status: "ok" });
  });
}
