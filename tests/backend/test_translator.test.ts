import { translateAndSearch } from "../../backend/qdrant/translator";

// Mock qdrant dependencies
jest.mock("../../backend/qdrant/embedder", () => ({
  embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]),
}));

// Mock the Qdrant client
jest.mock("../../backend/qdrant/db", () => ({
  client: {
    search: jest.fn().mockResolvedValue([
      {
        id: "test-id-1",
        score: 0.95,
        payload: { title: "Test Document 1" },
      },
      {
        id: "test-id-2",
        score: 0.88,
        payload: { title: "Test Document 2" },
      },
    ]),
  },
}));

describe("Translator Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("translateAndSearch", () => {
    it("should translate query and return search results", async () => {
      const input = {
        query: "test query",
        k: 5,
      };

      const result = await translateAndSearch(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "test-id-1",
        score: 0.95,
        payload: { title: "Test Document 1" },
      });
      expect(result[1]).toEqual({
        id: "test-id-2",
        score: 0.88,
        payload: { title: "Test Document 2" },
      });
    });

    it("should handle search with filters", async () => {
      const input = {
        query: "test query",
        filters: { category: "documents" },
        k: 3,
      };

      const result = await translateAndSearch(input);

      expect(result).toHaveLength(2);

      // Verify that the client.search was called with filters
      const { client } = require("../../backend/qdrant/db");
      expect(client.search).toHaveBeenCalledWith("my_collection", {
        vector: [0.1, 0.2, 0.3, 0.4, 0.5],
        limit: 3,
        filter: {
          must: [
            {
              key: "category",
              match: { value: "documents" },
            },
          ],
        },
      });
    });

    it("should use default k value when not provided", async () => {
      const input = {
        query: "test query",
      };

      await translateAndSearch(input);

      const { client } = require("../../backend/qdrant/db");
      expect(client.search).toHaveBeenCalledWith("my_collection", {
        vector: [0.1, 0.2, 0.3, 0.4, 0.5],
        limit: 5,
        filter: undefined,
      });
    });

    it("should throw error when embedding fails", async () => {
      const { embed } = require("../../backend/qdrant/embedder");
      embed.mockRejectedValue(new Error("Embedding failed"));

      await expect(translateAndSearch({ query: "test" })).rejects.toThrow(
        "Failed to perform translate and search"
      );
    });

    it("should throw error when search fails", async () => {
      const { client } = require("../../backend/qdrant/db");
      client.search.mockRejectedValue(new Error("Search failed"));

      await expect(translateAndSearch({ query: "test" })).rejects.toThrow(
        "Failed to perform translate and search"
      );
    });
  });
});
