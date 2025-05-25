import { createCollection } from "../../src/qdrant/db";

// Mock the QdrantClient
jest.mock("@qdrant/js-client-rest", () => {
  return {
    QdrantClient: jest.fn().mockImplementation(() => ({
      getCollection: jest
        .fn()
        .mockRejectedValue(new Error("Collection not found")),
      createCollection: jest.fn().mockResolvedValue({}),
    })),
  };
});

describe("Database Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
