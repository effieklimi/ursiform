import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { client } from "./db";
import { EmbeddingProvider } from "../schemas";
import { ConversationContext, ConversationTurn } from "../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Configuration for different database schemas
interface DatabaseConfig {
  entityField: string; // Field that contains the main entity identifier (e.g., "name", "author", "creator")
  entityType: string; // What to call the entities (e.g., "artists", "authors", "creators", "entities")
  itemType: string; // What to call individual items (e.g., "images", "documents", "items", "records")
  additionalFields?: {
    filename?: string; // Field for file names
    url?: string; // Field for URLs
    description?: string; // Field for descriptions
  };
}

// Default configuration - can be overridden via environment variables or config
const DEFAULT_CONFIG: DatabaseConfig = {
  entityField: process.env.ENTITY_FIELD || "name",
  entityType: process.env.ENTITY_TYPE || "artists",
  itemType: process.env.ITEM_TYPE || "images",
  additionalFields: {
    filename: process.env.FILENAME_FIELD || "file_name",
    url: process.env.URL_FIELD || "image_url",
    description: process.env.DESCRIPTION_FIELD || "description",
  },
};

// Helper function to get entity value from a point
function getEntityValue(
  point: any,
  config: DatabaseConfig = DEFAULT_CONFIG
): string | null {
  return point.payload?.[config.entityField] || null;
}

// Helper function to get additional field values
function getFieldValue(point: any, fieldName: string): string | null {
  return point.payload?.[fieldName] || null;
}

interface QueryIntent {
  type:
    | "count"
    | "search"
    | "list"
    | "filter"
    | "describe"
    | "collections"
    | "database"
    | "summarize"
    | "analyze"
    | "top"
    | "ranking"; // Add new query types for complex queries
  target: string; // what to count/search/list
  filter?: any; // any filters to apply
  limit?: number;
  scope: "collection" | "database"; // new: scope of the query
  extractedCollection?: string; // new: collection name extracted from query text
  sortBy?: string; // new: what to sort by (e.g., "image_count", "popularity")
  sortOrder?: "asc" | "desc"; // new: sort order
}

export async function processNaturalQuery(
  collection: string | null, // Make collection optional
  question: string,
  provider: EmbeddingProvider = "openai",
  model?: string, // Add specific model parameter
  context?: ConversationContext // Add conversation context
): Promise<{
  answer: string;
  query_type: string;
  data?: any;
  execution_time_ms: number;
  context: ConversationContext; // Return updated context
}> {
  const startTime = Date.now();

  try {
    // Step 1: Resolve context and enrich the question
    const { enrichedQuestion, resolvedCollection, updatedContext } =
      await resolveContext(question, collection, context);

    // Step 2: Parse intent with context awareness
    const intent = await parseQueryIntent(
      enrichedQuestion,
      provider,
      model,
      updatedContext
    );

    // Step 3: Use resolved collection or extracted collection
    const finalCollection =
      resolvedCollection || intent.extractedCollection || null;

    // Step 4: Execute the appropriate operation
    const result = await executeQuery(finalCollection, intent);

    // Step 5: Generate natural language response
    const answer = await generateResponse(
      enrichedQuestion,
      intent,
      result,
      provider,
      model
    );

    // Step 6: Update conversation context
    const finalContext = updateConversationContext(
      updatedContext,
      question,
      intent,
      result,
      finalCollection
    );

    const execution_time_ms = Date.now() - startTime;

    return {
      answer,
      query_type: intent.type,
      data: result,
      execution_time_ms,
      context: finalContext,
    };
  } catch (error) {
    console.error("Error processing natural query:", error);

    // Create fallback response
    const fallbackAnswer =
      "I encountered an issue processing your query, but I'm using pattern matching to help. " +
      generateFallbackResponse(
        question,
        inferIntentFromQuestion(question, context),
        {
          count: 0,
        }
      );

    return {
      answer: fallbackAnswer,
      query_type: "fallback",
      data: null,
      execution_time_ms: Date.now() - startTime,
      context: context || { conversationHistory: [] },
    };
  }
}

async function resolveContext(
  question: string,
  collection: string | null,
  context?: ConversationContext
): Promise<{
  enrichedQuestion: string;
  resolvedCollection: string | null;
  updatedContext: ConversationContext;
}> {
  // Initialize context if not provided
  const currentContext: ConversationContext = context || {
    conversationHistory: [],
  };

  let enrichedQuestion = question;
  let resolvedCollection = collection;

  console.log("🧠 CONTEXT RESOLUTION:");
  console.log("Original question:", question);
  console.log("Current context:", JSON.stringify(currentContext, null, 2));

  // Detect contextual references
  const lowercaseQuestion = question.toLowerCase();

  // Handle pronoun references to entities
  if (
    (lowercaseQuestion.includes("their") ||
      lowercaseQuestion.includes("his") ||
      lowercaseQuestion.includes("her") ||
      lowercaseQuestion.includes("its")) &&
    currentContext.lastEntity
  ) {
    console.log(
      "🔄 Resolving possessive pronoun to:",
      currentContext.lastEntity
    );
    enrichedQuestion = enrichedQuestion.replace(
      /\b(their|his|her|its)\b/gi,
      currentContext.lastEntity + "'s"
    );
  }

  // Handle "he" and "him" references
  if (
    (lowercaseQuestion.includes("he ") ||
      lowercaseQuestion.includes("him ") ||
      lowercaseQuestion.includes(" he") ||
      lowercaseQuestion.includes(" him")) &&
    currentContext.lastEntity
  ) {
    console.log("🔄 Resolving 'he/him' to:", currentContext.lastEntity);
    enrichedQuestion = enrichedQuestion.replace(
      /\b(he|him)\b/gi,
      currentContext.lastEntity
    );
  }

  // Handle "also" references
  if (lowercaseQuestion.includes("also") && currentContext.lastEntity) {
    if (!enrichedQuestion.includes(currentContext.lastEntity)) {
      console.log(
        "🔄 Resolving 'also' reference to:",
        currentContext.lastEntity
      );
      enrichedQuestion = enrichedQuestion.replace(
        /also/i,
        `also for ${currentContext.lastEntity}`
      );
    }
  }

  // Handle "them" references
  if (lowercaseQuestion.includes("them") && currentContext.lastEntity) {
    console.log("🔄 Resolving 'them' to:", currentContext.lastEntity);
    enrichedQuestion = enrichedQuestion.replace(
      /\bthem\b/gi,
      currentContext.lastEntity
    );
  }

  // Handle "they" references
  if (lowercaseQuestion.includes("they") && currentContext.lastEntity) {
    console.log("🔄 Resolving 'they' to:", currentContext.lastEntity);
    enrichedQuestion = enrichedQuestion.replace(
      /\bthey\b/gi,
      currentContext.lastEntity
    );
  }

  // Handle "it" references to collections
  if (lowercaseQuestion.includes("it") && currentContext.lastCollection) {
    console.log(
      "🔄 Resolving 'it' to collection:",
      currentContext.lastCollection
    );
    enrichedQuestion = enrichedQuestion.replace(
      /\bit\b/gi,
      currentContext.lastCollection
    );
  }

  // Handle continuation phrases
  if (
    (lowercaseQuestion.includes("what about") ||
      lowercaseQuestion.includes("how about") ||
      lowercaseQuestion.includes("and")) &&
    currentContext.lastQueryType &&
    currentContext.lastTarget
  ) {
    // If question is like "what about John Doe?", expand to full context
    const entityMatch = question.match(
      /(?:what about|how about|and)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    );
    if (entityMatch) {
      const newEntity = entityMatch[1];
      const lastQueryType = currentContext.lastQueryType;
      console.log(
        "🔄 Resolving continuation to:",
        `${lastQueryType} ${currentContext.lastTarget} by ${newEntity}`
      );
      enrichedQuestion = `${lastQueryType} ${currentContext.lastTarget} by ${newEntity}`;
    }
  }

  // Resolve collection context
  if (!resolvedCollection && currentContext.lastCollection) {
    // If no collection specified but we have context, check if query seems collection-specific
    if (
      lowercaseQuestion.includes("this collection") ||
      lowercaseQuestion.includes("that collection") ||
      lowercaseQuestion.includes("same collection") ||
      lowercaseQuestion.includes("the collection") ||
      lowercaseQuestion.includes("in that") ||
      lowercaseQuestion.includes("in this") ||
      (!lowercaseQuestion.includes("all collections") &&
        !lowercaseQuestion.includes("database") &&
        !lowercaseQuestion.includes("across collections"))
    ) {
      console.log(
        "🔄 Resolving collection context to:",
        currentContext.lastCollection
      );
      resolvedCollection = currentContext.lastCollection;
    }
  }

  // Special handling for queries that reference previous results
  if (currentContext.conversationHistory.length > 0) {
    const lastTurn =
      currentContext.conversationHistory[
        currentContext.conversationHistory.length - 1
      ];

    // If the last query returned collection-specific results, use that collection
    if (lastTurn.result?.results_by_collection && !resolvedCollection) {
      const collectionsWithResults =
        lastTurn.result.results_by_collection.filter((r: any) => r.count > 0);
      if (collectionsWithResults.length === 1) {
        console.log(
          "🔄 Inferring collection from previous results:",
          collectionsWithResults[0].collection
        );
        resolvedCollection = collectionsWithResults[0].collection;
      }
    }
  }

  console.log("✅ Enriched question:", enrichedQuestion);
  console.log("✅ Resolved collection:", resolvedCollection);

  return {
    enrichedQuestion,
    resolvedCollection,
    updatedContext: currentContext,
  };
}

