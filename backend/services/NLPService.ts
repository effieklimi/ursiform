import { INLPService } from "../core/interfaces/INLPService";
import {
  ConversationContext,
  NLPQueryResult,
  QueryIntent,
  EmbeddingProvider,
  SearchQuery,
} from "../core/entities/types";
import { IVectorRepository } from "../core/interfaces/IVectorRepository";
import {
  QueryParsingError,
  AuthenticationError,
  ProviderNotConfiguredError,
  RateLimitError,
  ValidationError as CustomValidationError,
} from "../../lib/errors";
import { getConfig, hasProvider } from "../../lib/config";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

// Import types from the legacy system for compatibility
import type {
  ConversationTurn,
  QueryType,
  QueryResult,
  PaginationOptions,
  ProcessingConfig,
} from "../../lib/types";

// Lazy initialization of AI clients
let openaiInstance: OpenAI | null = null;
let geminiInstance: GoogleGenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const config = getConfig();
    if (!config.embeddings.openai) {
      throw new ProviderNotConfiguredError("OpenAI", "intent parsing");
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
      throw new ProviderNotConfiguredError("Gemini", "intent parsing");
    }
    geminiInstance = new GoogleGenAI({
      apiKey: config.embeddings.gemini.apiKey,
    });
  }
  return geminiInstance;
}

