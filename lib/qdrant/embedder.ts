import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EmbeddingProvider } from "../schemas";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
  // Use Gemini's text embedding model
  const model = genAI.getGenerativeModel({ model: "embedding-001" });

  const result = await model.embedContent(text);

  if (!result.embedding || !result.embedding.values) {
    throw new Error("No embedding returned from Gemini");
  }

  return result.embedding.values;
}