function updateConversationContext(
  context: ConversationContext,
  question: string,
  intent: QueryIntent,
  result: any,
  collection: string | null
): ConversationContext {
  console.log("💾 UPDATING CONVERSATION CONTEXT:");
  console.log("Previous context:", JSON.stringify(context, null, 2));
  console.log("Intent:", JSON.stringify(intent, null, 2));
  console.log("Collection:", collection);

  // Create new conversation turn
  const turn: ConversationTurn = {
    id: Date.now().toString(),
    question,
    intent: {
      type: intent.type,
      target: intent.target,
      filter: intent.filter,
      scope: intent.scope,
      extractedCollection: intent.extractedCollection,
    },
    result,
    timestamp: new Date(),
  };

  // Update context
  const updatedContext: ConversationContext = {
    ...context,
    conversationHistory: [...context.conversationHistory, turn].slice(-10), // Keep last 10 turns
  };

  // Update last entity if filter contains a name
  if (intent.filter?.name) {
    updatedContext.lastEntity = intent.filter.name;
    console.log("📝 Updated lastEntity to:", intent.filter.name);
  }

  // Update last collection
  if (collection) {
    updatedContext.lastCollection = collection;
    console.log("📝 Updated lastCollection to:", collection);
  }

  // Update last query type and target
  updatedContext.lastQueryType = intent.type;
  updatedContext.lastTarget = intent.target;
  console.log("📝 Updated lastQueryType to:", intent.type);
  console.log("📝 Updated lastTarget to:", intent.target);

  // Update current topic based on query content
  if (intent.filter?.name) {
    updatedContext.currentTopic = `${intent.filter.name} ${intent.target}`;
    console.log("📝 Updated currentTopic to:", updatedContext.currentTopic);
  }

  console.log(
    "✅ Final updated context:",
    JSON.stringify(updatedContext, null, 2)
  );

  return updatedContext;
}

