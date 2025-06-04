import { VectorSearchService } from "../services/VectorSearchService";
import { INLPService } from "../core/interfaces/INLPService";
import { ConversationContext } from "../core/entities/types";

export interface NaturalQueryRequest {
  question: string;
  collection?: string;
  provider?: string;
  model?: string;
  context?: ConversationContext;
}

export interface NaturalQueryResponse {
  answer: string;
  query_type: string;
  data?: any;
  execution_time_ms: number;
  context: ConversationContext;
}

export class VectorController {
  constructor(
    private searchService: VectorSearchService,
    private nlpService: INLPService
  ) {}

  async handleNaturalQuery(
    request: NaturalQueryRequest
  ): Promise<NaturalQueryResponse> {
    const startTime = Date.now();
    const {
      question,
      collection = "vectors",
      provider = "openai",
      model = "gemini-2.0-flash",
      context,
    } = request;

    try {
      // Step 1: Process the query with NLP
      const nlpResult = await this.nlpService.processQuery(
        collection,
        question,
        context
      );

      console.log(
        `🔍 Intent detected: ${nlpResult.intent.type} (confidence: ${nlpResult.intent.confidence})`
      );
      console.log(`🎯 Extracted filters:`, nlpResult.intent.extractedFilters);

      // Step 2: Execute search if needed
      let searchResults = null;
      if (
        nlpResult.intent.type === "search" ||
        nlpResult.intent.type === "filter" ||
        nlpResult.intent.type === "count"
      ) {
        try {
          // Use higher limit for count queries to get more accurate totals
          const searchLimit =
            nlpResult.intent.type === "count"
              ? 1000
              : nlpResult.searchQuery.limit || 10;

          searchResults = await this.searchService.semanticSearch(
            collection,
            nlpResult.searchQuery.text || question,
            {
              provider: provider as any,
              limit: searchLimit,
              filters: nlpResult.searchQuery.filters,
            }
          );
        } catch (searchError) {
          console.warn(
            "Search failed, continuing with NLP-only response:",
            searchError
          );
        }
      }

      // Step 3: Generate response based on intent
      const answer = this.generateResponse(
        nlpResult.intent,
        searchResults,
        question
      );

      console.log(`💬 Generated response: "${answer}"`);

      const executionTime = Date.now() - startTime;

      return {
        answer,
        query_type: nlpResult.intent.type,
        data: searchResults?.hits || null,
        execution_time_ms: executionTime,
        context: nlpResult.context || context || { conversationHistory: [] },
      };
    } catch (error) {
      throw new Error(
        `Query processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async testConnection(): Promise<{ connected: boolean }> {
    const connected = await this.searchService.testConnection();
    return { connected };
  }

  private generateResponse(
    intent: any,
    searchResults: any,
    question: string
  ): string {
    const intentType = intent.type;
    const entityName = intent.extractedFilters?.name;

    if (intentType === "count") {
      if (searchResults && searchResults.hits) {
        const count = searchResults.hits.length;
        const entityText = entityName ? ` related to ${entityName}` : "";

        if (count === 1000) {
          return `Found at least ${count} items${entityText} in the database. This might be a partial count due to search limits.`;
        } else {
          return `Found ${count} items${entityText} in the database.`;
        }
      }
      return `I can help you count items in the database, but I'm currently unable to access the database to provide exact numbers. This might be due to rate limiting or connectivity issues.`;
    }

    if (intentType === "filter" && entityName) {
      if (searchResults && searchResults.hits.length > 0) {
        return `Found ${searchResults.hits.length} results for ${entityName}. Here are the items I found.`;
      }
      return `I searched for items related to ${entityName}, but couldn't find any results. This might be because the database is not connected or the entity doesn't exist.`;
    }

    if (intentType === "search") {
      if (searchResults && searchResults.hits.length > 0) {
        return `Found ${searchResults.hits.length} relevant results for your search: "${question}".`;
      }
      return `I searched for "${question}" but couldn't find any results. This might be because the database is not connected or there are no matching items.`;
    }

    if (intentType === "aggregate") {
      return `I can help with aggregate queries, but I need access to the database to calculate statistics and summaries.`;
    }

    // Default fallback
    return `I understand you're asking about: "${question}". However, I need access to the database to provide specific information. Please ensure the vector database is connected.`;
  }
}
