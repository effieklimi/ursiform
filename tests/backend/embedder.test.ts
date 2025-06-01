import { embed } from "../../lib/qdrant/embedder";
import { getConfig, hasProvider } from "../../lib/config";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// Mock dependencies
jest.mock("../../lib/config");
jest.mock("openai");
jest.mock("@google/genai");

const mockedGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
const mockedHasProvider = hasProvider as jest.MockedFunction<
  typeof hasProvider
>;
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const MockedGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

describe("Embedder Module", () => {
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockGoogleGenAI: jest.Mocked<GoogleGenAI>;

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock OpenAI instance
    mockOpenAI = {
      embeddings: {
        create: jest.fn(),
      },
    } as any;

    // Mock GoogleGenAI instance
    mockGoogleGenAI = {
      models: {
        embedContent: jest.fn(),
      },
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);
    MockedGoogleGenAI.mockImplementation(() => mockGoogleGenAI);

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
        gemini: {
          apiKey: "test-gemini-key",
          model: "text-embedding-004",
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

  describe("OpenAI embeddings", () => {
    beforeEach(() => {
      mockedHasProvider.mockImplementation((provider) => provider === "openai");
    });

    it("should generate embeddings with OpenAI", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      } as any);

      const result = await embed("test text", "openai");

      expect(result).toEqual(mockEmbedding);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: "text-embedding-ada-002",
        input: "test text",
        encoding_format: "float",
      });
    });

    it("should use default provider when not specified", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      } as any);

      const result = await embed("test text");

      expect(result).toEqual(mockEmbedding);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalled();
    });

    it("should handle OpenAI API errors", async () => {
      mockedHasProvider.mockImplementation((provider) => provider === "openai");
      mockOpenAI.embeddings.create.mockRejectedValue(new Error("API Error"));

      await expect(embed("test text", "openai")).rejects.toThrow(
        "Failed to generate embedding"
      );
    });

    it("should handle rate limiting", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      (rateLimitError as any).status = 429;
      mockOpenAI.embeddings.create.mockRejectedValue(rateLimitError);

      await expect(embed("test text", "openai")).rejects.toThrow(
        "Failed to generate embedding"
      );
    });

    it("should handle authentication errors", async () => {
      const authError = new Error("Invalid API key");
      (authError as any).status = 401;
      mockOpenAI.embeddings.create.mockRejectedValue(authError);

      await expect(embed("test text", "openai")).rejects.toThrow(
        "Failed to generate embedding"
      );
    });

    it("should warn about long text input", async () => {
      const longText = "a".repeat(50000); // Very long text
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      } as any);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await embed(longText, "openai");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Text length")
      );

      consoleSpy.mockRestore();
    });

    it("should use custom model from config", async () => {
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
            model: "text-embedding-3-large",
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

      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      } as any);

      await embed("test text", "openai");

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: "text-embedding-3-large",
        input: "test text",
        encoding_format: "float",
      });
    });
  });

  describe("Gemini embeddings", () => {
    beforeEach(() => {
      mockedHasProvider.mockImplementation((provider) => provider === "gemini");
    });

    it("should generate embeddings with Gemini", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockGoogleGenAI.models.embedContent.mockResolvedValue({
        embeddings: [{ values: mockEmbedding }],
      } as any);

      const result = await embed("test text", "gemini");

      expect(result).toEqual(mockEmbedding);
      expect(mockGoogleGenAI.models.embedContent).toHaveBeenCalledWith({
        model: "text-embedding-004",
        contents: "test text",
      });
    });

    it("should handle Gemini API errors", async () => {
      mockGoogleGenAI.models.embedContent.mockRejectedValue(
        new Error("API Error")
      );

      await expect(embed("test text", "gemini")).rejects.toThrow(
        "Failed to generate embedding"
      );
    });

    it("should handle missing embedding values from Gemini", async () => {
      mockGoogleGenAI.models.embedContent.mockResolvedValue({
        embeddings: [{}], // Missing values
      } as any);

      await expect(embed("test text", "gemini")).rejects.toThrow(
        "No embedding values returned from Gemini"
      );
    });

    it("should handle empty embeddings array from Gemini", async () => {
      mockGoogleGenAI.models.embedContent.mockResolvedValue({
        embeddings: [], // Empty array
      } as any);

      await expect(embed("test text", "gemini")).rejects.toThrow(
        "No embedding values returned from Gemini"
      );
    });

    it("should use custom Gemini model from config", async () => {
      mockedGetConfig.mockReturnValue({
        qdrant: {
          url: "http://localhost:6333",
          apiKey: undefined,
          defaultCollection: "vectors",
          maxRetries: 3,
          timeout: 30000,
        },
        embeddings: {
          gemini: {
            apiKey: "test-gemini-key",
            model: "text-embedding-005",
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

      const mockEmbedding = [0.1, 0.2, 0.3];
      mockGoogleGenAI.models.embedContent.mockResolvedValue({
        embeddings: [{ values: mockEmbedding }],
      } as any);

      await embed("test text", "gemini");

      expect(mockGoogleGenAI.models.embedContent).toHaveBeenCalledWith({
        model: "text-embedding-005",
        contents: "test text",
      });
    });
  });

  describe("Provider validation", () => {
    it("should throw error for unconfigured provider", async () => {
      mockedHasProvider.mockReturnValue(false);

      await expect(embed("test text", "openai")).rejects.toThrow(
        "openai provider not configured. Check your environment variables."
      );
    });

    it("should handle unsupported provider", async () => {
      mockedHasProvider.mockReturnValue(true);

      await expect(embed("test text", "unsupported" as any)).rejects.toThrow(
        "Unsupported embedding provider: unsupported"
      );
    });

    it("should throw error when OpenAI not configured", async () => {
      mockedGetConfig.mockReturnValue({
        qdrant: {
          url: "http://localhost:6333",
          apiKey: undefined,
          defaultCollection: "vectors",
          maxRetries: 3,
          timeout: 30000,
        },
        embeddings: {}, // No providers configured
        database: {
          url: "file:./dev.db",
        },
        app: {
          environment: "development" as const,
          logLevel: "info" as const,
          port: 3000,
        },
      });

      MockedOpenAI.mockImplementation(() => {
        throw new Error(
          "OpenAI not configured. Set OPENAI_API_KEY environment variable."
        );
      });

      await expect(() => embed("test text", "openai")).rejects.toThrow(
        "Failed to generate embedding"
      );
    });

    it("should throw error when Gemini not configured", async () => {
      mockedGetConfig.mockReturnValue({
        qdrant: {
          url: "http://localhost:6333",
          apiKey: undefined,
          defaultCollection: "vectors",
          maxRetries: 3,
          timeout: 30000,
        },
        embeddings: {}, // No providers configured
        database: {
          url: "file:./dev.db",
        },
        app: {
          environment: "development" as const,
          logLevel: "info" as const,
          port: 3000,
        },
      });

      MockedGoogleGenAI.mockImplementation(() => {
        throw new Error(
          "Gemini not configured. Set GEMINI_API_KEY environment variable."
        );
      });

      await expect(() => embed("test text", "gemini")).rejects.toThrow(
        "Failed to generate embedding"
      );
    });
  });

  describe("Client lazy initialization", () => {
    it("should create OpenAI client only when needed", async () => {
      mockedHasProvider.mockImplementation((provider) => provider === "openai");

      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      } as any);

      // First call should create client
      await embed("test text 1", "openai");
      expect(MockedOpenAI).toHaveBeenCalledTimes(1);

      // Second call should reuse client
      await embed("test text 2", "openai");
      expect(MockedOpenAI).toHaveBeenCalledTimes(1);
    });

    it("should create Gemini client only when needed", async () => {
      mockedHasProvider.mockImplementation((provider) => provider === "gemini");

      const mockEmbedding = [0.1, 0.2, 0.3];
      mockGoogleGenAI.models.embedContent.mockResolvedValue({
        embeddings: [{ values: mockEmbedding }],
      } as any);

      // First call should create client
      await embed("test text 1", "gemini");
      expect(MockedGoogleGenAI).toHaveBeenCalledTimes(1);

      // Second call should reuse client
      await embed("test text 2", "gemini");
      expect(MockedGoogleGenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty text input", async () => {
      mockedHasProvider.mockImplementation((provider) => provider === "openai");

      const mockEmbedding = [0.0, 0.0, 0.0];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      } as any);

      const result = await embed("", "openai");

      expect(result).toEqual(mockEmbedding);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: "text-embedding-ada-002",
        input: "",
        encoding_format: "float",
      });
    });

    it("should handle very long text input", async () => {
      mockedHasProvider.mockImplementation((provider) => provider === "openai");

      const veryLongText = "word ".repeat(10000);
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      } as any);

      const result = await embed(veryLongText, "openai");

      expect(result).toEqual(mockEmbedding);
    });

    it("should handle special characters and Unicode", async () => {
      mockedHasProvider.mockImplementation((provider) => provider === "openai");

      const unicodeText = "Hello 👋 世界 🌍 emoji test 🚀";
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      } as any);

      const result = await embed(unicodeText, "openai");

      expect(result).toEqual(mockEmbedding);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: "text-embedding-ada-002",
        input: unicodeText,
        encoding_format: "float",
      });
    });

    it("should handle malformed API response from OpenAI", async () => {
      mockedHasProvider.mockImplementation((provider) => provider === "openai");

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [], // Empty data array
      } as any);

      await expect(embed("test text", "openai")).rejects.toThrow(
        "Failed to generate embedding"
      );
    });

    it("should handle network timeouts", async () => {
      mockedHasProvider.mockImplementation((provider) => provider === "openai");

      const timeoutError = new Error("Request timeout");
      (timeoutError as any).code = "ETIMEDOUT";
      mockOpenAI.embeddings.create.mockRejectedValue(timeoutError);

      await expect(embed("test text", "openai")).rejects.toThrow(
        "Failed to generate embedding"
      );
    });

    it("should handle quota exceeded errors", async () => {
      mockedHasProvider.mockImplementation((provider) => provider === "openai");

      const quotaError = new Error("Quota exceeded");
      (quotaError as any).status = 429;
      (quotaError as any).type = "insufficient_quota";
      mockOpenAI.embeddings.create.mockRejectedValue(quotaError);

      await expect(embed("test text", "openai")).rejects.toThrow(
        "Failed to generate embedding"
      );
    });
  });
});