async function parseQueryIntent(
  question: string,
  provider: EmbeddingProvider,
  model?: string,
  context?: ConversationContext
): Promise<QueryIntent> {
  // Get available collections to help with intent parsing
  let availableCollections: string[] = [];
  try {
    const collectionsData = await listCollections();
    availableCollections = collectionsData.collections.map((c) => c.name);
    console.log(
      "📋 Available collections for intent parsing:",
      availableCollections
    );
  } catch (error) {
    console.warn("Failed to get collections for intent parsing:", error);
  }

  // First try simple pattern matching as fallback
  const fallbackIntent = inferIntentFromQuestion(
    question,
    context,
    availableCollections
  );

  // Build context-aware system prompt
  let systemPrompt = `You are a query intent parser for a vector database system. Parse the user's question to determine:
1. Query type (count, search, list, filter, describe, summarize, analyze, collections, database, top, ranking)
2. What to target (items, entities, collections, etc.)
3. Any filters to apply (especially entity names)
4. Query scope (collection-specific or database-wide)
5. Collection name if mentioned
6. Sort criteria for ranking queries

Available collections in this database: ${availableCollections.join(", ")}

IMPORTANT: When parsing the query, check if mentioned names are collection names first before treating them as entity names.
- If a name matches a collection name, set "extractedCollection" and "scope" to "collection"
- If a name doesn't match any collection, treat it as an entity name in the filter

Available scopes:
- "collection": query operates on a specific collection
- "database": query operates on the entire database

Available query types:
- "top": find top N items by some criteria (e.g., "top 5 artists by image count")
- "ranking": rank items by some criteria (e.g., "which artist has the most images")
- "count": count items matching criteria
- "search": find specific items
- "list": list items or entities
- "summarize": provide summary of items
- "analyze": analyze patterns in items

IMPORTANT: Extract entity names from natural language variations:
- "by [Name]", "from [Name]", "of [Name]"
- "done by [Name]", "created by [Name]", "made by [Name]"
- "pieces by [Name]", "work by [Name]", "items by [Name]"
- "[Name] items", "[Name] work", "[Name] pieces"
- Look for proper nouns (capitalized names) that could be entities

For ranking/top queries, identify what to sort by:
- "most images" → sortBy: "image_count", sortOrder: "desc"
- "least popular" → sortBy: "popularity", sortOrder: "asc"
- "top artists" → sortBy: "image_count", sortOrder: "desc"

When you find an entity name, put it in the filter with a generic field name "name".`;

  // Add conversation context if available
  if (context && context.conversationHistory.length > 0) {
    systemPrompt += `

CONVERSATION CONTEXT:
Recent conversation history (use this to resolve references and continuations):
`;

    // Add last few turns for context
    const recentTurns = context.conversationHistory.slice(-3);
    recentTurns.forEach((turn, index) => {
      systemPrompt += `
${index + 1}. User asked: "${turn.question}"
   Intent: ${turn.intent.type} ${turn.intent.target}${
        turn.intent.filter
          ? ` (filter: ${JSON.stringify(turn.intent.filter)})`
          : ""
      }
   Collection: ${turn.intent.extractedCollection || "database-wide"}`;
    });

    if (context.lastEntity) {
      systemPrompt += `
Last mentioned entity: ${context.lastEntity}`;
    }

    if (context.lastCollection) {
      systemPrompt += `
Last used collection: ${context.lastCollection}`;
    }

    if (context.currentTopic) {
      systemPrompt += `
Current conversation topic: ${context.currentTopic}`;
    }

    systemPrompt += `

Use this context to resolve pronouns (they, them, their, it), continuations (also, what about), and implied references.
For example:
- "their work" when last entity was "John Doe" should become filter: {"name": "John Doe"}
- "what about Alice?" after asking about "John Doe's paintings" should become "search paintings by Alice"
- "also show me Bob" after "count items by Alice" should become "search items by Bob"`;
  }

  systemPrompt += `

Return ONLY a JSON object in this format:
{
  "type": "count|search|list|filter|describe|summarize|analyze|collections|database|top|ranking",
  "target": "what to count/search/list (e.g., 'items', 'entities', 'collections')",
  "filter": {"name": "extracted_entity_name"} or null,
  "limit": number or null,
  "scope": "collection|database",
  "extractedCollection": "collection_name_if_mentioned_in_query" or null,
  "sortBy": "image_count|popularity|name" or null,
  "sortOrder": "asc|desc" or null
}

Examples:
- "How many items by John Doe?" → {"type": "count", "target": "items", "filter": {"name": "John Doe"}, "limit": null, "scope": "database", "extractedCollection": null}
- "Which artist has the most images?" → {"type": "ranking", "target": "entities", "filter": null, "limit": 1, "scope": "database", "extractedCollection": null, "sortBy": "image_count", "sortOrder": "desc"}
- "Top 5 artists by image count in mycollection" → {"type": "top", "target": "entities", "filter": null, "limit": 5, "scope": "collection", "extractedCollection": "mycollection", "sortBy": "image_count", "sortOrder": "desc"}
- "Which artist in that collection has the most images?" → {"type": "ranking", "target": "entities", "filter": null, "limit": 1, "scope": "collection", "extractedCollection": null, "sortBy": "image_count", "sortOrder": "desc"}
- "Summarize Alice Smith's work in mycollection" → {"type": "summarize", "target": "items", "filter": {"name": "Alice Smith"}, "limit": 10, "scope": "collection", "extractedCollection": "mycollection"}
- "Can you summarise the pieces done by Bob Johnson?" → {"type": "summarize", "target": "items", "filter": {"name": "Bob Johnson"}, "limit": 10, "scope": "database", "extractedCollection": null}
- "Find all Maria Garcia artwork" → {"type": "search", "target": "items", "filter": {"name": "Maria Garcia"}, "limit": 20, "scope": "database", "extractedCollection": null}
- "Show me data created by AI Assistant" → {"type": "search", "target": "items", "filter": {"name": "AI Assistant"}, "limit": 10, "scope": "database", "extractedCollection": null}`;

  try {
    let response: string;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      const geminiModel = genAI.getGenerativeModel({
        model: model || "gemini-2.0-flash", // Use specific model parameter
      });
      const result = await geminiModel.generateContent([
        { text: systemPrompt },
        { text: `Question: "${question}"` },
      ]);
      response = result.response.text();
    } else if (provider === "openai" && process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: model || "gpt-3.5-turbo", // Use specific model parameter
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Question: "${question}"` },
          ],
          temperature: 0,
        });
        response = completion.choices[0].message.content || "{}";
      } catch (openaiError: any) {
        console.warn(
          "OpenAI failed, trying Gemini fallback:",
          openaiError.message
        );
        // Auto-fallback to Gemini if OpenAI fails
        if (process.env.GEMINI_API_KEY) {
          const geminiModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
          });
          const result = await geminiModel.generateContent([
            { text: systemPrompt },
            { text: `Question: "${question}"` },
          ]);
          response = result.response.text();
        } else {
          throw openaiError; // Re-throw if no Gemini fallback available
        }
      }
    } else {
      throw new Error("No valid API key for the specified provider");
    }

    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    return JSON.parse(jsonStr);
  } catch (e) {
    // Fallback parsing with context awareness
    console.warn(
      "Failed to parse LLM response, using context-aware fallback:",
      e
    );
    return fallbackIntent;
  }
}

function inferIntentFromQuestion(
  question: string,
  context?: ConversationContext,
  availableCollections?: string[]
): QueryIntent {
  const q = question.toLowerCase();

  // Try to extract collection name from the question, checking against available collections
  const extractedCollection = extractCollectionFromQuestion(
    question,
    availableCollections
  );

  // Check if any mentioned names are collection names
  let isCollectionQuery = false;
  let targetCollection: string | undefined = extractedCollection;

  if (availableCollections && availableCollections.length > 0) {
    // Look for collection names mentioned in the question
    for (const collectionName of availableCollections) {
      if (q.includes(collectionName.toLowerCase())) {
        isCollectionQuery = true;
        targetCollection = collectionName;
        console.log(`🎯 Detected collection name in query: ${collectionName}`);
        break;
      }
    }
  }

  // Handle pronouns in fallback if context is available
  let processedQuestion = question;
  if (context?.lastEntity) {
    // Handle pronouns using context
    if (
      q.includes(" he ") ||
      q.includes(" him ") ||
      q.includes("he ") ||
      q.includes("him ")
    ) {
      console.log("🔄 FALLBACK: Resolving 'he/him' to:", context.lastEntity);
      processedQuestion = processedQuestion.replace(
        /\b(he|him)\b/gi,
        context.lastEntity
      );
    }
    if (
      q.includes(" they ") ||
      q.includes(" them ") ||
      q.includes("they ") ||
      q.includes("them ")
    ) {
      console.log("🔄 FALLBACK: Resolving 'they/them' to:", context.lastEntity);
      processedQuestion = processedQuestion.replace(
        /\b(they|them)\b/gi,
        context.lastEntity
      );
    }
    if (q.includes(" their ") || q.includes(" his ") || q.includes(" her ")) {
      console.log("🔄 FALLBACK: Resolving possessive to:", context.lastEntity);
      processedQuestion = processedQuestion.replace(
        /\b(their|his|her)\b/gi,
        context.lastEntity + "'s"
      );
    }
  }

  // Handle ranking and "most" queries
  if (
    q.includes("which") &&
    (q.includes("most") ||
      q.includes("top") ||
      q.includes("best") ||
      q.includes("highest"))
  ) {
    const scope = extractedCollection ? "collection" : "database";

    if (q.includes("artist") && q.includes("most") && q.includes("image")) {
      return {
        type: "ranking",
        target: "entities",
        filter: null,
        limit: 1,
        scope,
        sortBy: "image_count",
        sortOrder: "desc",
        ...(extractedCollection && { extractedCollection }),
      };
    }

    if (q.includes("artist") && q.includes("most")) {
      return {
        type: "ranking",
        target: "entities",
        filter: null,
        limit: 1,
        scope,
        sortBy: "image_count",
        sortOrder: "desc",
        ...(extractedCollection && { extractedCollection }),
      };
    }
  }

  // Handle "top N" queries
  if (q.includes("top") && /top\s+(\d+)/.test(q)) {
    const limitMatch = q.match(/top\s+(\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 5;
    const scope = extractedCollection ? "collection" : "database";

    if (q.includes("artist")) {
      return {
        type: "top",
        target: "entities",
        filter: null,
        limit,
        scope,
        sortBy: "image_count",
        sortOrder: "desc",
        ...(extractedCollection && { extractedCollection }),
      };
    }
  }

  // Check for entity-specific queries with generic patterns (use processed question)
  // But first check if the mentioned name is actually a collection name
  const entityMatch =
    processedQuestion.match(
      /(?:by|from|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+(?:in|from|of|at|with|for)\b|$)/i
    ) ||
    processedQuestion.match(
      /(?:done\s+by|created\s+by|made\s+by|work\s+by|items\s+by|pieces\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+(?:in|from|of|at|with|for)\b|$)/i
    ) ||
    processedQuestion.match(
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s+(?:work|items|pieces|data|content))/i
    );

  let entityName: string | null = null;
  if (entityMatch) {
    const candidateName = entityMatch[1].trim();
    // Check if this is actually a collection name
    if (
      availableCollections &&
      availableCollections.some(
        (col) => col.toLowerCase() === candidateName.toLowerCase()
      )
    ) {
      // This is a collection name, not an entity name
      isCollectionQuery = true;
      targetCollection = candidateName;
      console.log(
        `🎯 Detected collection name in entity pattern: ${candidateName}`
      );
    } else {
      // This is an entity name
      entityName = candidateName;
    }
  }

  // Entity-specific queries (high priority)
  if (entityName) {
    const filter = { name: entityName };
    const scope = targetCollection ? "collection" : "database";

    if (
      q.includes("summary") ||
      q.includes("summarize") ||
      q.includes("summarise") ||
      (q.includes("give me") && q.includes("summary"))
    ) {
      return {
        type: "summarize",
        target: "items",
        filter,
        limit: 20,
        scope,
        ...(targetCollection && { extractedCollection: targetCollection }),
      };
    }

    if (q.includes("how many") || q.includes("count")) {
      return {
        type: "count",
        target: "items",
        filter,
        scope,
        ...(targetCollection && { extractedCollection: targetCollection }),
      };
    }

    if (q.includes("find") || q.includes("search") || q.includes("show")) {
      return {
        type: "search",
        target: "items",
        filter,
        limit: 10,
        scope,
        ...(targetCollection && { extractedCollection: targetCollection }),
      };
    }

    if (q.includes("analyze") || q.includes("analysis")) {
      return {
        type: "analyze",
        target: "items",
        filter,
        limit: 50,
        scope,
        ...(targetCollection && { extractedCollection: targetCollection }),
      };
    }
  }

  // Handle collection-specific queries (when no entity is specified)
  if (isCollectionQuery && targetCollection && !entityName) {
    const scope = "collection";

    if (
      q.includes("summarize") ||
      q.includes("summarise") ||
      q.includes("summary")
    ) {
      return {
        type: "describe",
        target: "collection",
        scope,
        extractedCollection: targetCollection,
      };
    }

    if (q.includes("describe")) {
      return {
        type: "describe",
        target: "collection",
        scope,
        extractedCollection: targetCollection,
      };
    }
  }

  // Database-level queries
  if (q.includes("collections") || q.includes("database")) {
    if (q.includes("how many") || q.includes("count")) {
      return { type: "count", target: "collections", scope: "database" };
    }
    if (q.includes("list") || q.includes("what") || q.includes("show")) {
      return { type: "collections", target: "list", scope: "database" };
    }
    if (q.includes("describe")) {
      return { type: "database", target: "overview", scope: "database" };
    }
  }

  // Collection-level queries (existing logic)
  if (q.includes("how many") || q.includes("count")) {
    if (
      q.includes("entities") ||
      q.includes("names") ||
      q.includes("creators")
    ) {
      return {
        type: "count",
        target: "entities",
        scope: extractedCollection ? "collection" : "database",
        ...(extractedCollection && { extractedCollection }),
      };
    }
    if (q.includes("vector") || q.includes("item") || q.includes("record")) {
      return {
        type: "count",
        target: "total",
        scope: extractedCollection ? "collection" : "database",
        ...(extractedCollection && { extractedCollection }),
      };
    }
    return {
      type: "count",
      target: "total",
      scope: extractedCollection ? "collection" : "database",
      ...(extractedCollection && { extractedCollection }),
    };
  }

  if (q.includes("find") || q.includes("search")) {
    // Check if it's across all collections
    const scope =
      q.includes("all collections") || q.includes("across")
        ? "database"
        : extractedCollection
        ? "collection"
        : "database";

    // Try to extract entity name (fallback pattern) - generic patterns
    const fallbackEntityMatch =
      question.match(
        /(?:by|from|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+(?:in|from|of|at|with|for)\b|$)/i
      ) ||
      question.match(
        /(?:done\s+by|created\s+by|made\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+(?:in|from|of|at|with|for)\b|$)/i
      );
    if (fallbackEntityMatch) {
      return {
        type: "search",
        target: "items",
        filter: { name: fallbackEntityMatch[1] },
        limit: 10,
        scope,
        ...(extractedCollection && { extractedCollection }),
      };
    }
    return {
      type: "search",
      target: "items",
      limit: 10,
      scope,
      ...(extractedCollection && { extractedCollection }),
    };
  }

  if (q.includes("list") || q.includes("show")) {
    if (
      q.includes("entities") ||
      q.includes("names") ||
      q.includes("creators")
    ) {
      return {
        type: "list",
        target: "entities",
        scope: extractedCollection ? "collection" : "database",
        ...(extractedCollection && { extractedCollection }),
      };
    }
    return {
      type: "list",
      target: "items",
      limit: 20,
      scope: extractedCollection ? "collection" : "database",
      ...(extractedCollection && { extractedCollection }),
    };
  }

  if (q.includes("describe")) {
    return {
      type: "describe",
      target: extractedCollection ? "collection" : "database",
      scope: extractedCollection ? "collection" : "database",
      ...(extractedCollection && { extractedCollection }),
    };
  }

  return {
    type: "describe",
    target: "collection",
    scope: extractedCollection ? "collection" : "database",
    ...(extractedCollection && { extractedCollection }),
  };
}

// New function to extract collection names from natural language
function extractCollectionFromQuestion(
  question: string,
  availableCollections?: string[]
): string | undefined {
  const q = question.toLowerCase();

  // First, check against available collections if provided
  if (availableCollections && availableCollections.length > 0) {
    for (const collectionName of availableCollections) {
      if (q.includes(collectionName.toLowerCase())) {
        console.log(`🎯 Found collection name in question: ${collectionName}`);
        return collectionName;
      }
    }
  }

  // Common patterns for mentioning collections
  const patterns = [
    // "in [collection]" or "from [collection]"
    /(?:in|from)\s+([a-zA-Z][a-zA-Z0-9_-]*)/g,
    // "[collection] collection"
    /([a-zA-Z][a-zA-Z0-9_-]*)\s+collection/g,
    // "collection [collection]"
    /collection\s+([a-zA-Z][a-zA-Z0-9_-]*)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(q)) !== null) {
      const candidate = match[1];
      // Filter out common words that aren't collection names
      if (
        ![
          "the",
          "this",
          "that",
          "my",
          "your",
          "our",
          "their",
          "all",
          "some",
          "any",
          "each",
          "every",
        ].includes(candidate)
      ) {
        // If we have available collections, check if this candidate matches
        if (availableCollections && availableCollections.length > 0) {
          const matchingCollection = availableCollections.find(
            (col) => col.toLowerCase() === candidate.toLowerCase()
          );
          if (matchingCollection) {
            return matchingCollection;
          }
        } else {
          return candidate;
        }
      }
    }
  }

  return undefined;
}

async function executeQuery(
  collection: string | null,
  intent: QueryIntent
): Promise<any> {
  if (intent.scope === "database") {
    return await executeDatabaseQuery(intent);
  } else {
    // Collection-level query - require collection name
    if (!collection) {
      throw new Error(
        "Collection name is required for collection-level queries"
      );
    }
    return await executeCollectionQuery(collection, intent);
  }
}

async function executeDatabaseQuery(intent: QueryIntent): Promise<any> {
  switch (intent.type) {
    case "count":
      if (intent.target === "collections") {
        return await countCollections();
      }
      if (intent.target === "artists") {
        return await countArtistsAcrossDatabase();
      }
      if (
        (intent.target === "images" || intent.target === "items") &&
        intent.filter
      ) {
        return await countImagesByArtistAcrossDatabase(intent.filter);
      }
      if (intent.target === "total") {
        return await countTotalVectorsAcrossDatabase();
      }
      // Fallback for count operations
      return await countTotalVectorsAcrossDatabase();

    case "collections":
      return await listCollections();

    case "database":
      return await describeDatabaseInfo();

    case "search":
      if (intent.filter) {
        return await searchAcrossCollections(intent.filter, intent.limit || 10);
      }
      break;

    case "summarize":
      if (intent.filter) {
        return await summarizeArtistAcrossDatabase(
          intent.filter,
          intent.limit || 20
        );
      }
      break;

    case "list":
      if (intent.target === "artists" || intent.target === "entities") {
        return await listArtistsAcrossDatabase(intent.limit || 50);
      }
      // Handle listing items from the collection with the most items
      if (
        intent.target === (process.env.ITEM_TYPE || "images") ||
        intent.target === "items" ||
        intent.target === "vectors"
      ) {
        const collectionName = await getCollectionWithMostItems();
        if (collectionName) {
          // We need to call a function that lists items for a specific collection.
          // Assuming listImages is appropriate, or create a generic listItems if needed.
          return await listImages(collectionName, intent.limit || 20);
        }
        // Fallback or error if no collection found
        return {
          items: [],
          message:
            "Could not determine the collection with the most items or it's empty.",
        };
      }
      break;

    case "top":
    case "ranking":
      if (intent.target === "entities" && intent.sortBy === "image_count") {
        return await getTopArtistsByImageCountAcrossDatabase(intent.limit || 1);
      }
      break;

    default:
      throw new Error(
        `Database-level query type '${intent.type}' not implemented yet`
      );
  }

  throw new Error(
    `Database-level query could not be executed: ${intent.type} ${intent.target}`
  );
}

async function executeCollectionQuery(
  collection: string,
  intent: QueryIntent
): Promise<any> {
  switch (intent.type) {
    case "count":
      if (intent.target === "artists") {
        return await countUniqueArtists(collection);
      } else if (
        (intent.target === "images" || intent.target === "items") &&
        intent.filter
      ) {
        return await countImagesByArtist(collection, intent.filter);
      } else {
        return await countTotal(collection);
      }

    case "search":
      return await searchImages(collection, intent.filter, intent.limit || 10);

    case "summarize":
      return await summarizeArtistWork(
        collection,
        intent.filter,
        intent.limit || 20
      );

    case "analyze":
      return await analyzeArtistWork(
        collection,
        intent.filter,
        intent.limit || 50
      );

    case "list":
      if (intent.target === "artists" || intent.target === "entities") {
        return await listUniqueArtists(collection, intent.limit || 50);
      } else {
        return await listImages(collection, intent.limit || 20);
      }

    case "filter":
      return await filterImages(collection, intent.filter, intent.limit || 20);

    case "describe":
      return await describeCollection(collection);

    case "top":
    case "ranking":
      if (intent.target === "entities" && intent.sortBy === "image_count") {
        return await getTopArtistsByImageCountInCollection(
          collection,
          intent.limit || 1
        );
      }
      break;

    default:
      throw new Error(`Unknown collection-level query type: ${intent.type}`);
  }
}

// New database-level functions
async function countCollections(): Promise<{
  count: number;
  collections: string[];
}> {
  const collectionsInfo = await client.getCollections();
  const collections = collectionsInfo.collections.map((c: any) => c.name);

  return {
    count: collections.length,
    collections: collections,
  };
}

async function listCollections(): Promise<{
  collections: Array<{ name: string; vectors_count?: number }>;
}> {
  const collectionsInfo = await client.getCollections();
  const collections = collectionsInfo.collections;

  // Get detailed info for each collection using actual count
  const detailedCollections = await Promise.all(
    collections.map(async (collection: any) => {
      try {
        // Use the same count method that works for individual queries
        const countResult = await client.count(collection.name, {});
        return {
          name: collection.name,
          vectors_count: countResult.count || 0,
        };
      } catch (error) {
        console.warn(
          `Failed to count vectors in collection ${collection.name}:`,
          error
        );
        return {
          name: collection.name,
          vectors_count: 0,
        };
      }
    })
  );

  return { collections: detailedCollections };
}

async function describeDatabaseInfo(): Promise<any> {
  const collectionsData = await listCollections();
  const totalVectors = collectionsData.collections.reduce(
    (sum, col) => sum + (col.vectors_count || 0),
    0
  );

  return {
    total_collections: collectionsData.collections.length,
    total_vectors: totalVectors,
    collections: collectionsData.collections,
  };
}

async function searchAcrossCollections(
  filter: any,
  limit: number
): Promise<any> {
  const collectionsData = await listCollections();
  const allResults: any[] = [];

  // Search each collection
  for (const collection of collectionsData.collections) {
    try {
      const results = await searchImages(collection.name, filter, limit);
      if (results.images && results.images.length > 0) {
        allResults.push({
          collection: collection.name,
          count: results.count,
          images: results.images,
        });
      }
    } catch (error) {
      console.warn(`Failed to search collection ${collection.name}:`, error);
    }
  }

  const totalCount = allResults.reduce((sum, result) => sum + result.count, 0);

  return {
    total_count: totalCount,
    collections_searched: collectionsData.collections.length,
    results_by_collection: allResults,
  };
}

// Existing collection-level functions remain the same
async function countTotal(collection: string): Promise<{ count: number }> {
  const response = await client.count(collection, {});
  return { count: response.count };
}

async function countUniqueArtists(
  collection: string,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<{ count: number; artists: string[] }> {
  // Get ALL points from the collection, not just 1000
  let allPoints: any[] = [];
  let offset: string | number | undefined = undefined;

  // Scroll through all points in the collection
  do {
    const response = await client.scroll(collection, {
      limit: 1000, // Process in batches of 1000
      ...(offset !== undefined && { offset }),
      with_payload: true,
      with_vector: false,
    });

    allPoints.push(...response.points);
    // Safely handle the offset type
    const nextOffset = response.next_page_offset;
    if (typeof nextOffset === "string" || typeof nextOffset === "number") {
      offset = nextOffset;
    } else {
      offset = undefined;
    }
  } while (offset !== null && offset !== undefined);

  const entities = new Set(
    allPoints
      .map((point: any) => getEntityValue(point, config))
      .filter((value): value is string => Boolean(value))
  );

  return {
    count: entities.size,
    artists: Array.from(entities).slice(0, 20), // Still limit the returned list for display
  };
}

async function searchImages(
  collection: string,
  filter: any,
  limit: number
): Promise<any> {
  const response = await client.scroll(collection, {
    limit: 1000,
    with_payload: true,
    with_vector: false,
  });

  let filteredPoints = response.points;

  if (filter) {
    filteredPoints = response.points.filter((point: any) => {
      return Object.entries(filter).every(([key, value]) => {
        return point.payload?.[key] === value;
      });
    });
  }

  const limitedPoints = filteredPoints.slice(0, limit);

  return {
    count: limitedPoints.length,
    images: limitedPoints,
  };
}

async function listUniqueArtists(
  collection: string,
  limit: number
): Promise<{ artists: string[] }> {
  // Get ALL points from the collection to ensure accurate artist listing
  let allPoints: any[] = [];
  let offset: string | number | undefined = undefined;

  // Scroll through all points in the collection
  do {
    const response = await client.scroll(collection, {
      limit: 1000, // Process in batches of 1000
      ...(offset !== undefined && { offset }),
      with_payload: true,
      with_vector: false,
    });

    allPoints.push(...response.points);
    // Safely handle the offset type
    const nextOffset = response.next_page_offset;
    if (typeof nextOffset === "string" || typeof nextOffset === "number") {
      offset = nextOffset;
    } else {
      offset = undefined;
    }
  } while (offset !== null && offset !== undefined);

  const artists = new Set(
    allPoints.map((point: any) => point.payload?.name).filter(Boolean)
  );

  // Return the requested number of artists
  return { artists: Array.from(artists).slice(0, limit) };
}

async function listImages(collection: string, limit: number): Promise<any> {
  const response = await client.scroll(collection, {
    limit,
    with_payload: true,
    with_vector: false,
  });

  return {
    count: response.points.length,
    images: response.points.map((point: any) => ({
      id: point.id,
      artist: point.payload?.name,
      filename: point.payload?.file_name,
    })),
  };
}

async function filterImages(
  collection: string,
  filter: any,
  limit: number
): Promise<any> {
  return await searchImages(collection, filter, limit);
}

async function describeCollection(collection: string): Promise<any> {
  const totalCount = await countTotal(collection);
  const artistsData = await countUniqueArtists(collection);
  const sampleImages = await listImages(collection, 5);

  return {
    total_images: totalCount.count,
    unique_artists: artistsData.count,
    sample_artists: artistsData.artists.slice(0, 10),
    sample_images: sampleImages.images,
  };
}

async function generateResponse(
  question: string,
  intent: QueryIntent,
  data: any,
  provider: EmbeddingProvider,
  model?: string
): Promise<string> {
  const fallbackResponse = generateFallbackResponse(question, intent, data);

  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    return fallbackResponse;
  }

  const systemPrompt = `You are a helpful assistant that explains vector database query results in natural language.
  
The user asked: "${question}"
The query type was: ${intent.type}
The data returned is: ${JSON.stringify(data, null, 2)}

IMPORTANT GUIDELINES FOR RANKING/TOP QUERIES:
- If there are ties (multiple artists with the same count), ALWAYS mention this explicitly
- Don't say "X has the most" if there are ties - say "X is tied for the most" or "X and Y are tied"
- Pay attention to the "has_tie", "tie_count", and "artists_with_max_count" fields in the data
- Be precise with singular/plural forms (1 image vs 2 images)
- If the user asked for "the artist with most" but there's a tie, explain the tie situation clearly

Provide a concise, natural language response that directly answers the user's question. Be specific with numbers and names when available, and always be accurate about ties and rankings.`;

  try {
    let response: string;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      const geminiModel = genAI.getGenerativeModel({
        model: model || "gemini-2.0-flash", // Use specific model parameter
      });
      const result = await geminiModel.generateContent(systemPrompt);
      response = result.response.text();
    } else if (provider === "openai" && process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: model || "gpt-3.5-turbo", // Use specific model parameter
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.3,
          max_tokens: 200,
        });
        response = completion.choices[0].message.content || fallbackResponse;
      } catch (openaiError: any) {
        console.warn(
          "OpenAI failed in generateResponse, trying Gemini fallback:",
          openaiError.message
        );
        // Auto-fallback to Gemini if OpenAI fails
        if (process.env.GEMINI_API_KEY) {
          const geminiModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
          });
          const result = await geminiModel.generateContent(systemPrompt);
          response = result.response.text();
        } else {
          throw openaiError; // Re-throw if no Gemini fallback available
        }
      }
    } else {
      return fallbackResponse;
    }

    return response.trim();
  } catch (error) {
    console.warn("Failed to generate LLM response, using fallback:", error);
    return fallbackResponse;
  }
}

