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
  context?: ConversationContext; // Add conversation context to response
  correlationId?: string; // Add correlation ID for error tracking
}

export interface ConversationContext {
  lastEntity?: string; // Last mentioned entity (person, creator, etc.)
  lastCollection?: string; // Last mentioned or used collection
  lastQueryType?: string; // Last query type (search, summarize, count, etc.)
  lastTarget?: string; // Last target (items, entities, etc.)
  conversationHistory: ConversationTurn[];
  currentTopic?: string; // Current topic being discussed
}

export interface ConversationTurn {
  id: string;
  question: string;
  intent: {
    type: string;
    target: string;
    filter?: any;
    scope: string;
    extractedCollection?: string;
  };
  result: any;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  queryType?: string;
  executionTime?: number;
  data?: any;
  context?: ConversationContext; // Add context to messages
}

// Available models
export const AVAILABLE_MODELS = {
  // OpenAI models (using correct model names)
  "gpt-4o-2024-08-06": { provider: "openai", name: "GPT-4o 2024-08-06" },
  "gpt-4.1-2025-04-14": { provider: "openai", name: "GPT-4.1 2025-04-14" },
  "gpt-4o-mini": { provider: "openai", name: "GPT-4o Mini" },
  "o3-2025-04-16": { provider: "openai", name: "O3 2025-04-16" },
  "o3-mini-2025-01-31": { provider: "openai", name: "O3 Mini 2025-01-31" },
  "o4-mini-2025-04-16": { provider: "openai", name: "O4 Mini 2025-04-16" },
  "o1-2024-12-17": { provider: "openai", name: "O1 2024-12-17" },

  // Gemini models (using correct model names)
  "gemini-2.0-flash": { provider: "gemini", name: "Gemini 2.0 Flash" },
  "gemini-1.5-pro": { provider: "gemini", name: "Gemini 1.5 Pro" },
  "gemini-1.5-flash": { provider: "gemini", name: "Gemini 1.5 Flash" },
} as const;

export type ModelKey = keyof typeof AVAILABLE_MODELS;
export type EmbeddingProvider = "openai" | "gemini";
