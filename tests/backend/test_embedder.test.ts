import { embed } from "../../lib/qdrant/embedder";

// Mock OpenAI
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [
            {
              embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            },
          ],
        }),
      },
    })),
  };
});

describe("Embedder Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("embed", () => {
    it("should generate embeddings for text input", async () => {
      const text = "Hello world";
      const result = await embed(text);

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(Array.isArray(result)).toBe(true);
      expect(typeof result[0]).toBe("number");
    });

    it("should handle empty text", async () => {
      const text = "";
      const result = await embed(text);

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it("should throw error when OpenAI fails", async () => {
      const OpenAI = require("openai").default;
      const mockOpenAI = new OpenAI();
      mockOpenAI.embeddings.create.mockRejectedValue(new Error("API Error"));

      await expect(embed("test")).rejects.toThrow(
        "Failed to generate embedding"
      );
    });
  });
});