function generateFallbackResponse(
  question: string,
  intent: QueryIntent,
  data: any
): string {
  // Safely handle null/undefined data
  const safeData = data || {};

  if (intent.scope === "database") {
    switch (intent.type) {
      case "count":
        if (intent.target === "collections") {
          return `I found ${safeData.count || 0} collections in the database: ${
            safeData.collections?.join(", ") || "None found"
          }.`;
        }
        if (intent.target === "artists") {
          return `I found ${
            safeData.count || 0
          } unique artists across all collections. Some of them include: ${
            safeData.artists?.slice(0, 5).join(", ") || "No artists found"
          }.`;
        }
        if (intent.target === "images" && intent.filter?.name) {
          return `I found ${safeData.count || 0} images by ${
            safeData.artist || intent.filter.name
          } across all collections. ${
            safeData.by_collection?.length > 0
              ? `Found in: ${safeData.by_collection
                  .map((c: any) => `${c.collection} (${c.count})`)
                  .join(", ")}.`
              : ""
          }`;
        }
        if (intent.target === "total") {
          return `The database contains ${
            safeData.count || 0
          } total vectors across all collections.`;
        }
        break;
      case "collections":
        return `The database contains ${
          safeData.collections?.length || 0
        } collections: ${
          safeData.collections
            ?.map((c: any) => `${c.name} (${c.vectors_count || 0} vectors)`)
            .join(", ") || "None found"
        }.`;
      case "database":
        return `The database contains ${
          safeData.total_collections || 0
        } collections with a total of ${safeData.total_vectors || 0} vectors.`;
      case "search":
        return `I searched across ${
          safeData.collections_searched || 0
        } collections and found ${safeData.total_count || 0} matching items.`;
      case "summarize":
        if (intent.filter?.name) {
          return (
            `Summary of ${
              safeData.artist || intent.filter.name
            }'s work across the database:\n\n` +
            `Total Images: ${safeData.total_images || 0}\n` +
            `Collections: Found in ${
              safeData.collections_found || 0
            } collections\n` +
            `File Types: ${safeData.file_types?.join(", ") || "Various"}\n\n` +
            `Breakdown by collection:\n${
              safeData.by_collection
                ?.map((c: any) => `• ${c.collection}: ${c.image_count} images`)
                .join("\n") || "No collections found"
            }\n\n` +
            `Sample Images: ${
              safeData.sample_images
                ?.slice(0, 3)
                .map((img: any) => `${img.filename} (${img.collection})`)
                .join(", ") || "None found"
            }`
          );
        }
        break;
      case "list":
        if (intent.target === "artists") {
          return `I found ${
            safeData.artists?.length || 0
          } unique artists across all collections: ${
            safeData.artists?.slice(0, 10).join(", ") || "No artists found"
          }.`;
        }
        break;
    }
  }

  // Collection-level responses
  switch (intent.type) {
    case "count":
      if (intent.target === "artists") {
        return `I found ${
          safeData.count || 0
        } unique artists in the collection. Some of them include: ${
          safeData.artists?.slice(0, 5).join(", ") || "No artists found"
        }.`;
      } else if (intent.target === "images" && intent.filter?.name) {
        return `I found ${safeData.count || 0} images by ${
          safeData.artist || intent.filter.name
        } in this collection.${
          safeData.sample_images?.length > 0
            ? ` Sample files: ${safeData.sample_images
                .slice(0, 3)
                .map((img: any) => img.filename)
                .join(", ")}.`
            : ""
        }`;
      } else {
        return `The collection contains ${safeData.count || 0} total images.`;
      }

    case "search":
    case "filter":
      return `I found ${safeData.count || 0} images matching your criteria.`;

    case "summarize":
      if (intent.filter?.name) {
        return (
          `Summary of ${
            safeData.artist || intent.filter.name
          }'s work in this collection:\n\n` +
          `Total Images: ${safeData.total_images || 0}\n` +
          `File Types: ${safeData.file_types?.join(", ") || "Various"}\n` +
          `Sample Files: ${
            safeData.sample_filenames?.slice(0, 5).join(", ") || "None"
          }\n\n` +
          `Image Details:\n${
            safeData.images
              ?.slice(0, 5)
              .map(
                (img: any, i: number) =>
                  `${i + 1}. ${img.filename || "Unknown file"}`
              )
              .join("\n") || "No images found"
          }`
        );
      }
      break;

    case "analyze":
      if (intent.filter?.name) {
        return (
          `Analysis of ${
            safeData.artist || intent.filter.name
          }'s work patterns:\n\n` +
          `Total Images: ${safeData.total_images || 0}\n` +
          `File Types: ${
            Object.entries(safeData.file_type_distribution || {})
              .map(([type, count]) => `${type} (${count})`)
              .join(", ") || "Various"
          }\n` +
          `Common Patterns: ${
            Object.entries(safeData.common_naming_patterns || {})
              .slice(0, 3)
              .map(([pattern, count]) => `"${pattern}" (${count} files)`)
              .join(", ") || "No patterns found"
          }\n` +
          `Source Domains: ${
            Object.keys(safeData.source_domains || {}).join(", ") || "Various"
          }`
        );
      }
      break;

    case "list":
      if (intent.target === "artists") {
        return `Here are the artists in the collection: ${
          safeData.artists?.slice(0, 10).join(", ") || "No artists found"
        }${safeData.artists?.length > 10 ? "..." : ""}.`;
      } else {
        return `I found ${safeData.count || 0} items in the collection.`;
      }

    case "describe":
      return `This collection contains ${
        safeData.total_images || 0
      } images from ${
        safeData.unique_artists || 0
      } unique artists. Some featured artists include: ${
        safeData.sample_artists?.slice(0, 5).join(", ") || "No artists found"
      }.`;

    case "top":
    case "ranking":
      if (safeData.top_artists && safeData.top_artists.length > 0) {
        // Check for ties at the top
        if (safeData.has_tie && intent.limit === 1) {
          // Handle the case where user asked for "the artist with most" but there's a tie
          const tiedArtists =
            safeData.artists_with_max_count ||
            safeData.top_artists.filter(
              (artist: any) => artist.image_count === safeData.max_image_count
            );

          if (tiedArtists.length === 2) {
            return `There's a tie! Both ${tiedArtists[0].name} and ${
              tiedArtists[1].name
            } have the most images with ${safeData.max_image_count} image${
              safeData.max_image_count === 1 ? "" : "s"
            } each.`;
          } else if (tiedArtists.length > 2) {
            const lastArtist = tiedArtists[tiedArtists.length - 1].name;
            const otherArtists = tiedArtists
              .slice(0, -1)
              .map((a: any) => a.name)
              .join(", ");
            return `There's a ${
              tiedArtists.length
            }-way tie! ${otherArtists}, and ${lastArtist} all have the most images with ${
              safeData.max_image_count
            } image${safeData.max_image_count === 1 ? "" : "s"} each.`;
          }
        }

        // Handle regular cases (no tie or user asked for multiple results)
        if (intent.limit === 1 && !safeData.has_tie) {
          const topArtist = safeData.top_artists[0];
          return `${topArtist.name} has the most images with ${
            topArtist.image_count
          } image${topArtist.image_count === 1 ? "" : "s"}.`;
        } else {
          // Multiple results or tie situation where we show the list
          const artistList = safeData.top_artists
            .map(
              (artist: any, index: number) =>
                `${index + 1}. ${artist.name} (${artist.image_count} image${
                  artist.image_count === 1 ? "" : "s"
                })`
            )
            .join(", ");

          let response = `Top ${
            intent.limit || safeData.top_artists.length
          } artists by image count: ${artistList}`;

          // Add tie information if relevant
          if (safeData.has_tie && safeData.tie_count > 1) {
            response += `. Note: ${
              safeData.tie_count
            } artists are tied for the highest count of ${
              safeData.max_image_count
            } image${safeData.max_image_count === 1 ? "" : "s"}.`;
          }

          return response;
        }
      }
      return "No artists found with images.";

    default:
      return "I processed your query successfully using pattern matching.";
  }

  return "I processed your query successfully.";
}

