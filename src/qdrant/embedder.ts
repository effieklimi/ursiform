import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { EmbeddingProvider } from "../schemas";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function embed(
  text: string,
  provider: EmbeddingProvider = "openai"
): Promise<number[]> {
  try {
    console.log(`Generating embedding for text using ${provider}...`);

    if (provider === "gemini") {
      return await generateGeminiEmbedding(text);
    } else {
      return await generateOpenAIEmbedding(text);
    }
  } catch (error) {
    console.error(`Error generating embedding with ${provider}:`, error);
    throw new Error(`Failed to generate embedding with ${provider}`);
  }
}

async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });

  return response.data[0].embedding;
}

async function generateGeminiEmbedding(text: string): Promise<number[]> {
  // Use Gemini's text embedding model with the new SDK
  const result = await genAI.models.embedContent({
    model: "text-embedding-004", // Updated to a more recent embedding model
    contents: text,
  });

  if (
    !result.embeddings ||
    !result.embeddings[0] ||
    !result.embeddings[0].values
  ) {
    throw new Error("No embedding returned from Gemini");
  }

  return result.embeddings[0].values;
}
