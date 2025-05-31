import { createCollection } from "../../backend/qdrant/db";

// Mock the QdrantClient
jest.mock("@qdrant/js-client-rest", () => {
  return {
    QdrantClient: jest.fn().mockImplementation((config) => ({
      getCollection: jest
        .fn()
        .mockRejectedValue(new Error("Collection not found")),
      createCollection: jest.fn().mockResolvedValue({}),
      config,
    })),
  };
});

describe("Database Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables
    delete process.env.QDRANT_API_KEY;
    delete process.env.QDRANT_URL;
  });

  describe("QdrantClient Configuration", () => {
    it("should initialize client without API key for local instance", () => {
      const { QdrantClient } = require("@qdrant/js-client-rest");

      // Re-require the module to trigger initialization
      jest.resetModules();
      require("../../backend/qdrant/db");

      expect(QdrantClient).toHaveBeenCalledWith({
        url: "http://localhost:6333",
      });
    });

    it("should initialize client with API key for cloud instance", () => {
      process.env.QDRANT_API_KEY = "test-api-key";
      process.env.QDRANT_URL = "https://test-cluster.cloud.qdrant.io:6333";

      const { QdrantClient } = require("@qdrant/js-client-rest");

      // Re-require the module to trigger initialization
      jest.resetModules();
      require("../../backend/qdrant/db");

      expect(QdrantClient).toHaveBeenCalledWith({
        url: "https://test-cluster.cloud.qdrant.io:6333",
        apiKey: "test-api-key",
      });
    });
  });

  describe("createCollection", () => {
    it("should create a collection with default parameters", async () => {
      await expect(createCollection()).resolves.toBeUndefined();
    });

    it("should create a collection with custom name and dimension", async () => {
      await expect(
        createCollection("test_collection", 512)
      ).resolves.toBeUndefined();
    });

    it("should handle existing collection gracefully", async () => {
      const { QdrantClient } = require("@qdrant/js-client-rest");
      const mockClient = new QdrantClient();
      mockClient.getCollection.mockResolvedValue({});

      await expect(
        createCollection("existing_collection")
      ).resolves.toBeUndefined();
    });

    it("should throw error when creation fails", async () => {
      const { QdrantClient } = require("@qdrant/js-client-rest");
      const mockClient = new QdrantClient();
      mockClient.createCollection.mockRejectedValue(
        new Error("Creation failed")
      );

      await expect(createCollection("failed_collection")).rejects.toThrow(
        "Creation failed"
      );
    });
  });
});
