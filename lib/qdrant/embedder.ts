import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { getConfig, hasProvider } from "../config";
import type { EmbeddingProvider } from "../schemas";
import {
  EmbeddingGenerationError,
  AuthenticationError,
  ProviderNotConfiguredError,
  RateLimitError,
  ValidationError,
} from "../errors";

// Lazy initialization of clients
let openaiInstance: OpenAI | null = null;
let geminiInstance: GoogleGenAI | null = null;

// Reset function for testing
export function resetClients(): void {
  openaiInstance = null;
  geminiInstance = null;
}

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const config = getConfig();
    if (!config.embeddings.openai) {
      throw new ProviderNotConfiguredError("OpenAI", "embedding generation");
    }
    openaiInstance = new OpenAI({
      apiKey: config.embeddings.openai.apiKey,
    });
  }
  return openaiInstance;
}

function getGeminiClient(): GoogleGenAI {
  if (!geminiInstance) {
    const config = getConfig();
    if (!config.embeddings.gemini) {
      throw new ProviderNotConfiguredError("Gemini", "embedding generation");
    }
    geminiInstance = new GoogleGenAI({
      apiKey: config.embeddings.gemini.apiKey,
    });
  }
  return geminiInstance;
}

export async function embed(
  text: string,
  provider: EmbeddingProvider = "openai"
): Promise<number[]> {
  try {
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new ValidationError("text", text, "Text cannot be empty");
    }

    if (text.length > 100000) {
      // Reasonable limit to prevent abuse
      throw new ValidationError(
        "text",
        text.length,
        "Text too long (max 100,000 characters)"
      );
    }

    console.log(`Generating embedding for text using ${provider}...`);

    // Validate provider is configured
    if (!hasProvider(provider)) {
      throw new ProviderNotConfiguredError(provider, "embedding generation");
    }

    const config = getConfig();

    if (provider === "openai") {
      try {
        const openai = getOpenAIClient();
        const providerConfig = config.embeddings.openai!;

        // Validate text length against model limits
        if (text.length > providerConfig.maxTokens * 4) {
          // Rough token estimation
          console.warn(
            `Text length (${text.length} chars) may exceed token limit for ${providerConfig.model}`
          );
          throw new ValidationError(
            "text",
            text.length,
            `Text may exceed token limit for model ${providerConfig.model}`
          );
        }

        const response = await openai.embeddings.create({
          model: providerConfig.model,
          input: text,
          encoding_format: "float",
        });

        if (
          !response.data ||
          !response.data[0] ||
          !response.data[0].embedding
        ) {
          throw new EmbeddingGenerationError(
            provider,
            new Error("No embedding data returned from OpenAI"),
            text
          );
        }

        return response.data[0].embedding;
      } catch (error) {
        if (
          error instanceof ValidationError ||
          error instanceof ProviderNotConfiguredError
        ) {
          throw error; // Re-throw our custom errors
        }

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Handle specific OpenAI errors
        if (
          errorMessage.includes("401") ||
          errorMessage.includes("authentication") ||
          errorMessage.includes("api key")
        ) {
          throw new AuthenticationError("OpenAI", "embedding generation");
        }

        if (
          errorMessage.includes("429") ||
          errorMessage.includes("rate limit")
        ) {
          // Try to extract retry-after header if available
          const retryMatch = errorMessage.match(/retry after (\d+)/i);
          const retryAfter = retryMatch ? parseInt(retryMatch[1]) : undefined;
          throw new RateLimitError("OpenAI", retryAfter);
        }

        throw new EmbeddingGenerationError(provider, error as Error, text);
      }
    } else if (provider === "gemini") {
      try {
        const genAI = getGeminiClient();
        const providerConfig = config.embeddings.gemini!;

        const result = await genAI.models.embedContent({
          model: providerConfig.model,
          contents: text,
        });

        if (!result.embeddings?.[0]?.values) {
          throw new EmbeddingGenerationError(
            provider,
            new Error("No embedding values returned from Gemini"),
            text
          );
        }

        return result.embeddings[0].values;
      } catch (error) {
        if (
          error instanceof ValidationError ||
          error instanceof ProviderNotConfiguredError
        ) {
          throw error; // Re-throw our custom errors
        }

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Handle specific Gemini errors
        if (
          errorMessage.includes("401") ||
          errorMessage.includes("403") ||
          errorMessage.includes("api key")
        ) {
          throw new AuthenticationError("Gemini", "embedding generation");
        }

        if (errorMessage.includes("429") || errorMessage.includes("quota")) {
          throw new RateLimitError("Gemini");
        }

        throw new EmbeddingGenerationError(provider, error as Error, text);
      }
    } else {
      throw new ValidationError(
        "provider",
        provider,
        'Must be either "openai" or "gemini"'
      );
    }
  } catch (error) {
    // Re-throw our custom errors as-is
    if (error instanceof Error && "code" in error) {
      throw error;
    }

    // Wrap unexpected errors
    console.error(
      `Unexpected error generating embedding with ${provider}:`,
      error
    );
    throw new EmbeddingGenerationError(
      provider,
      error instanceof Error ? error : new Error(String(error)),
      text
    );
  }
}
