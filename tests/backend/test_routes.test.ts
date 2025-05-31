import Fastify from "fastify";
import { collectionsRoutes } from "../../backend/routes/collections";
import { vectorsRoutes } from "../../backend/routes/vectors";
import { translateRoutes } from "../../backend/routes/translate";
import { healthRoutes } from "../../backend/routes/health";

// Mock all external dependencies
jest.mock("../../backend/qdrant/db", () => ({
  createCollection: jest.fn().mockResolvedValue(undefined),
  client: {
    upsert: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("../../backend/qdrant/translator", () => ({
  translateAndSearch: jest.fn().mockResolvedValue([
    {
      id: "test-id",
      score: 0.95,
      payload: { title: "Test Document" },
    },
  ]),
}));

describe("Routes Tests", () => {
  let app: any;

  beforeEach(async () => {
    app = Fastify();
    await app.register(collectionsRoutes);
    await app.register(vectorsRoutes);
    await app.register(translateRoutes);
    await app.register(healthRoutes);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /collections", () => {
    it("should create a collection successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections",
        payload: {
          name: "test_collection",
          dimension: 512,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toEqual({ success: true });
    });

    it("should create a collection with default dimension", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections",
        payload: {
          name: "test_collection",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toEqual({ success: true });
    });

    it("should return 400 for invalid request body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections",
        payload: {
          name: "", // Invalid empty name
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /collections/:collection/vectors", () => {
    it("should upsert vectors successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections/test_collection/vectors",
        payload: {
          points: [
            {
              id: "point-1",
              vector: [0.1, 0.2, 0.3],
              payload: { title: "Test Document" },
            },
            {
              id: "point-2",
              vector: [0.4, 0.5, 0.6],
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ upserted: 2 });
    });

    it("should return 400 for invalid request body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/collections/test_collection/vectors",
        payload: {
          points: [
            {
              id: "point-1",
              // Missing vector field
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /translate-query", () => {
    it("should translate and search successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/translate-query",
        payload: {
          query: "test query",
          k: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual([
        {
          id: "test-id",
          score: 0.95,
          payload: { title: "Test Document" },
        },
      ]);
    });

    it("should handle query with filters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/translate-query",
        payload: {
          query: "test query",
          filters: { category: "documents" },
          k: 3,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(JSON.parse(response.payload))).toBe(true);
    });

    it("should return 400 for invalid request body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/translate-query",
        payload: {
          query: "", // Invalid empty query
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ status: "ok" });
    });
  });
});
