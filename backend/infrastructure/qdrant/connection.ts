import { QdrantClient } from "@qdrant/js-client-rest";
import { getConfig } from "../../../lib/config";
import {
  QdrantConnectionError,
  AuthenticationError,
  ConfigurationError,
  TimeoutError,
} from "../../../lib/errors";

// Singleton client instance
let clientInstance: QdrantClient | null = null;

function createQdrantClient(): QdrantClient {
  const config = getConfig();

  let clientConfig: any;

  if (config.qdrant.apiKey) {
    // Cloud instance configuration
    try {
      const url = new URL(config.qdrant.url);
      const host = url.hostname;
      const isHttps = url.protocol === "https:";

      clientConfig = {
        host: host,
        port: null, // Critical for cloud instances
        https: isHttps,
        apiKey: config.qdrant.apiKey,
      };

      console.log(`Connecting to Qdrant Cloud at ${host} (HTTPS: ${isHttps})`);
    } catch (error) {
      throw new ConfigurationError(
        "QDRANT_URL",
        `Invalid URL format: ${config.qdrant.url}`
      );
    }
  } else {
    // Local instance configuration
    try {
      new URL(config.qdrant.url); // Validate URL format
      clientConfig = {
        url: config.qdrant.url,
      };

      console.log(`Connecting to local Qdrant at ${config.qdrant.url}`);
    } catch (error) {
      throw new ConfigurationError(
        "QDRANT_URL",
        `Invalid URL format: ${config.qdrant.url}`
      );
    }
  }

  return new QdrantClient(clientConfig);
}

export function getQdrantClient(): QdrantClient {
  if (!clientInstance) {
    clientInstance = createQdrantClient();
  }
  return clientInstance;
}

export function resetConnection(): void {
  clientInstance = null;
}

// Test connection
export async function testQdrantConnection(): Promise<boolean> {
  try {
    const config = getConfig();
    const client = getQdrantClient();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(new TimeoutError("connection test", config.qdrant.timeout)),
        config.qdrant.timeout
      )
    );

    await Promise.race([client.getCollections(), timeoutPromise]);

    console.log("Qdrant connection successful");
    return true;
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.error("Qdrant connection timed out:", error.message);
      return false;
    }

    const errorMessage =
      error instanceof Error ? error.message.toLowerCase() : "";

    if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403")
    ) {
      console.error("Qdrant authentication failed:", error);
      return false;
    }

    console.error("Qdrant connection failed:", error);
    return false;
  }
}
