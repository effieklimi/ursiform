import { QdrantClient } from "@qdrant/js-client-rest";

// Initialize client with support for both local and cloud instances
const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
const qdrantApiKey = process.env.QDRANT_API_KEY;

let clientConfig: any;

// For cloud instances, use the recommended format from documentation
if (qdrantApiKey) {
  // Parse the URL to extract host
  const url = new URL(qdrantUrl);
  const host = url.hostname;
  const isHttps = url.protocol === "https:";

  clientConfig = {
    host: host,
    port: null, // This is critical for cloud instances - prevents :6333 being appended
    https: isHttps,
    apiKey: qdrantApiKey,
  };

  console.log(`Connecting to Qdrant Cloud at ${host} (HTTPS: ${isHttps})`);
} else {
  // For local instances without API key
  clientConfig = {
    url: qdrantUrl,
  };

  console.log(`Connecting to local Qdrant at ${qdrantUrl}`);
}

const client = new QdrantClient(clientConfig);

export { client };

// Test Qdrant connection
export async function testConnection(): Promise<boolean> {
  try {
    // Use getCollections as a simple health check
    await client.getCollections();
    console.log("Qdrant connection successful");
    return true;
  } catch (error) {
    console.error("Qdrant connection failed:", error);
    return false;
  }
}

export async function createCollection(
  name: string = "my_collection",
  dimension: number = 768
): Promise<void> {
  try {
    // First test the connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error(
        "Cannot connect to Qdrant database. Please check your configuration."
      );
    }

    // Check if collection already exists
    try {
      await client.getCollection(name);
      console.log(`Collection "${name}" already exists`);
      return;
    } catch (error: any) {
      // Collection doesn't exist, create it
      console.log(`Collection "${name}" does not exist, creating...`);

      // Check if it's a different error than "not found"
      if (error.status && error.status !== 404) {
        console.error("Unexpected error checking collection:", error);
        throw error;
      }
    }

    await client.createCollection(name, {
      vectors: {
        size: dimension,
        distance: "Cosine",
      },
    });

    console.log(
      `Collection "${name}" created successfully with dimension ${dimension}`
    );
  } catch (error: any) {
    console.error(`Error creating collection "${name}":`, error);

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
