import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";

import { collectionsRoutes } from "./routes/collections";
import { vectorsRoutes } from "./routes/vectors";
import { documentsRoutes } from "./routes/documents";
import { translateRoutes } from "./routes/translate";
import { healthRoutes } from "./routes/health";
import { nlQueryRoutes } from "./routes/nl-query";

const fastify = Fastify({
  logger: true,
});

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: true,
    });

    // Register routes
    await fastify.register(collectionsRoutes);
    await fastify.register(vectorsRoutes);
    await fastify.register(documentsRoutes);
    await fastify.register(translateRoutes);
    await fastify.register(healthRoutes);
    await fastify.register(nlQueryRoutes);

    // Start server
    const port = process.env.PORT ? parseInt(process.env.PORT) : 8000;
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });
    console.log(`🚀 Server ready at http://${host}:${port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

start();
