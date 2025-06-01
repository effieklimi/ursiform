import {
  getQdrantClient,
  client,
  testConnection,
  createCollection,
} from "../../lib/qdrant/db";
import { getConfig } from "../../lib/config";
import { QdrantClient } from "@qdrant/js-client-rest";

// Mock dependencies
jest.mock("../../lib/config");
jest.mock("@qdrant/js-client-rest");

const mockedGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
const MockedQdrantClient = QdrantClient as jest.MockedClass<
  typeof QdrantClient
>;

describe("Qdrant DB Module", () => {
  let mockClient: jest.Mocked<QdrantClient>;

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock QdrantClient instance
    mockClient = {
      getCollections: jest.fn(),
      getCollection: jest.fn(),
      createCollection: jest.fn(),
      count: jest.fn(),
      search: jest.fn(),
      scroll: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    } as any;

    MockedQdrantClient.mockImplementation(() => mockClient);

    // Default config mock
    mockedGetConfig.mockReturnValue({
      qdrant: {
        url: "http://localhost:6333",
        apiKey: undefined,
        defaultCollection: "vectors",
        maxRetries: 3,
        timeout: 30000,
      },
      embeddings: {
        openai: {
          apiKey: "test-key",
          model: "text-embedding-ada-002",
          maxTokens: 8191,
        },
      },
      database: {
        url: "file:./dev.db",
      },
      app: {
        environment: "development" as const,
        logLevel: "info" as const,
        port: 3000,
      },
    });
  });

  describe("getQdrantClient", () => {
    it("should create client for local Qdrant without API key", () => {
      const client = getQdrantClient();

      expect(MockedQdrantClient).toHaveBeenCalledWith({
        url: "http://localhost:6333",
      });
      expect(client).toBeDefined();
    });

    it("should create client for cloud Qdrant with API key", () => {
      mockedGetConfig.mockReturnValue({
        qdrant: {
          url: "https://test.qdrant.cloud:6333",
          apiKey: "test-api-key",
          defaultCollection: "vectors",
          maxRetries: 3,
          timeout: 30000,
        },
        embeddings: {
          openai: {
            apiKey: "test-key",
            model: "text-embedding-ada-002",
            maxTokens: 8191,
          },
        },
        database: {
          url: "file:./dev.db",
        },
        app: {
          environment: "development" as const,
          logLevel: "info" as const,
          port: 3000,
        },
      });

      const client = getQdrantClient();

      expect(MockedQdrantClient).toHaveBeenCalledWith({
        host: "test.qdrant.cloud",
        port: null,
        https: true,
        apiKey: "test-api-key",
      });
    });

    it("should return same instance on subsequent calls", () => {
      const client1 = getQdrantClient();
      const client2 = getQdrantClient();

      expect(client1).toBe(client2);
      expect(MockedQdrantClient).toHaveBeenCalledTimes(1);
    });

    it("should handle HTTP cloud URL correctly", () => {
      mockedGetConfig.mockReturnValue({
        qdrant: {
          url: "http://test.qdrant.cloud:6333",
          apiKey: "test-api-key",
          defaultCollection: "vectors",
          maxRetries: 3,
          timeout: 30000,
        },
        embeddings: {
          openai: {
            apiKey: "test-key",
            model: "text-embedding-ada-002",
            maxTokens: 8191,
          },
        },
        database: {
          url: "file:./dev.db",
        },
        app: {
          environment: "development" as const,
          logLevel: "info" as const,
          port: 3000,
        },
      });

      getQdrantClient();

      expect(MockedQdrantClient).toHaveBeenCalledWith({
        host: "test.qdrant.cloud",
        port: null,
        https: false,
        apiKey: "test-api-key",
      });
    });
  });

  describe("client proxy", () => {
    it("should proxy method calls to the underlying client", () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });

      client.getCollections();

      expect(mockClient.getCollections).toHaveBeenCalled();
    });

    it("should handle property access", () => {
      const mockProperty = "test-property";
      (mockClient as any).someProperty = mockProperty;

      const result = (client as any).someProperty;

      expect(result).toBe(mockProperty);
    });
  });

  describe("testConnection", () => {
    it("should return true for successful connection", async () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });

      const result = await testConnection();

      expect(result).toBe(true);
      expect(mockClient.getCollections).toHaveBeenCalled();
    });

    it("should return false for failed connection", async () => {
      mockClient.getCollections.mockRejectedValue(
        new Error("Connection failed")
      );

      const result = await testConnection();

      expect(result).toBe(false);
    });

    it("should handle timeout", async () => {
      // Mock slow connection
      mockClient.getCollections.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 35000))
      );

      const result = await testConnection();

      expect(result).toBe(false);
    });

    it("should handle authentication errors", async () => {
      const authError = new Error("Authentication failed");
      (authError as any).status = 401;

      mockClient.getCollections.mockRejectedValue(authError);

      const result = await testConnection();

      expect(result).toBe(false);
    });

    it("should handle network errors", async () => {
      const networkError = new Error("ECONNREFUSED");
      (networkError as any).code = "ECONNREFUSED";

      mockClient.getCollections.mockRejectedValue(networkError);

      const result = await testConnection();

      expect(result).toBe(false);
    });
  });

  describe("createCollection", () => {
    beforeEach(() => {
      // Mock successful connection test
      mockClient.getCollections.mockResolvedValue({ collections: [] });
    });

    it("should create collection with default parameters", async () => {
      // Mock collection doesn't exist
      const notFoundError = new Error("Collection not found");
      (notFoundError as any).status = 404;
      mockClient.getCollection.mockRejectedValue(notFoundError);

      mockClient.createCollection.mockResolvedValue({} as any);

      await createCollection();

      expect(mockClient.createCollection).toHaveBeenCalledWith("vectors", {
        vectors: {
          size: 768,
          distance: "Cosine",
        },
      });
    });

    it("should create collection with custom name and dimension", async () => {
      // Mock collection doesn't exist
      const notFoundError = new Error("Collection not found");
      (notFoundError as any).status = 404;
      mockClient.getCollection.mockRejectedValue(notFoundError);

      mockClient.createCollection.mockResolvedValue({} as any);

      await createCollection("custom_collection", 1536);

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "custom_collection",
        {
          vectors: {
            size: 1536,
            distance: "Cosine",
          },
        }
      );
    });

    it("should not create collection if it already exists", async () => {
      // Mock collection exists
      mockClient.getCollection.mockResolvedValue({ name: "vectors" } as any);

      await createCollection();

      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });

    it("should handle creation errors gracefully", async () => {
      // Mock collection doesn't exist
      const notFoundError = new Error("Collection not found");
      (notFoundError as any).status = 404;
      mockClient.getCollection.mockRejectedValue(notFoundError);

      // Mock creation failure
      const creationError = new Error("Creation failed");
      mockClient.createCollection.mockRejectedValue(creationError);

      await expect(createCollection()).rejects.toThrow("Creation failed");
    });

    it("should handle authentication errors during creation", async () => {
      // Mock collection doesn't exist
      const notFoundError = new Error("Collection not found");
      (notFoundError as any).status = 404;
      mockClient.getCollection.mockRejectedValue(notFoundError);

      // Mock authentication error
      const authError = new Error("Authentication failed");
      (authError as any).status = 401;
      mockClient.createCollection.mockRejectedValue(authError);

      await expect(createCollection()).rejects.toThrow(
        "Authentication failed. Please check your QDRANT_API_KEY and QDRANT_URL."
      );
    });

    it("should handle connection errors during creation", async () => {
      // Mock collection doesn't exist
      const notFoundError = new Error("Collection not found");
      (notFoundError as any).status = 404;
      mockClient.getCollection.mockRejectedValue(notFoundError);

      // Mock connection error
      const connectionError = new Error("Connection refused");
      (connectionError as any).code = "ECONNREFUSED";
      mockClient.createCollection.mockRejectedValue(connectionError);

      await expect(createCollection()).rejects.toThrow(
        "Cannot connect to Qdrant. Please check your QDRANT_URL."
      );
    });

    it("should fail if connection test fails", async () => {
      // Mock failed connection test
      mockClient.getCollections.mockRejectedValue(new Error("No connection"));

      await expect(createCollection()).rejects.toThrow(
        "Cannot connect to Qdrant database. Please check your configuration."
      );
    });

    it("should handle unexpected errors during collection check", async () => {
      // Mock unexpected error (not 404)
      const unexpectedError = new Error("Server error");
      (unexpectedError as any).status = 500;
      mockClient.getCollection.mockRejectedValue(unexpectedError);

      await expect(createCollection()).rejects.toThrow("Server error");
    });

    it("should handle forbidden errors", async () => {
      // Mock collection doesn't exist
      const notFoundError = new Error("Collection not found");
      (notFoundError as any).status = 404;
      mockClient.getCollection.mockRejectedValue(notFoundError);

      // Mock forbidden error
      const forbiddenError = new Error("Forbidden");
      (forbiddenError as any).status = 403;
      mockClient.createCollection.mockRejectedValue(forbiddenError);

      await expect(createCollection()).rejects.toThrow(
        "Authentication failed. Please check your QDRANT_API_KEY and QDRANT_URL."
      );
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle malformed URLs", () => {
      mockedGetConfig.mockReturnValue({
        qdrant: {
          url: "invalid://url:with:too:many:colons",
          apiKey: "test-key",
          defaultCollection: "vectors",
          maxRetries: 3,
          timeout: 30000,
        },
        embeddings: {
          openai: {
            apiKey: "test-key",
            model: "text-embedding-ada-002",
            maxTokens: 8191,
          },
        },
        database: {
          url: "file:./dev.db",
        },
        app: {
          environment: "development" as const,
          logLevel: "info" as const,
          port: 3000,
        },
      });

      // Should not throw during client creation, but may fail during usage
      expect(() => getQdrantClient()).not.toThrow();
    });

    it("should handle empty collection name", async () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });

      const notFoundError = new Error("Collection not found");
      (notFoundError as any).status = 404;
      mockClient.getCollection.mockRejectedValue(notFoundError);

      mockClient.createCollection.mockResolvedValue({} as any);

      // Should use default collection name when empty string is passed
      await createCollection("");

      expect(mockClient.createCollection).toHaveBeenCalledWith("vectors", {
        vectors: {
          size: 768,
          distance: "Cosine",
        },
      });
    });

    it("should handle very large dimension values", async () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });

      const notFoundError = new Error("Collection not found");
      (notFoundError as any).status = 404;
      mockClient.getCollection.mockRejectedValue(notFoundError);

      mockClient.createCollection.mockResolvedValue({} as any);

      await createCollection("large_vectors", 4096);

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "large_vectors",
        {
          vectors: {
            size: 4096,
            distance: "Cosine",
          },
        }
      );
    });

    it("should handle very small dimension values", async () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });

      const notFoundError = new Error("Collection not found");
      (notFoundError as any).status = 404;
      mockClient.getCollection.mockRejectedValue(notFoundError);

      mockClient.createCollection.mockResolvedValue({} as any);

      await createCollection("small_vectors", 1);

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "small_vectors",
        {
          vectors: {
            size: 1,
            distance: "Cosine",
          },
        }
      );
    });
  });
});