// New database-level functions for artists and total counts
async function countArtistsAcrossDatabase(): Promise<{
  count: number;
  artists: string[];
}> {
  const collectionsData = await listCollections();
  const allArtists = new Set<string>();

  // Collect artists from each collection
  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        const artistsData = await countUniqueArtists(collection.name);
        artistsData.artists.forEach((artist) => allArtists.add(artist));
      }
    } catch (error) {
      console.warn(
        `Failed to get artists from collection ${collection.name}:`,
        error
      );
    }
  }

  return {
    count: allArtists.size,
    artists: Array.from(allArtists).slice(0, 20), // Show first 20
  };
}

async function countTotalVectorsAcrossDatabase(): Promise<{
  count: number;
  by_collection: Array<{ name: string; count: number }>;
}> {
  const collectionsData = await listCollections();
  const totalVectors = collectionsData.collections.reduce(
    (sum, col) => sum + (col.vectors_count || 0),
    0
  );

  return {
    count: totalVectors,
    by_collection: collectionsData.collections.map((col) => ({
      name: col.name,
      count: col.vectors_count || 0,
    })),
  };
}

async function listArtistsAcrossDatabase(limit: number): Promise<{
  artists: string[];
  by_collection: Array<{ collection: string; artists: string[] }>;
}> {
  const collectionsData = await listCollections();
  const allArtists = new Set<string>();
  const byCollection: Array<{ collection: string; artists: string[] }> = [];

  // Collect artists from each collection
  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        const artistsData = await listUniqueArtists(
          collection.name,
          Math.min(limit, 20)
        );
        artistsData.artists.forEach((artist) => allArtists.add(artist));
        byCollection.push({
          collection: collection.name,
          artists: artistsData.artists,
        });
      }
    } catch (error) {
      console.warn(
        `Failed to get artists from collection ${collection.name}:`,
        error
      );
    }
  }

  return {
    artists: Array.from(allArtists).slice(0, limit),
    by_collection: byCollection,
  };
}

