import Fastify from "fastify";
import { documentsRoutes } from "../../backend/routes/documents";

// Mock external dependencies
jest.mock("../../backend/qdrant/db", () => ({
  createCollection: jest.fn().mockResolvedValue(undefined),
  client: {
    search: jest.fn(),
    upsert: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("../../backend/qdrant/embedder", () => ({
  embed: jest.fn(),
}));

describe("Documents Routes Tests", () => {
  let app: any;

  beforeEach(async () => {
    app = Fastify();
    await app.register(documentsRoutes);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /collections/:collection/documents", () => {
    it("should add a document successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections/test_collection/documents",
        payload: {
          document: {
            id: "doc-1",
            text: "This is a test document about machine learning",
            metadata: {
              category: "ML",
              author: "John Doe",
            },
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body).toEqual({
        success: true,
        id: "doc-1",
        message: "Document doc-1 added successfully",
      });

      // Verify embedding was called
      const { embed } = require("../../backend/qdrant/embedder");
      expect(embed).toHaveBeenCalledWith(
        "This is a test document about machine learning"
      );

      // Verify upsert was called with correct data
      const { client } = require("../../backend/qdrant/db");
      expect(client.upsert).toHaveBeenCalledWith("test_collection", {
        wait: true,
        points: [
          {
            id: "doc-1",
            vector: [0.1, 0.2, 0.3, 0.4, 0.5],
            payload: {
              text: "This is a test document about machine learning",
              category: "ML",
              author: "John Doe",
              created_at: expect.any(String),
            },
          },
        ],
      });
    });

    it("should handle document without metadata", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections/test_collection/documents",
        payload: {
          document: {
            id: "doc-2",
            text: "Simple document without metadata",
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.id).toBe("doc-2");
    });

    it("should return 400 for invalid request body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections/test_collection/documents",
        payload: {
          document: {
            id: "doc-3",
            text: "", // Invalid empty text
          },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("Validation error");
    });

    it("should handle embedding generation error", async () => {
      const { embed } = require("../../backend/qdrant/embedder");
      embed.mockRejectedValue(new Error("Embedding failed"));

      const response = await app.inject({
        method: "POST",
        url: "/collections/test_collection/documents",
        payload: {
          document: {
            id: "doc-4",
            text: "This will fail",
          },
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("Internal server error");
    });
  });

  describe("POST /collections/:collection/documents/bulk", () => {
    it("should add multiple documents successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections/test_collection/documents/bulk",
        payload: {
          documents: [
            {
              id: "doc-1",
              text: "First document about AI",
              metadata: { category: "AI" },
            },
            {
              id: "doc-2",
              text: "Second document about ML",
              metadata: { category: "ML" },
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toEqual({
        success: true,
        processed: 2,
        failed: 0,
        results: [
          { id: "doc-1", success: true },
          { id: "doc-2", success: true },
        ],
      });

      // Verify embedding was called for each document
      const { embed } = require("../../backend/qdrant/embedder");
      expect(embed).toHaveBeenCalledTimes(2);
      expect(embed).toHaveBeenCalledWith("First document about AI");
      expect(embed).toHaveBeenCalledWith("Second document about ML");

      // Verify bulk upsert was called
      const { client } = require("../../backend/qdrant/db");
      expect(client.upsert).toHaveBeenCalledWith("test_collection", {
        wait: true,
        points: expect.arrayContaining([
          expect.objectContaining({
            id: "doc-1",
            vector: [0.1, 0.2, 0.3, 0.4, 0.5],
            payload: expect.objectContaining({
              text: "First document about AI",
              category: "AI",
            }),
          }),
          expect.objectContaining({
            id: "doc-2",
            vector: [0.1, 0.2, 0.3, 0.4, 0.5],
            payload: expect.objectContaining({
              text: "Second document about ML",
              category: "ML",
            }),
          }),
        ]),
      });
    });

    it("should handle partial failures in bulk operation", async () => {
      const { embed } = require("../../backend/qdrant/embedder");
      embed
        .mockResolvedValueOnce([0.1, 0.2, 0.3, 0.4, 0.5]) // First document succeeds
        .mockRejectedValueOnce(new Error("Embedding failed")); // Second document fails

      const response = await app.inject({
        method: "POST",
        url: "/collections/test_collection/documents/bulk",
        payload: {
          documents: [
            {
              id: "doc-1",
              text: "This will succeed",
            },
            {
              id: "doc-2",
              text: "This will fail",
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toEqual({
        success: true,
        processed: 1,
        failed: 1,
        results: [
          { id: "doc-1", success: true },
          { id: "doc-2", success: false, error: "Embedding failed" },
        ],
      });
    });

    it("should return 400 for invalid bulk request", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections/test_collection/documents/bulk",
        payload: {
          documents: [
            {
              id: "doc-1",
              text: "", // Invalid empty text
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("Validation error");
    });

    it("should handle empty documents array", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections/test_collection/documents/bulk",
        payload: {
          documents: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toEqual({
        success: true,
        processed: 0,
        failed: 0,
        results: [],
      });
    });
  });
});
