import {
  IVectorRepository,
  Vector,
} from "../../core/interfaces/IVectorRepository";
import {
  SearchQuery,
  SearchResult,
  UpsertResult,
  CollectionConfig,
  CollectionInfo,
  SearchHit,
} from "../../core/entities/types";
import { getQdrantClient, testQdrantConnection } from "./connection";
import { getConfig } from "../../../lib/config";
import {
  CollectionNotFoundError,
  QdrantConnectionError,
  SearchOperationError,
  ValidationError,
  CollectionCreationError,
  AuthenticationError,
  ConfigurationError,
} from "../../../lib/errors";

export class QdrantVectorRepository implements IVectorRepository {
  private client = getQdrantClient();

  async search(collection: string, query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      if (!query.vector && !query.text) {
        throw new ValidationError(
          "query",
          query,
          "Either vector or text must be provided"
        );
      }

      if (!query.vector) {
        throw new ValidationError(
          "query.vector",
          query.vector,
          "Vector is required for search"
        );
      }

      // Build filter object if filters are provided
      let filter;
      if (query.filters && Object.keys(query.filters).length > 0) {
        filter = {
          must: Object.entries(query.filters).map(([key, value]) => ({
            key,
            match: { value },
          })),
        };
      }

      const searchResult = await this.client.search(collection, {
        vector: query.vector,
        limit: query.limit || 5,
        filter,
        score_threshold: query.scoreThreshold,
      });

      const hits: SearchHit[] = searchResult.map((point) => ({
        id: point.id.toString(),
        score: point.score,
        payload: point.payload || {},
      }));

      return {
        hits,
        executionTimeMs: Date.now() - startTime,
        totalCount: hits.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (
        errorMessage.includes("collection") &&
        errorMessage.includes("not found")
      ) {
        throw new CollectionNotFoundError(collection);
      }

      if (
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout")
      ) {
        throw new QdrantConnectionError(error as Error, "search operation");
      }

      throw new SearchOperationError(
        error as Error,
        query.text || "vector query",
        collection
      );
    }
  }

  async upsert(collection: string, vectors: Vector[]): Promise<UpsertResult> {
    try {
      if (!vectors || vectors.length === 0) {
        throw new ValidationError(
          "vectors",
          vectors,
          "Vectors array cannot be empty"
        );
      }

      const points = vectors.map((vector) => ({
        id: vector.id,
        vector: vector.embedding,
        payload: vector.payload,
      }));

      const result = await this.client.upsert(collection, {
        wait: true,
        points,
      });

      return {
        operation_id: result.operation_id || 0,
        status: result.status === "completed" ? "completed" : "acknowledged",
        updated_count: vectors.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (
        errorMessage.includes("collection") &&
        errorMessage.includes("not found")
      ) {
        throw new CollectionNotFoundError(collection);
      }

      throw new Error(`Failed to upsert vectors: ${error}`);
    }
  }

  async delete(collection: string, ids: string[]): Promise<boolean> {
    try {
      if (!ids || ids.length === 0) {
        throw new ValidationError("ids", ids, "IDs array cannot be empty");
      }

      await this.client.delete(collection, {
        wait: true,
        points: ids,
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (
        errorMessage.includes("collection") &&
        errorMessage.includes("not found")
      ) {
        throw new CollectionNotFoundError(collection);
      }

      console.error(`Failed to delete vectors: ${error}`);
      return false;
    }
  }

  async createCollection(
    name: string,
    config: CollectionConfig
  ): Promise<void> {
    try {
      // First test the connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        const configData = getConfig();
        throw new QdrantConnectionError(
          new Error("Connection test failed"),
          "collection creation",
          configData.qdrant.url
        );
      }

      // Check if collection already exists
      try {
        await this.client.getCollection(name);
        console.log(`Collection "${name}" already exists`);
        return;
      } catch (error: any) {
        // Collection doesn't exist, continue with creation
        if (error.status && error.status !== 404) {
          if (error.status === 401 || error.status === 403) {
            throw new AuthenticationError("Qdrant", "collection access");
          }
          throw new CollectionCreationError(name, error);
        }
      }

      // Validate dimension parameter
      if (config.dimension <= 0 || config.dimension > 65536) {
        throw new ConfigurationError(
          "dimension",
          `Dimension must be between 1 and 65536, got ${config.dimension}`
        );
      }

      await this.client.createCollection(name, {
        vectors: {
          size: config.dimension,
          distance: config.distance || "Cosine",
          on_disk: config.onDiskPayload || false,
        },
      });

      console.log(
        `Collection "${name}" created successfully with dimension ${config.dimension}`
      );
    } catch (error) {
      if (error instanceof Error && error.constructor.name.endsWith("Error")) {
        throw error; // Re-throw known errors
      }
      throw new CollectionCreationError(name, error as Error);
    }
  }

  async getCollections(): Promise<CollectionInfo[]> {
    try {
      const result = await this.client.getCollections();

      return result.collections.map((collection) => ({
        name: collection.name,
        dimension: 0, // We'll get this from individual collection calls if needed
        vectorCount: 0, // Same here - collections list doesn't include detailed info
        status: "active",
      }));
    } catch (error) {
      throw new Error(`Failed to get collections: ${error}`);
    }
  }

  async getCollection(name: string): Promise<CollectionInfo> {
    try {
      const result = await this.client.getCollection(name);

      // Extract dimension from vectors config with proper type handling
      let dimension = 0;
      if (result.config?.params?.vectors) {
        const vectorConfig = result.config.params.vectors;
        // Handle both object config and direct size
        if (
          typeof vectorConfig === "object" &&
          vectorConfig !== null &&
          "size" in vectorConfig
        ) {
          dimension = (vectorConfig as any).size;
        } else if (typeof vectorConfig === "number") {
          dimension = vectorConfig;
        }
      }

      return {
        name: name, // Use the provided name since result might not have it
        dimension: dimension,
        vectorCount:
          typeof result.vectors_count === "number" ? result.vectors_count : 0,
        status: result.status || "active",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (errorMessage.includes("not found") || (error as any).status === 404) {
        throw new CollectionNotFoundError(name);
      }

      throw new Error(`Failed to get collection ${name}: ${error}`);
    }
  }

  async deleteCollection(name: string): Promise<boolean> {
    try {
      await this.client.deleteCollection(name);
      console.log(`Collection "${name}" deleted successfully`);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (errorMessage.includes("not found") || (error as any).status === 404) {
        throw new CollectionNotFoundError(name);
      }

      console.error(`Failed to delete collection ${name}: ${error}`);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    return testQdrantConnection();
  }
}
