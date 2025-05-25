export interface NaturalQueryRequest {
  collection: string;
  question: string;
  provider?: "openai" | "gemini";
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
