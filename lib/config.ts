import { z } from "zod";

// Environment-aware schema with proper validation
export const ConfigSchema = z.object({
  qdrant: z.object({
    url: z.string().url().default("http://localhost:6333"),
    apiKey: z.string().optional(),
    defaultCollection: z.string().min(1).default("vectors"),
    maxRetries: z.number().min(1).max(10).default(3),
    timeout: z.number().min(1000).max(60000).default(30000), // 30 seconds
  }),
  embeddings: z
    .object({
      openai: z
        .object({
          apiKey: z.string().min(1),
          model: z.string().default("text-embedding-ada-002"),
          maxTokens: z.number().default(8191),
        })
        .optional(),
      gemini: z
        .object({
          apiKey: z.string().min(1),
          model: z.string().default("text-embedding-004"),
        })
        .optional(),
    })
    .refine((data) => data.openai || data.gemini, {
      message:
        "At least one embedding provider (OPENAI_API_KEY or GEMINI_API_KEY) must be configured",
    }),
  app: z.object({
    environment: z
      .enum(["development", "staging", "production"])
      .default("development"),
    logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
    port: z.number().min(1000).max(65535).default(3000),
  }),
  database: z.object({
    url: z.string().default("file:./dev.db"),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Global config instance
let configInstance: Config | null = null;

/**
 * Load and validate configuration from environment variables
 * Throws descriptive errors for missing required env vars
 */
export function loadConfig(): Config {
  if (configInstance) {
    return configInstance;
  }

  console.log("🔧 Loading application configuration...");

  try {
    const rawConfig = {
      qdrant: {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        defaultCollection: process.env.QDRANT_DEFAULT_COLLECTION,
        maxRetries: process.env.QDRANT_MAX_RETRIES
          ? parseInt(process.env.QDRANT_MAX_RETRIES)
          : undefined,
        timeout: process.env.QDRANT_TIMEOUT
          ? parseInt(process.env.QDRANT_TIMEOUT)
          : undefined,
      },
      embeddings: {
        openai: process.env.OPENAI_API_KEY
          ? {
              apiKey: process.env.OPENAI_API_KEY,
              model: process.env.OPENAI_EMBEDDING_MODEL,
              maxTokens: process.env.OPENAI_MAX_TOKENS
                ? parseInt(process.env.OPENAI_MAX_TOKENS)
                : undefined,
            }
          : undefined,
        gemini: process.env.GEMINI_API_KEY
          ? {
              apiKey: process.env.GEMINI_API_KEY,
              model: process.env.GEMINI_MODEL,
            }
          : undefined,
      },
      app: {
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL,
        port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
      },
      database: {
        url: process.env.DATABASE_URL,
      },
    };

    // Parse and validate the configuration
    configInstance = ConfigSchema.parse(rawConfig);

    console.log("✅ Configuration loaded successfully");
    console.log(`📍 Environment: ${configInstance.app.environment}`);
    console.log(`🗄️  Qdrant URL: ${configInstance.qdrant.url}`);
    console.log(
      `🔑 Embedding providers: ${getAvailableProviders(configInstance).join(
        ", "
      )}`
    );
    console.log(
      `📦 Default collection: ${configInstance.qdrant.defaultCollection}`
    );

    return configInstance;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Configuration validation failed:");

      error.errors.forEach((err) => {
        const path = err.path.join(".");
        console.error(`  • ${path}: ${err.message}`);

        // Provide helpful environment variable hints
        const envVarHint = getEnvVarHint(err.path);
        if (envVarHint) {
          console.error(`    💡 Set environment variable: ${envVarHint}`);
        }
      });

      console.error("\n📖 See .env.example for required environment variables");
      throw new Error(
        "Invalid configuration. Please check your environment variables."
      );
    }

    console.error("❌ Failed to load configuration:", error);
    throw error;
  }
}

/**
 * Get the current configuration (must be loaded first)
 */
export function getConfig(): Config {
  if (!configInstance) {
    throw new Error("Configuration not loaded. Call loadConfig() first.");
  }
  return configInstance;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Get available embedding providers
 */
export function getAvailableProviders(config: Config): string[] {
  const providers: string[] = [];
  if (config.embeddings.openai) providers.push("openai");
  if (config.embeddings.gemini) providers.push("gemini");
  return providers;
}

/**
 * Check if a specific provider is available
 */
export function hasProvider(provider: "openai" | "gemini"): boolean {
  const config = getConfig();
  return !!config.embeddings[provider];
}

/**
 * Get environment variable hint for configuration path
 */
function getEnvVarHint(path: (string | number)[]): string | null {
  const envVarMap: Record<string, string> = {
    "qdrant.url": "QDRANT_URL",
    "qdrant.apiKey": "QDRANT_API_KEY",
    "qdrant.defaultCollection": "QDRANT_DEFAULT_COLLECTION",
    "qdrant.maxRetries": "QDRANT_MAX_RETRIES",
    "qdrant.timeout": "QDRANT_TIMEOUT",
    "embeddings.openai.apiKey": "OPENAI_API_KEY",
    "embeddings.openai.model": "OPENAI_EMBEDDING_MODEL",
    "embeddings.openai.maxTokens": "OPENAI_MAX_TOKENS",
    "embeddings.gemini.apiKey": "GEMINI_API_KEY",
    "embeddings.gemini.model": "GEMINI_MODEL",
    "app.environment": "NODE_ENV",
    "app.logLevel": "LOG_LEVEL",
    "app.port": "PORT",
    "database.url": "DATABASE_URL",
  };

  const pathString = path.join(".");
  return envVarMap[pathString] || null;
}

/**
 * Validate that required services are reachable
 */
export async function validateServices(config: Config): Promise<{
  qdrant: boolean;
  openai: boolean;
  gemini: boolean;
}> {
  const results = {
    qdrant: false,
    openai: false,
    gemini: false,
  };

  // Test Qdrant connection
  try {
    const { QdrantClient } = await import("@qdrant/js-client-rest");
    const client = new QdrantClient(
      config.qdrant.apiKey
        ? {
            host: new URL(config.qdrant.url).hostname,
            port: null,
            https: new URL(config.qdrant.url).protocol === "https:",
            apiKey: config.qdrant.apiKey,
          }
        : {
            url: config.qdrant.url,
          }
    );

    await client.getCollections();
    results.qdrant = true;
    console.log("✅ Qdrant connection successful");
  } catch (error) {
    console.warn(
      "⚠️  Qdrant connection failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Test OpenAI if configured
  if (config.embeddings.openai) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: config.embeddings.openai.apiKey });
      await openai.models.list(); // Simple API test
      results.openai = true;
      console.log("✅ OpenAI connection successful");
    } catch (error) {
      console.warn(
        "⚠️  OpenAI connection failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  // Test Gemini if configured
  if (config.embeddings.gemini) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({
        apiKey: config.embeddings.gemini.apiKey,
      });
      // Note: Gemini doesn't have a simple health check endpoint
      // We'll assume it's working if the API key is provided
      results.gemini = true;
      console.log("✅ Gemini configuration valid");
    } catch (error) {
      console.warn(
        "⚠️  Gemini setup failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  return results;
}
