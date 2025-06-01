import { QdrantClient } from "@qdrant/js-client-rest";
import { getConfig } from "../config";

// Initialize client using centralized configuration
function createQdrantClient(): QdrantClient {
  const config = getConfig();

  let clientConfig: any;

  // For cloud instances, use the recommended format from documentation
  if (config.qdrant.apiKey) {
    // Parse the URL to extract host
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
  } else {
    // For local instances without API key
    clientConfig = {
      url: config.qdrant.url,
    };

    console.log(`Connecting to local Qdrant at ${config.qdrant.url}`);
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
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Connection timeout")),
        config.qdrant.timeout
      )
    );

    await Promise.race([client.getCollections(), timeoutPromise]);

    console.log("Qdrant connection successful");
    return true;
  } catch (error) {
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
      throw new Error(
        "Cannot connect to Qdrant database. Please check your configuration."
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
        console.error("Unexpected error checking collection:", error);
        throw error;
      }
    }

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
    console.error(`Error creating collection "${collectionName}":`, error);

    // Provide more specific error messages
    if (
      error.message?.includes("authentication") ||
      error.status === 401 ||
      error.status === 403
    ) {
      throw new Error(
        "Authentication failed. Please check your QDRANT_API_KEY and QDRANT_URL."
      );
    } else if (
      error.message?.includes("connection") ||
      error.code === "ECONNREFUSED"
    ) {
      throw new Error(
        "Cannot connect to Qdrant. Please check your QDRANT_URL."
      );
    } else {
      throw error;
    }
  }
}
