export interface NaturalQueryRequest {
  collection?: string;
  question: string;
  model?: string;
}

export interface NaturalQueryResponse {
  question: string;
  answer: string;
  query_type: string;
  data?: any;
  execution_time_ms: number;
}

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  queryType?: string;
  executionTime?: number;
  data?: any;
}

// Available models
export const AVAILABLE_MODELS = {
  // OpenAI models (latest first)
  o1: { provider: "openai", name: "GPT-o1 (Reasoning)" },
  "o1-mini": { provider: "openai", name: "GPT-o1 Mini" },
  "gpt-4o": { provider: "openai", name: "GPT-4o" },
  "gpt-4o-mini": { provider: "openai", name: "GPT-4o Mini" },
  "gpt-4-turbo": { provider: "openai", name: "GPT-4 Turbo" },
  "gpt-3.5-turbo": { provider: "openai", name: "GPT-3.5 Turbo" },

  // Gemini models
  "gemini-2.0-flash": { provider: "gemini", name: "Gemini 2.0 Flash" },
  "gemini-2.0-flash-lite": {
    provider: "gemini",
    name: "Gemini 2.0 Flash-Lite",
  },
  "gemini-2.5-flash": { provider: "gemini", name: "Gemini 2.5 Flash" },
  "gemini-2.5-pro": { provider: "gemini", name: "Gemini 2.5 Pro" },
} as const;

export type ModelKey = keyof typeof AVAILABLE_MODELS;
export type EmbeddingProvider = "openai" | "gemini";
