import { QdrantClient } from "@qdrant/js-client-rest";

// Initialize client with support for both local and cloud instances
const clientConfig: any = {
  url: process.env.QDRANT_URL || "http://localhost:6333",
};

// Add API key if provided (for cloud instances)
if (process.env.QDRANT_API_KEY) {
  clientConfig.apiKey = process.env.QDRANT_API_KEY;
}

const client = new QdrantClient(clientConfig);

export { client };

export async function createCollection(
  name: string = "my_collection",
  dimension: number = 768
): Promise<void> {
  try {
    // Check if collection already exists
    try {
      await client.getCollection(name);
      console.log(`Collection "${name}" already exists`);
      return;
    } catch (error) {
      // Collection doesn't exist, create it
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
  } catch (error) {
    console.error(`Error creating collection "${name}":`, error);
    throw error;
  }
}
