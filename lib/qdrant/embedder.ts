import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { getConfig, hasProvider } from "../config";
import type { EmbeddingProvider } from "../schemas";

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
      throw new Error(
        "OpenAI not configured. Set OPENAI_API_KEY environment variable."
      );
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
      throw new Error(
        "Gemini not configured. Set GEMINI_API_KEY environment variable."
      );
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
    console.log(`Generating embedding for text using ${provider}...`);

    // Validate provider is configured
    if (!hasProvider(provider)) {
      throw new Error(
        `${provider} provider not configured. Check your environment variables.`
      );
    }

    const config = getConfig();

    if (provider === "openai") {
      const openai = getOpenAIClient();
      const providerConfig = config.embeddings.openai!;

      // Validate text length against model limits
      if (text.length > providerConfig.maxTokens * 4) {
        // Rough token estimation
        console.warn(
          `Text length (${text.length} chars) may exceed token limit for ${providerConfig.model}`
        );
      }

      const response = await openai.embeddings.create({
        model: providerConfig.model,
        input: text,
        encoding_format: "float",
      });

      return response.data[0].embedding;
    } else if (provider === "gemini") {
      const genAI = getGeminiClient();
      const providerConfig = config.embeddings.gemini!;

      const result = await genAI.models.embedContent({
        model: providerConfig.model,
        contents: text,
      });

      if (!result.embeddings?.[0]?.values) {
        throw new Error("No embedding values returned from Gemini");
      }

      return result.embeddings[0].values;
    } else {
      throw new Error(`Unsupported embedding provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error generating embedding with ${provider}:`, error);
    throw error;
  }
}