export class NLPService implements INLPService {
  async processQuery(
    collection: string,
    question: string,
    context?: ConversationContext
  ): Promise<NLPQueryResult> {
    try {
      // Validate input
      if (!question || question.trim().length === 0) {
        throw new CustomValidationError(
          "question",
          question,
          "Question cannot be empty"
        );
      }

      if (question.length > 10000) {
        throw new CustomValidationError(
          "question",
          question.length,
          "Question too long (max 10,000 characters)"
        );
      }

      // Step 1: Resolve context and enrich the question
      const { enrichedQuestion, resolvedCollection, updatedContext } =
        await this.resolveContext(question, collection, context);

      // Step 2: Parse intent using heuristics
      const intent = await this.parseIntent(enrichedQuestion);

      // Step 3: Create search query
      const searchQuery: SearchQuery = {
        text: enrichedQuestion,
        limit: 10,
        filters: intent.extractedFilters,
      };

      // Step 4: Update conversation context
      const finalContext = this.updateConversationContext(
        updatedContext,
        question,
        intent,
        null, // result placeholder
        resolvedCollection || collection
      );

      return {
        intent,
        searchQuery,
        context: finalContext,
      };
    } catch (error) {
      // Re-throw our custom errors as-is
      if (error instanceof Error && "code" in error) {
        throw error;
      }

      console.error("Unexpected error processing NLP query:", error);
      throw new QueryParsingError(
        question,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async parseIntent(question: string): Promise<QueryIntent> {
    const lowerQuestion = question.toLowerCase();
    let type: "search" | "filter" | "aggregate" | "count" = "search";
    let confidence = 0.7;
    const extractedFilters: Record<string, any> = {};

    // Count queries
    if (
      lowerQuestion.includes("how many") ||
      lowerQuestion.includes("count") ||
      lowerQuestion.includes("number of") ||
      lowerQuestion.match(/\d+/)
    ) {
      type = "count";
      confidence = 0.9;
    }
    // Filter queries
    else if (
      lowerQuestion.includes("by ") ||
      lowerQuestion.includes("from ") ||
      lowerQuestion.includes("artist") ||
      lowerQuestion.includes("show me") ||
      lowerQuestion.includes("find") ||
      lowerQuestion.includes("where")
    ) {
      type = "filter";
      confidence = 0.8;

      // Extract filters
      Object.assign(extractedFilters, await this.extractFilters(question));
    }
    // Aggregate queries
    else if (
      lowerQuestion.includes("sum") ||
      lowerQuestion.includes("average") ||
      lowerQuestion.includes("total") ||
      lowerQuestion.includes("top") ||
      lowerQuestion.includes("most") ||
      lowerQuestion.includes("least")
    ) {
      type = "aggregate";
      confidence = 0.8;
    }

    return {
      type,
      confidence,
      extractedFilters,
      reformulatedQuery: question,
    };
  }

  async reformulateQuery(
    originalQuery: string,
    context?: ConversationContext
  ): Promise<string> {
    // Simple context-aware reformulation
    if (!context || !context.conversationHistory.length) {
      return originalQuery;
    }

    const lowerQuery = originalQuery.toLowerCase();

    // Handle pronouns and contextual references
    if (
      lowerQuery.includes("them") ||
      lowerQuery.includes("those") ||
      lowerQuery.includes("it")
    ) {
      const lastContext =
        context.conversationHistory[context.conversationHistory.length - 1];
      if (lastContext && context.lastEntity) {
        return originalQuery.replace(
          /\b(them|those|it)\b/gi,
          context.lastEntity
        );
      }
    }

    if (lowerQuery.includes("same") && context.lastCollection) {
      return `${originalQuery} in ${context.lastCollection}`;
    }

    return originalQuery;
  }

  async extractFilters(question: string): Promise<Record<string, any>> {
    const filters: Record<string, any> = {};

    // Extract quoted strings as potential entity names
    const quotedMatches = question.match(/"([^"]+)"/g);
    if (quotedMatches) {
      quotedMatches.forEach((match) => {
        const value = match.replace(/"/g, "");
        filters.name = value;
      });
    }

    // Extract "by Artist" patterns
    const byMatch = question.match(/by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (byMatch) {
      filters.name = byMatch[1];
    }

    // Extract "artist Artist" patterns
    const artistMatch = question.match(
      /artist\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/
    );
    if (artistMatch) {
      filters.name = artistMatch[1];
    }

    return filters;
  }

  // Private methods for internal logic

  private async resolveContext(
    question: string,
    collection: string | null,
    context?: ConversationContext
  ): Promise<{
    enrichedQuestion: string;
    resolvedCollection: string | null;
    updatedContext: ConversationContext;
  }> {
    const currentContext: ConversationContext = context || {
      conversationHistory: [],
    };

    let enrichedQuestion = question;
    let resolvedCollection = collection;

    const lowercaseQuestion = question.toLowerCase();

    // Handle contextual references
    if (lowercaseQuestion.includes("same") && currentContext.lastCollection) {
      resolvedCollection = currentContext.lastCollection;
      enrichedQuestion = question.replace(
        /same/gi,
        currentContext.lastCollection
      );
    }

    if (lowercaseQuestion.includes("also") && currentContext.lastEntity) {
      enrichedQuestion = `${currentContext.lastEntity} ${question}`;
    }

    return {
      enrichedQuestion,
      resolvedCollection,
      updatedContext: currentContext,
    };
  }

  private updateConversationContext(
    context: ConversationContext,
    question: string,
    intent: QueryIntent,
    result: any,
    collection: string | null
  ): ConversationContext {
    // Create a new conversation turn
    const turn: ConversationTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question,
      intent: {
        type: intent.type as QueryType,
        target: intent.extractedFilters?.name || "general",
        filter: intent.extractedFilters
          ? [
              {
                field: "name",
                operator: "equals" as const,
                value: intent.extractedFilters.name || "",
              },
            ]
          : undefined,
        scope: collection ? ("collection" as const) : ("database" as const),
        extractedCollection: collection || undefined,
      },
      result: result || {},
      timestamp: new Date(),
    };

    // Update context
    const updatedContext: ConversationContext = {
      ...context,
      conversationHistory: [...(context.conversationHistory || []), turn],
      lastQueryType: intent.type as QueryType,
      lastCollection: collection || context.lastCollection,
      lastEntity: intent.extractedFilters?.name || context.lastEntity,
      currentTopic: this.extractTopic(question),
    };

    // Keep only last 10 turns to prevent memory bloat
    if (updatedContext.conversationHistory.length > 10) {
      updatedContext.conversationHistory =
        updatedContext.conversationHistory.slice(-10);
    }

    return updatedContext;
  }

  private extractTopic(question: string): string {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes("image") || lowerQuestion.includes("picture")) {
      return "images";
    }
    if (lowerQuestion.includes("artist") || lowerQuestion.includes("painter")) {
      return "artists";
    }
    if (lowerQuestion.includes("collection")) {
      return "collections";
    }

    return "general";
  }
}