// New function to count images by specific artist
async function countImagesByArtist(
  collection: string,
  filter: any
): Promise<{ count: number; artist: string; sample_images: any[] }> {
  const response = await client.scroll(collection, {
    limit: 1000,
    with_payload: true,
    with_vector: false,
  });

  let filteredPoints = response.points;
  if (filter) {
    filteredPoints = response.points.filter((point: any) => {
      return Object.entries(filter).every(([key, value]) => {
        return point.payload?.[key] === value;
      });
    });
  }

  return {
    count: filteredPoints.length,
    artist: filter?.name || "unknown",
    sample_images: filteredPoints.slice(0, 5).map((point: any) => ({
      id: point.id,
      filename: point.payload?.file_name,
      url: point.payload?.image_url,
    })),
  };
}

// New function to provide detailed summary of artist's work
async function summarizeArtistWork(
  collection: string,
  filter: any,
  limit: number
): Promise<any> {
  const response = await client.scroll(collection, {
    limit: 1000,
    with_payload: true,
    with_vector: false,
  });

  let filteredPoints = response.points;
  if (filter) {
    filteredPoints = response.points.filter((point: any) => {
      return Object.entries(filter).every(([key, value]) => {
        return point.payload?.[key] === value;
      });
    });
  }

  const limitedPoints = filteredPoints.slice(0, limit);

  // Analyze file types and patterns
  const fileExtensions = new Set<string>();
  const fileNames: string[] = [];
  const imageUrls: string[] = [];

  limitedPoints.forEach((point: any) => {
    if (point.payload?.file_name) {
      const ext = point.payload.file_name.split(".").pop()?.toLowerCase();
      if (ext) fileExtensions.add(ext);
      fileNames.push(point.payload.file_name);
    }
    if (point.payload?.image_url) {
      imageUrls.push(point.payload.image_url);
    }
  });

  return {
    artist: filter?.name || "unknown",
    total_images: filteredPoints.length,
    displayed_images: limitedPoints.length,
    file_types: Array.from(fileExtensions),
    sample_filenames: fileNames.slice(0, 8),
    sample_urls: imageUrls.slice(0, 5),
    images: limitedPoints.map((point: any) => ({
      id: point.id,
      filename: point.payload?.file_name,
      image_url: point.payload?.image_url,
      style_url: point.payload?.url,
    })),
  };
}

