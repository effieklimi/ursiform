import { processNaturalQuery } from "../../lib/qdrant/nlp-query";
import { getConfig } from "../../lib/config";
import { client } from "../../lib/qdrant/db";

// Mock dependencies
jest.mock("../../lib/config");
jest.mock("../../lib/qdrant/db");
jest.mock("../../lib/qdrant/embedder");
jest.mock("openai");
jest.mock("@google/genai");

const mockedGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
const mockedClient = client as jest.Mocked<typeof client>;

describe("NLP Query Module", () => {
  beforeEach(() => {
    jest.resetAllMocks();

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
          apiKey: "test-openai-key",
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

    // Mock Qdrant client methods
    mockedClient.getCollections = jest.fn();
    mockedClient.count = jest.fn();
    mockedClient.scroll = jest.fn();
    mockedClient.search = jest.fn();
  });

  describe("processNaturalQuery", () => {
    beforeEach(() => {
      // Mock basic collection info
      mockedClient.getCollections.mockResolvedValue({
        collections: [
          { name: "test_collection" },
          { name: "docs" },
          { name: "artists" },
        ],
      } as any);
    });

    it("should handle database information queries", async () => {
      mockedClient.count.mockResolvedValueOnce({ count: 100 } as any);
      mockedClient.count.mockResolvedValueOnce({ count: 50 } as any);
      mockedClient.count.mockResolvedValueOnce({ count: 25 } as any);

      const result = await processNaturalQuery(
        null,
        "how many collections in my database",
        "openai"
      );

      expect(result.answer).toContain("collections");
      expect(result.query_type).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should handle collection-specific queries", async () => {
      mockedClient.count.mockResolvedValue({ count: 75 } as any);

      const result = await processNaturalQuery(
        "test_collection",
        "how many vectors in this collection",
        "openai"
      );

      expect(result.answer).toContain("75");
      expect(result.query_type).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should handle search queries with vector search", async () => {
      // Mock embedding
      const mockEmbed = require("../../lib/qdrant/embedder");
      mockEmbed.embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      mockedClient.search.mockResolvedValue([
        {
          id: "1",
          score: 0.95,
          payload: { text: "test result 1", metadata: "meta1" },
        },
        {
          id: "2",
          score: 0.88,
          payload: { text: "test result 2", metadata: "meta2" },
        },
      ] as any);

      const result = await processNaturalQuery(
        "vectors",
        "find documents about machine learning",
        "openai"
      );

      expect(result.answer).toContain("result");
      expect(result.query_type).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
      expect(mockEmbed.embed).toHaveBeenCalled();
    });

    it("should handle queries when no results found", async () => {
      const mockEmbed = require("../../lib/qdrant/embedder");
      mockEmbed.embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      mockedClient.search.mockResolvedValue([]);

      const result = await processNaturalQuery(
        "vectors",
        "find something that doesn't exist",
        "openai"
      );

      expect(result.answer).toContain("no");
      expect(result.query_type).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should handle embedding errors gracefully", async () => {
      const mockEmbed = require("../../lib/qdrant/embedder");
      mockEmbed.embed = jest
        .fn()
        .mockRejectedValue(new Error("Embedding failed"));

      const result = await processNaturalQuery(
        "vectors",
        "search for something",
        "openai"
      );

      expect(result.answer).toBeDefined();
      expect(result.query_type).toBe("fallback");
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should handle search errors gracefully", async () => {
      const mockEmbed = require("../../lib/qdrant/embedder");
      mockEmbed.embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      mockedClient.search.mockRejectedValue(new Error("Search failed"));

      const result = await processNaturalQuery(
        "vectors",
        "search for something",
        "openai"
      );

      expect(result.answer).toBeDefined();
      expect(result.query_type).toBe("fallback");
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should handle different embedding providers", async () => {
      const mockEmbed = require("../../lib/qdrant/embedder");
      mockEmbed.embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      mockedClient.search.mockResolvedValue([]);

      // Test with Gemini
      await processNaturalQuery("vectors", "find documents", "gemini");

      expect(mockEmbed.embed).toHaveBeenCalledWith("documents", "gemini");
    });

    it("should handle list queries", async () => {
      mockedClient.scroll.mockResolvedValue({
        points: [
          {
            id: "1",
            payload: { text: "document 1", title: "Title 1" },
          },
          {
            id: "2",
            payload: { text: "document 2", title: "Title 2" },
          },
        ],
        next_page_offset: null,
      } as any);

      const result = await processNaturalQuery(
        "vectors",
        "list all documents",
        "openai"
      );

      expect(result.answer).toContain("document");
      expect(result.query_type).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should include conversation context", async () => {
      const context = {
        conversationHistory: [
          {
            role: "user" as const,
            content: "I want to search artists collection",
          },
        ],
      };

      const result = await processNaturalQuery(
        "vectors",
        "find jazz musicians",
        "openai",
        undefined,
        context
      );

      expect(result.context).toBeDefined();
      expect(result.context.conversationHistory).toBeDefined();
    });

    it("should handle empty query strings", async () => {
      const result = await processNaturalQuery("vectors", "", "openai");

      expect(result.answer).toBeDefined();
      expect(result.query_type).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should handle very long queries", async () => {
      const longQuery = "search for ".repeat(1000) + "documents";

      const mockEmbed = require("../../lib/qdrant/embedder");
      mockEmbed.embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      mockedClient.search.mockResolvedValue([]);

      const result = await processNaturalQuery("vectors", longQuery, "openai");

      expect(result.answer).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should handle special characters in queries", async () => {
      const specialQuery = "find documents with @#$%^&*()";

      const mockEmbed = require("../../lib/qdrant/embedder");
      mockEmbed.embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      mockedClient.search.mockResolvedValue([]);

      const result = await processNaturalQuery(
        "vectors",
        specialQuery,
        "openai"
      );

      expect(result.answer).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should handle Unicode characters", async () => {
      const unicodeQuery = "搜索文档 🔍 about 机器学习";

      const mockEmbed = require("../../lib/qdrant/embedder");
      mockEmbed.embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      mockedClient.search.mockResolvedValue([]);

      const result = await processNaturalQuery(
        "vectors",
        unicodeQuery,
        "openai"
      );

      expect(result.answer).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should handle client connection errors", async () => {
      mockedClient.getCollections.mockRejectedValue(
        new Error("Connection failed")
      );

      const result = await processNaturalQuery(
        "vectors",
        "how many collections",
        "openai"
      );

      expect(result.answer).toBeDefined();
      expect(result.query_type).toBe("fallback");
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should include execution time", async () => {
      mockedClient.count.mockResolvedValue({ count: 100 } as any);

      const result = await processNaturalQuery(
        "vectors",
        "count vectors",
        "openai"
      );

      expect(result.execution_time_ms).toBeGreaterThan(0);
      expect(typeof result.execution_time_ms).toBe("number");
    });

    it("should return conversation context", async () => {
      mockedClient.count.mockResolvedValue({ count: 100 } as any);

      const result = await processNaturalQuery(
        "vectors",
        "count vectors",
        "openai"
      );

      expect(result.context).toBeDefined();
      expect(result.context.conversationHistory).toBeDefined();
      expect(Array.isArray(result.context.conversationHistory)).toBe(true);
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle invalid collection names", async () => {
      const result = await processNaturalQuery(
        "nonexistent_collection",
        "count vectors",
        "openai"
      );

      expect(result.answer).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it("should handle timeout scenarios", async () => {
      mockedClient.getCollections.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 35000))
      );

      const result = await processNaturalQuery(
        "vectors",
        "how many collections",
        "openai"
      );

      expect(result.answer).toBeDefined();
      expect(result.query_type).toBe("fallback");
    });

    it("should handle malformed client responses", async () => {
      mockedClient.getCollections.mockResolvedValue(null as any);

      const result = await processNaturalQuery(
        "vectors",
        "how many collections",
        "openai"
      );

      expect(result.answer).toBeDefined();
      expect(result.query_type).toBe("fallback");
    });
  });
});
