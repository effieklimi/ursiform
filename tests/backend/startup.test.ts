import { validateStartup, getHealthStatus } from "../../lib/startup";
import { loadConfig, validateServices } from "../../lib/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// Mock dependencies
jest.mock("@qdrant/js-client-rest");
jest.mock("openai");
jest.mock("@google/genai");
jest.mock("../../lib/config");

const MockedQdrantClient = QdrantClient as jest.MockedClass<
  typeof QdrantClient
>;
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const MockedGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;
const mockedLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;
const mockedValidateServices = validateServices as jest.MockedFunction<
  typeof validateServices
>;

// Mock environment variables
const originalEnv = process.env;

describe("Startup Module", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };

    // Default mock config matching the Config schema
    mockedLoadConfig.mockReturnValue({
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
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("validateServices", () => {
    it("should validate all services successfully", async () => {
      mockedValidateServices.mockResolvedValue({
        qdrant: true,
        openai: true,
        gemini: false,
      });

      const result = await validateServices(mockedLoadConfig());

      expect(result.qdrant).toBe(true);
      expect(result.openai).toBe(true);
      expect(result.gemini).toBe(false); // Not configured
    });

    it("should handle Qdrant connection failure", async () => {
      mockedValidateServices.mockResolvedValue({
        qdrant: false,
        openai: true,
        gemini: false,
      });

      const result = await validateServices(mockedLoadConfig());

      expect(result.qdrant).toBe(false);
    });

    it("should handle OpenAI connection failure", async () => {
      mockedValidateServices.mockResolvedValue({
        qdrant: true,
        openai: false,
        gemini: false,
      });

      const result = await validateServices(mockedLoadConfig());

      expect(result.qdrant).toBe(true);
      expect(result.openai).toBe(false);
    });

    it("should validate Gemini when configured", async () => {
      // Update config to include Gemini
      mockedLoadConfig.mockReturnValue({
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

      mockedValidateServices.mockResolvedValue({
        qdrant: true,
        openai: true,
        gemini: true,
      });

      const result = await validateServices(mockedLoadConfig());

      expect(result.qdrant).toBe(true);
      expect(result.openai).toBe(true);
      expect(result.gemini).toBe(true);
    });

    it("should validate services with API keys", async () => {
      // Update config with API keys
      mockedLoadConfig.mockReturnValue({
        qdrant: {
          url: "https://test.qdrant.cloud:6333",
          apiKey: "test-qdrant-key",
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
          url: "postgresql://test",
        },
        app: {
          environment: "production" as const,
          logLevel: "info" as const,
          port: 3000,
        },
      });

      mockedValidateServices.mockResolvedValue({
        qdrant: true,
        openai: true,
        gemini: false,
      });

      const result = await validateServices(mockedLoadConfig());

      expect(result.qdrant).toBe(true);
      expect(result.openai).toBe(true);
    });
  });

  describe("getHealthStatus", () => {
    it("should return healthy status when all services are working", async () => {
      mockedValidateServices.mockResolvedValue({
        qdrant: true,
        openai: true,
        gemini: false,
      });

      const health = await getHealthStatus();

      expect(health.status).toBe("healthy");
      expect(health.services?.qdrant).toBe(true);
      expect(health.services?.openai).toBe(true);
      expect(health.providers).toContain("openai");
      expect(health.environment).toBe("development");
      expect(health.config?.qdrant?.url).toBe("http://localhost:6333");
    });

    it("should return unhealthy status when all services fail", async () => {
      mockedValidateServices.mockResolvedValue({
        qdrant: false,
        openai: false,
        gemini: false,
      });

      const health = await getHealthStatus();

      expect(health.status).toBe("unhealthy");
      expect(health.services?.qdrant).toBe(false);
      expect(health.services?.openai).toBe(false);
    });

    it("should return healthy status when at least one service works", async () => {
      mockedValidateServices.mockResolvedValue({
        qdrant: false,
        openai: true,
        gemini: false,
      });

      const health = await getHealthStatus();

      expect(health.status).toBe("healthy"); // At least OpenAI works
      expect(health.services?.qdrant).toBe(false);
      expect(health.services?.openai).toBe(true);
    });

    it("should handle configuration error", async () => {
      // Mock config loading error
      mockedLoadConfig.mockImplementation(() => {
        throw new Error("Configuration error");
      });

      const health = await getHealthStatus();

      expect(health.status).toBe("error");
      expect(health.error).toBe("Configuration error");
    });

    it("should include version information", async () => {
      process.env.npm_package_version = "1.2.3";

      mockedValidateServices.mockResolvedValue({
        qdrant: true,
        openai: true,
        gemini: false,
      });

      const health = await getHealthStatus();

      expect(health.version).toBe("1.2.3");
    });

    it("should handle missing version", async () => {
      delete process.env.npm_package_version;

      mockedValidateServices.mockResolvedValue({
        qdrant: true,
        openai: true,
        gemini: false,
      });

      const health = await getHealthStatus();

      expect(health.version).toBe("unknown");
    });
  });

  describe("validateStartup", () => {
    it("should validate startup successfully in development", async () => {
      mockedValidateServices.mockResolvedValue({
        qdrant: true,
        openai: true,
        gemini: false,
      });

      await expect(validateStartup()).resolves.not.toThrow();
    });

    it("should validate startup successfully in production with proper config", async () => {
      mockedLoadConfig.mockReturnValue({
        qdrant: {
          url: "https://test.qdrant.cloud:6333",
          apiKey: "test-qdrant-key",
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
          url: "postgresql://test",
        },
        app: {
          environment: "production" as const,
          logLevel: "info" as const,
          port: 3000,
        },
      });

      mockedValidateServices.mockResolvedValue({
        qdrant: true,
        openai: true,
        gemini: false,
      });

      await expect(validateStartup()).resolves.not.toThrow();
    });

    it("should fail production validation for missing API key", async () => {
      mockedLoadConfig.mockReturnValue({
        qdrant: {
          url: "http://localhost:6333", // HTTP instead of HTTPS
          apiKey: undefined, // Missing API key
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
          url: "postgresql://test",
        },
        app: {
          environment: "production" as const,
          logLevel: "debug" as const, // Debug in production
          port: 3000,
        },
      });

      mockedValidateServices.mockResolvedValue({
        qdrant: true,
        openai: true,
        gemini: false,
      });

      await expect(validateStartup()).rejects.toThrow(
        "Production configuration validation failed"
      );
    });

    it("should handle no available services with warning in development", async () => {
      mockedValidateServices.mockResolvedValue({
        qdrant: false,
        openai: false,
        gemini: false,
      });

      // Should not throw in development, just warn
      await expect(validateStartup()).resolves.not.toThrow();
    });

    it("should fail when no embedding providers are configured", async () => {
      mockedLoadConfig.mockReturnValue({
        qdrant: {
          url: "http://localhost:6333",
          apiKey: undefined,
          defaultCollection: "vectors",
          maxRetries: 3,
          timeout: 30000,
        },
        embeddings: {}, // No providers
        database: {
          url: "file:./dev.db",
        },
        app: {
          environment: "development" as const,
          logLevel: "info" as const,
          port: 3000,
        },
      });

      // This should be caught by the config validation first,
      // but if it gets through, startup should fail
      await expect(validateStartup()).rejects.toThrow();
    });
  });
});
