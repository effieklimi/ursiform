import {
  loadConfig,
  getConfig,
  hasProvider,
  getAvailableProviders,
} from "../../lib/config";
import { z } from "zod";

// Mock environment variables
const originalEnv = process.env;

describe("Config Module", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear any cached config
    delete (global as any).__ursiform_config_cache__;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("loadConfig", () => {
    it("should load minimal valid configuration", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "test-openai-key";

      const config = loadConfig();

      expect(config.qdrant.url).toBe("http://localhost:6333");
      expect(config.embeddings.openai?.apiKey).toBe("test-openai-key");
      expect(config.app.environment).toBe("development");
      expect(config.qdrant.defaultCollection).toBe("vectors");
    });

    it("should load full configuration with all providers", () => {
      process.env.QDRANT_URL = "https://test.qdrant.cloud:6333";
      process.env.QDRANT_API_KEY = "test-qdrant-key";
      process.env.QDRANT_DEFAULT_COLLECTION = "custom_collection";
      process.env.QDRANT_TIMEOUT = "15000";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.DATABASE_URL = "postgresql://test";
      (process.env as any).NODE_ENV = "production";
      process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

      const config = loadConfig();

      expect(config.qdrant.url).toBe("https://test.qdrant.cloud:6333");
      expect(config.qdrant.apiKey).toBe("test-qdrant-key");
      expect(config.qdrant.defaultCollection).toBe("custom_collection");
      expect(config.qdrant.timeout).toBe(15000);
      expect(config.embeddings.openai?.apiKey).toBe("test-openai-key");
      expect(config.embeddings.gemini?.apiKey).toBe("test-gemini-key");
      expect(config.database.url).toBe("postgresql://test");
      expect(config.app.environment).toBe("production");
    });

    it("should throw error when no Qdrant URL is provided", () => {
      delete process.env.QDRANT_URL;

      expect(() => loadConfig()).toThrow("QDRANT_URL is required");
    });

    it("should throw error when no embedding providers are configured", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      expect(() => loadConfig()).toThrow(
        "At least one embedding provider must be configured"
      );
    });

    it("should throw error for invalid Qdrant URL", () => {
      process.env.QDRANT_URL = "invalid-url";
      process.env.OPENAI_API_KEY = "test-key";

      expect(() => loadConfig()).toThrow("Invalid url");
    });

    it("should throw error for invalid timeout", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.QDRANT_TIMEOUT = "invalid";
      process.env.OPENAI_API_KEY = "test-key";

      expect(() => loadConfig()).toThrow();
    });

    it("should throw error for negative timeout", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.QDRANT_TIMEOUT = "-1000";
      process.env.OPENAI_API_KEY = "test-key";

      expect(() => loadConfig()).toThrow();
    });

    it("should use default timeout when not provided", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "test-key";
      delete process.env.QDRANT_TIMEOUT;

      const config = loadConfig();

      expect(config.qdrant.timeout).toBe(10000);
    });

    it("should handle https production requirements", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.QDRANT_URL = "http://localhost:6333"; // HTTP in production
      process.env.OPENAI_API_KEY = "test-key";

      // Should not throw for localhost even in production
      expect(() => loadConfig()).not.toThrow();
    });

    it("should validate Gemini model configurations", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.GEMINI_MODEL = "gemini-1.5-pro";

      const config = loadConfig();

      expect(config.embeddings.gemini?.model).toBe("gemini-1.5-pro");
    });

    it("should validate OpenAI model configurations", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.OPENAI_MODEL = "text-embedding-3-large";

      const config = loadConfig();

      expect(config.embeddings.openai?.model).toBe("text-embedding-3-large");
    });
  });

  describe("getConfig", () => {
    it("should return cached config on subsequent calls", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "test-key";

      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2); // Same instance
    });

    it("should call loadConfig only once", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "test-key";

      const loadConfigSpy = jest.spyOn(
        require("../../lib/config"),
        "loadConfig"
      );

      getConfig();
      getConfig();

      expect(loadConfigSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("hasProvider", () => {
    it("should return true for configured OpenAI provider", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "test-key";

      expect(hasProvider("openai")).toBe(true);
    });

    it("should return true for configured Gemini provider", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.GEMINI_API_KEY = "test-key";

      expect(hasProvider("gemini")).toBe(true);
    });

    it("should return false for unconfigured provider", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "test-key";
      delete process.env.GEMINI_API_KEY;

      expect(hasProvider("gemini")).toBe(false);
    });

    it("should handle both providers configured", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GEMINI_API_KEY = "test-gemini-key";

      expect(hasProvider("openai")).toBe(true);
      expect(hasProvider("gemini")).toBe(true);
    });
  });

  describe("getAvailableProviders", () => {
    it("should return OpenAI when only OpenAI is configured", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "test-key";
      delete process.env.GEMINI_API_KEY;

      const config = loadConfig();
      const providers = getAvailableProviders(config);

      expect(providers).toEqual(["openai"]);
    });

    it("should return Gemini when only Gemini is configured", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.GEMINI_API_KEY = "test-key";
      delete process.env.OPENAI_API_KEY;

      const config = loadConfig();
      const providers = getAvailableProviders(config);

      expect(providers).toEqual(["gemini"]);
    });

    it("should return both providers when both are configured", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const config = loadConfig();
      const providers = getAvailableProviders(config);

      expect(providers).toEqual(["openai", "gemini"]);
    });

    it("should return empty array when no providers are configured", () => {
      // This scenario should not happen in practice due to validation
      // but we test the function behavior
      const mockConfig = {
        embeddings: {},
      } as any;

      const providers = getAvailableProviders(mockConfig);

      expect(providers).toEqual([]);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle empty string environment variables", () => {
      process.env.QDRANT_URL = "";
      process.env.OPENAI_API_KEY = "test-key";

      expect(() => loadConfig()).toThrow();
    });

    it("should handle whitespace-only environment variables", () => {
      process.env.QDRANT_URL = "   ";
      process.env.OPENAI_API_KEY = "test-key";

      expect(() => loadConfig()).toThrow();
    });

    it("should handle very large timeout values", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.QDRANT_TIMEOUT = "999999999";
      process.env.OPENAI_API_KEY = "test-key";

      const config = loadConfig();

      expect(config.qdrant.timeout).toBe(999999999);
    });

    it("should handle special characters in API keys", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.OPENAI_API_KEY = "sk-test!@#$%^&*()_+{}|:<>?[]\\;',./";

      const config = loadConfig();

      expect(config.embeddings.openai?.apiKey).toBe(
        "sk-test!@#$%^&*()_+{}|:<>?[]\\;',./"
      );
    });

    it("should handle Unicode characters in collection names", () => {
      process.env.QDRANT_URL = "http://localhost:6333";
      process.env.QDRANT_DEFAULT_COLLECTION = "тест_коллекция";
      process.env.OPENAI_API_KEY = "test-key";

      const config = loadConfig();

      expect(config.qdrant.defaultCollection).toBe("тест_коллекция");
    });
  });

  describe("Configuration validation", () => {
    it("should validate URL format strictly", () => {
      const invalidUrls = [
        "localhost:6333",
        "://localhost:6333",
        "http//localhost:6333",
        "http:localhost:6333",
        "ftp://localhost:6333",
      ];

      for (const url of invalidUrls) {
        process.env.QDRANT_URL = url;
        process.env.OPENAI_API_KEY = "test-key";

        expect(() => loadConfig()).toThrow();
      }
    });

    it("should accept various valid URL formats", () => {
      const validUrls = [
        "http://localhost:6333",
        "https://localhost:6333",
        "http://127.0.0.1:6333",
        "https://test.qdrant.cloud:6333",
        "http://qdrant:6333",
      ];

      for (const url of validUrls) {
        process.env.QDRANT_URL = url;
        process.env.OPENAI_API_KEY = "test-key";

        expect(() => loadConfig()).not.toThrow();
      }
    });
  });
});
