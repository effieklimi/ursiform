import {
  ConversationContext,
  NLPQueryResult,
  QueryIntent,
} from "../entities/types";

export interface INLPService {
  processQuery(
    collection: string,
    question: string,
    context?: ConversationContext
  ): Promise<NLPQueryResult>;

  parseIntent(question: string): Promise<QueryIntent>;

  reformulateQuery(
    originalQuery: string,
    context?: ConversationContext
  ): Promise<string>;

  extractFilters(question: string): Promise<Record<string, any>>;
}