// New function to analyze artist's work patterns
async function analyzeArtistWork(
  collection: string,
  filter: any,
  limit: number
): Promise<any> {
  const response = await client.scroll(collection, {
    limit: 1000,
    with_payload: true,
    with_vector: false,
  });

  let filteredPoints = response.points;
  if (filter) {
    filteredPoints = response.points.filter((point: any) => {
      return Object.entries(filter).every(([key, value]) => {
        return point.payload?.[key] === value;
      });
    });
  }

  // Analyze patterns in the artist's work
  const fileTypes = new Map();
  const namingPatterns = new Map();
  const urlPatterns = new Map();

  filteredPoints.forEach((point: any) => {
    // File type analysis
    if (point.payload?.file_name) {
      const ext = point.payload.file_name.split(".").pop()?.toLowerCase();
      if (ext) {
        fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
      }

      // Naming pattern analysis
      const namePattern = point.payload.file_name
        .replace(/\d+/g, "#")
        .replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
      namingPatterns.set(
        namePattern,
        (namingPatterns.get(namePattern) || 0) + 1
      );
    }

    // URL pattern analysis
    if (point.payload?.url) {
      const domain = point.payload.url.split("/")[2];
      if (domain) {
        urlPatterns.set(domain, (urlPatterns.get(domain) || 0) + 1);
      }
    }
  });

  return {
    artist: filter?.name || "unknown",
    total_images: filteredPoints.length,
    file_type_distribution: Object.fromEntries(fileTypes),
    common_naming_patterns: Object.fromEntries(
      Array.from(namingPatterns.entries())
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    ),
    source_domains: Object.fromEntries(urlPatterns),
    sample_images: filteredPoints.slice(0, 10).map((point: any) => ({
      id: point.id,
      filename: point.payload?.file_name,
      image_url: point.payload?.image_url,
    })),
  };
}

// New function to count specific artist images across all collections
async function countImagesByArtistAcrossDatabase(filter: any): Promise<{
  count: number;
  artist: string;
  by_collection: Array<{ collection: string; count: number }>;
}> {
  const collectionsData = await listCollections();
  const resultsByCollection: Array<{ collection: string; count: number }> = [];
  let totalCount = 0;

  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        const result = await countImagesByArtist(collection.name, filter);
        if (result.count > 0) {
          resultsByCollection.push({
            collection: collection.name,
            count: result.count,
          });
          totalCount += result.count;
        }
      }
    } catch (error) {
      console.warn(
        `Failed to count images in collection ${collection.name}:`,
        error
      );
    }
  }

  return {
    count: totalCount,
    artist: filter?.name || "unknown",
    by_collection: resultsByCollection,
  };
}

