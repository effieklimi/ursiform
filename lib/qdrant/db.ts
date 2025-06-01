import { QdrantClient } from "@qdrant/js-client-rest";
import { getConfig } from "../config";
import {
  QdrantConnectionError,
  CollectionCreationError,
  CollectionNotFoundError,
  AuthenticationError,
  ConfigurationError,
  TimeoutError,
} from "../errors";

// Initialize client using centralized configuration
function createQdrantClient(): QdrantClient {
  const config = getConfig();

  let clientConfig: any;

  // For cloud instances, use the recommended format from documentation
  if (config.qdrant.apiKey) {
    // Parse the URL to extract host
    try {
      const url = new URL(config.qdrant.url);
      const host = url.hostname;
      const isHttps = url.protocol === "https:";

      clientConfig = {
        host: host,
        port: null, // This is critical for cloud instances - prevents :6333 being appended
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
    // For local instances without API key
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

// Lazy initialization of client
let clientInstance: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!clientInstance) {
    clientInstance = createQdrantClient();
  }
  return clientInstance;
}

// Export client for backward compatibility
export const client = new Proxy({} as QdrantClient, {
  get(_, prop) {
    return getQdrantClient()[prop as keyof QdrantClient];
  },
});

// Test Qdrant connection
export async function testConnection(): Promise<boolean> {
  try {
    const config = getConfig();
    const client = getQdrantClient();

    // Use getCollections as a simple health check with timeout
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

export async function createCollection(
  name?: string,
  dimension: number = 768
): Promise<void> {
  const config = getConfig();
  const collectionName = name || config.qdrant.defaultCollection;

  try {
    // First test the connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new QdrantConnectionError(
        new Error("Connection test failed"),
        "collection creation",
        config.qdrant.url
      );
    }

    const client = getQdrantClient();

    // Check if collection already exists
    try {
      await client.getCollection(collectionName);
      console.log(`Collection "${collectionName}" already exists`);
      return;
    } catch (error: any) {
      // Collection doesn't exist, create it
      console.log(`Collection "${collectionName}" does not exist, creating...`);

      // Check if it's a different error than "not found"
      if (error.status && error.status !== 404) {
        const errorMessage = error.message?.toLowerCase() || "";

        if (
          error.status === 401 ||
          error.status === 403 ||
          errorMessage.includes("authentication")
        ) {
          throw new AuthenticationError("Qdrant", "collection access");
        }

        if (
          errorMessage.includes("connection") ||
          errorMessage.includes("timeout")
        ) {
          throw new QdrantConnectionError(
            error,
            "collection check",
            config.qdrant.url
          );
        }

        console.error("Unexpected error checking collection:", error);
        throw new CollectionCreationError(collectionName, error);
      }
    }

    // Validate dimension parameter
    if (dimension <= 0 || dimension > 65536) {
      throw new ConfigurationError(
        "dimension",
        `Dimension must be between 1 and 65536, got ${dimension}`
      );
    }

    try {
      await client.createCollection(collectionName, {
        vectors: {
          size: dimension,
          distance: "Cosine",
        },
      });

      console.log(
        `Collection "${collectionName}" created successfully with dimension ${dimension}`
      );
    } catch (error: any) {
      const errorMessage = error.message?.toLowerCase() || "";

      if (
        error.status === 401 ||
        error.status === 403 ||
        errorMessage.includes("authentication")
      ) {
        throw new AuthenticationError("Qdrant", "collection creation");
      }

      if (
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout")
      ) {
        throw new QdrantConnectionError(
          error,
          "collection creation",
          config.qdrant.url
        );
      }

      throw new CollectionCreationError(collectionName, error);
    }
  } catch (error: any) {
    // Re-throw our custom errors as-is
    if (error instanceof Error && "code" in error) {
      throw error;
    }

    console.error(
      `Unexpected error creating collection "${collectionName}":`,
      error
    );

    // Provide more specific error messages for common cases
    const errorMessage = error.message?.toLowerCase() || "";

    if (
      errorMessage.includes("authentication") ||
      error.status === 401 ||
      error.status === 403
    ) {
      throw new AuthenticationError("Qdrant", "collection creation");
    }

    if (errorMessage.includes("connection") || error.code === "ECONNREFUSED") {
      throw new QdrantConnectionError(
        error,
        "collection creation",
        config.qdrant.url
      );
    }

    throw new CollectionCreationError(collectionName, error);
  }
}
