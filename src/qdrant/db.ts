import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
});

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
