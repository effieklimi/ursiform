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
  "gpt-4o": { provider: "openai", name: "GPT-4o" },
  "gpt-4o-mini": { provider: "openai", name: "GPT-4o Mini" },
  "gpt-4-turbo": { provider: "openai", name: "GPT-4 Turbo" },
  "gpt-3.5-turbo": { provider: "openai", name: "GPT-3.5 Turbo" },

  // Gemini models (using correct model names)
  "gemini-2.0-flash": { provider: "gemini", name: "Gemini 2.0 Flash" },
  "gemini-1.5-pro": { provider: "gemini", name: "Gemini 1.5 Pro" },
  "gemini-1.5-flash": { provider: "gemini", name: "Gemini 1.5 Flash" },
} as const;

export type ModelKey = keyof typeof AVAILABLE_MODELS;
export type EmbeddingProvider = "openai" | "gemini";