// New function to summarize artist work across all collections
async function summarizeArtistAcrossDatabase(
  filter: any,
  limit: number
): Promise<any> {
  const collectionsData = await listCollections();
  const allImages: any[] = [];
  const collectionSummaries: any[] = [];
  const fileTypes = new Set<string>();

  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        const summary = await summarizeArtistWork(collection.name, filter, 50);
        if (summary.total_images > 0) {
          collectionSummaries.push({
            collection: collection.name,
            ...summary,
          });
          allImages.push(...summary.images);
          summary.file_types?.forEach((type: string) => fileTypes.add(type));
        }
      }
    } catch (error) {
      console.warn(
        `Failed to summarize artist work in collection ${collection.name}:`,
        error
      );
    }
  }

  const totalImages = allImages.length;
  const displayedImages = allImages.slice(0, limit);

  return {
    artist: filter?.name || "unknown",
    total_images: totalImages,
    displayed_images: displayedImages.length,
    collections_found: collectionSummaries.length,
    file_types: Array.from(fileTypes),
    by_collection: collectionSummaries.map((summary) => ({
      collection: summary.collection,
      image_count: summary.total_images,
      sample_filenames: summary.sample_filenames?.slice(0, 3),
    })),
    sample_images: displayedImages.map((image: any) => ({
      id: image.id,
      filename: image.filename,
      image_url: image.image_url,
      collection: collectionSummaries.find((c) =>
        c.images?.some((img: any) => img.id === image.id)
      )?.collection,
    })),
  };
}

async function getTopArtistsByImageCountAcrossDatabase(
  limit: number
): Promise<any> {
  const collectionsData = await listCollections();
  const artistCounts: {
    [artistName: string]: { count: number; collections: string[] };
  } = {};

  // Collect artist counts from all collections
  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        // Get ALL points from the collection to count by artist
        let allPoints: any[] = [];
        let offset: string | number | undefined = undefined;

        // Scroll through all points in the collection
        do {
          const scrollResult = await client.scroll(collection.name, {
            limit: 1000, // Process in batches of 1000
            ...(offset !== undefined && { offset }),
            with_payload: true,
          });

          allPoints.push(...scrollResult.points);
          // Safely handle the offset type
          const nextOffset = scrollResult.next_page_offset;
          if (
            typeof nextOffset === "string" ||
            typeof nextOffset === "number"
          ) {
            offset = nextOffset;
          } else {
            offset = undefined;
          }
        } while (offset !== null && offset !== undefined);

        for (const point of allPoints) {
          const artistName = point.payload?.name;
          if (artistName && typeof artistName === "string") {
            if (!artistCounts[artistName]) {
              artistCounts[artistName] = { count: 0, collections: [] };
            }
            artistCounts[artistName].count++;
            if (
              !artistCounts[artistName].collections.includes(collection.name)
            ) {
              artistCounts[artistName].collections.push(collection.name);
            }
          }
        }
      }
    } catch (error) {
      console.warn(
        `Failed to get artists from collection ${collection.name}:`,
        error
      );
    }
  }

  // Sort artists by image count
  const sortedArtists = Object.entries(artistCounts)
    .map(([name, data]) => ({
      name,
      image_count: data.count,
      collections: data.collections,
    }))
    .sort((a, b) => b.image_count - a.image_count);

  // Analyze the distribution to detect ties
  const maxCount = sortedArtists.length > 0 ? sortedArtists[0].image_count : 0;
  const artistsWithMaxCount = sortedArtists.filter(
    (artist) => artist.image_count === maxCount
  );
  const hasTie = artistsWithMaxCount.length > 1;

  // Get the requested number of top artists
  const topArtists = sortedArtists.slice(0, limit);

  // Calculate some statistics
  const totalImages = Object.values(artistCounts).reduce(
    (sum, data) => sum + data.count,
    0
  );
  const averageImagesPerArtist = totalImages / Object.keys(artistCounts).length;

  // Group artists by image count for better analysis
  const countGroups: { [count: number]: string[] } = {};
  sortedArtists.forEach((artist) => {
    if (!countGroups[artist.image_count]) {
      countGroups[artist.image_count] = [];
    }
    countGroups[artist.image_count].push(artist.name);
  });

  return {
    top_artists: topArtists,
    total_artists_found: Object.keys(artistCounts).length,
    collections_searched: collectionsData.collections.length,
    max_image_count: maxCount,
    artists_with_max_count: artistsWithMaxCount,
    has_tie: hasTie,
    tie_count: artistsWithMaxCount.length,
    total_images: totalImages,
    average_images_per_artist: Math.round(averageImagesPerArtist * 100) / 100,
    distribution: countGroups,
    analysis: {
      is_evenly_distributed:
        Object.keys(countGroups).length === Object.keys(artistCounts).length,
      most_common_count:
        Object.entries(countGroups).sort(
          (a, b) => b[1].length - a[1].length
        )[0]?.[0] || "0",
    },
  };
}

async function getTopArtistsByImageCountInCollection(
  collection: string,
  limit: number
): Promise<any> {
  // Get ALL points from the collection, not just 1000
  let allPoints: any[] = [];
  let offset: string | number | undefined = undefined;

  // Scroll through all points in the collection
  do {
    const response = await client.scroll(collection, {
      limit: 1000, // Process in batches of 1000
      ...(offset !== undefined && { offset }),
      with_payload: true,
      with_vector: false,
    });

    allPoints.push(...response.points);
    // Safely handle the offset type
    const nextOffset = response.next_page_offset;
    if (typeof nextOffset === "string" || typeof nextOffset === "number") {
      offset = nextOffset;
    } else {
      offset = undefined;
    }
  } while (offset !== null && offset !== undefined);

  const artistCounts: { [artistName: string]: number } = {};

  for (const point of allPoints) {
    const artistName = point.payload?.name;
    if (artistName && typeof artistName === "string") {
      if (!artistCounts[artistName]) {
        artistCounts[artistName] = 0;
      }
      artistCounts[artistName]++;
    }
  }

  const sortedArtists = Object.entries(artistCounts)
    .map(([name, count]) => ({
      name,
      image_count: count,
    }))
    .sort((a, b) => b.image_count - a.image_count);

  // Analyze the distribution to detect ties
  const maxCount = sortedArtists.length > 0 ? sortedArtists[0].image_count : 0;
  const artistsWithMaxCount = sortedArtists.filter(
    (artist) => artist.image_count === maxCount
  );
  const hasTie = artistsWithMaxCount.length > 1;

  // Get the requested number of top artists
  const topArtists = sortedArtists.slice(0, limit);

  // Calculate some statistics
  const totalImages = Object.values(artistCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  const averageImagesPerArtist = totalImages / Object.keys(artistCounts).length;

  // Group artists by image count for better analysis
  const countGroups: { [count: number]: string[] } = {};
  sortedArtists.forEach((artist) => {
    if (!countGroups[artist.image_count]) {
      countGroups[artist.image_count] = [];
    }
    countGroups[artist.image_count].push(artist.name);
  });

  return {
    top_artists: topArtists,
    total_artists_found: Object.keys(artistCounts).length,
    collections_searched: 1,
    max_image_count: maxCount,
    artists_with_max_count: artistsWithMaxCount,
    has_tie: hasTie,
    tie_count: artistsWithMaxCount.length,
    total_images: totalImages,
    average_images_per_artist: Math.round(averageImagesPerArtist * 100) / 100,
    distribution: countGroups,
    analysis: {
      is_evenly_distributed:
        Object.keys(countGroups).length === Object.keys(artistCounts).length,
      most_common_count:
        Object.entries(countGroups).sort(
          (a, b) => b[1].length - a[1].length
        )[0]?.[0] || "0",
    },
  };
}

async function getCollectionWithMostItems(): Promise<string | null> {
  const collectionsData = await listCollections();
  if (
    !collectionsData.collections ||
    collectionsData.collections.length === 0
  ) {
    return null;
  }

  let maxItems = -1;
  let collectionWithMostItems: string | null = null;

  for (const collection of collectionsData.collections) {
    if ((collection.vectors_count || 0) > maxItems) {
      maxItems = collection.vectors_count || 0;
      collectionWithMostItems = collection.name;
    }
  }
  return collectionWithMostItems;
}
