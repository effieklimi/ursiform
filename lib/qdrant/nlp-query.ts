import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { client } from "./db";
import { EmbeddingProvider } from "../schemas";
import { ConversationContext, ConversationTurn } from "../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
    | "ranking"
    | "aggregate"; // Add new query types for complex queries
  target: string; // what to count/search/list
  filter?: any; // any filters to apply
  limit?: number;
  scope: "collection" | "database"; // new: scope of the query
  extractedCollection?: string; // new: collection name extracted from query text
  sortBy?: string; // new: what to sort by (e.g., "image_count", "popularity")
  sortOrder?: "asc" | "desc"; // new: sort order
  aggregationFunction?: "sum" | "average" | "min" | "max"; // For type "aggregate"
  aggregationField?: string; // For type "aggregate"
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
1. Query type (count, search, list, filter, describe, summarize, analyze, collections, database, top, ranking, aggregate)
2. What to target (items, entities, collections, or a specific field for aggregation)
3. Filters to apply: an object where keys are field names and values are filter values, or an array of such objects for AND conditions. Include operators if specified (e.g., contains, greaterThan).
4. Query scope (collection-specific or database-wide)
5. Collection name if mentioned
6. Sort criteria for ranking queries
7. For aggregation: the aggregation function (average, sum, min, max) and the target field.

Available collections in this database: ${availableCollections.join(", ")}
Configuration for entity and item types (use these to understand user intent):
- Entity Field (identifier for entities, e.g., a name or ID): ${
    DEFAULT_CONFIG.entityField
  }
- Entity Type (what entities are called, e.g., artists, authors): ${
    DEFAULT_CONFIG.entityType
  }
- Item Type (what individual records are called, e.g., images, documents): ${
    DEFAULT_CONFIG.itemType
  }
- Available additional item fields: ${Object.keys(
    DEFAULT_CONFIG.additionalFields || {}
  ).join(", ")}

IMPORTANT: When parsing the query, check if mentioned names are collection names first before treating them as entity names.
- If a name matches a collection name, set "extractedCollection" and "scope" to "collection"
- If a name doesn't match any collection, and it seems to be an identifier for an entity (based on context or phrasing like "by [Name]"), use '${
    DEFAULT_CONFIG.entityField
  }' as the key in the filter object. E.g., filter: {"${
    DEFAULT_CONFIG.entityField
  }": "[Name]"}

Available scopes:
- "collection": query operates on a specific collection
- "database": query operates on the entire database

Available query types:
- "top": find top N items or entities by some criteria
- "ranking": rank items or entities by some criteria
- "count": count items/entities matching criteria
- "search": find specific items/entities
- "list": list items or entities
- "summarize": provide summary of items/entities
- "analyze": analyze patterns in items/entities
- "aggregate": perform an aggregation (sum, average, min, max) on a numeric field of items.

IMPORTANT: Extract filter conditions from natural language:
- "by [Name]", "from [Name]", "of [Name]" → {"${
    DEFAULT_CONFIG.entityField
  }": "[Name]"}
- "[property] is [value]" → {"[property]": "[value]"}
- "[property] contains [value]" → {"[property]": {"contains": "[value]"}} (or adapt based on backend capabilities)
- "[property] greater than [value]" → {"[property]": {"gt": value}}
- "[property] less than [value]" → {"[property]": {"lt": value}}
- For multiple conditions like "X and Y", represent the filter as an array of objects: [{"fieldA": "valueA"}, {"fieldB": "valueB"}]

For ranking/top queries, identify what to sort by (e.g., "${
    DEFAULT_CONFIG.itemType
  }_count", "popularity", or a specific field name).

When you find an entity name used as a filter, use '${
    DEFAULT_CONFIG.entityField
  }' as the filter key.
`;

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
  "type": "count|search|list|filter|describe|summarize|analyze|collections|database|top|ranking|aggregate",
  "target": "what to count/search/list/aggregate (e.g., 'items', 'entities', 'collections', or a specific numeric field for aggregation like 'price')",
  "filter": {"[field_name]": "[value]"} or [{"[field_A]": "value_A"}, {"[field_B]": "value_B"}] or null, // Can be an object for single filter or array for AND conditions
  "limit": number or null,
  "scope": "collection|database",
  "extractedCollection": "collection_name_if_mentioned_in_query" or null,
  "sortBy": "${DEFAULT_CONFIG.itemType}_count|popularity|name|field_name" or null,
  "sortOrder": "asc|desc" or null,
  "aggregationFunction": "sum|average|min|max" or null, // For type "aggregate"
  "aggregationField": "field_name_to_aggregate_on" or null // For type "aggregate"
}

Examples:
- "How many ${DEFAULT_CONFIG.itemType} by John Doe?" → {"type": "count", "target": "${DEFAULT_CONFIG.itemType}", "filter": {"${DEFAULT_CONFIG.entityField}": "John Doe"}, "limit": null, "scope": "database", "extractedCollection": null}
- "Which ${DEFAULT_CONFIG.entityType} has the most ${DEFAULT_CONFIG.itemType}?" → {"type": "ranking", "target": "${DEFAULT_CONFIG.entityType}", "filter": null, "limit": 1, "scope": "database", "extractedCollection": null, "sortBy": "${DEFAULT_CONFIG.itemType}_count", "sortOrder": "desc"}
- "Top 5 ${DEFAULT_CONFIG.entityType} by ${DEFAULT_CONFIG.itemType}_count in mycollection" → {"type": "top", "target": "${DEFAULT_CONFIG.entityType}", "filter": null, "limit": 5, "scope": "collection", "extractedCollection": "mycollection", "sortBy": "${DEFAULT_CONFIG.itemType}_count", "sortOrder": "desc"}
- "Summarize Alice Smith's work in mycollection" → {"type": "summarize", "target": "${DEFAULT_CONFIG.itemType}", "filter": {"${DEFAULT_CONFIG.entityField}": "Alice Smith"}, "limit": 10, "scope": "collection", "extractedCollection": "mycollection"}
- "Find ${DEFAULT_CONFIG.itemType} by Bob Johnson where description contains keyword" → {"type": "search", "target": "${DEFAULT_CONFIG.itemType}", "filter": [{"${DEFAULT_CONFIG.entityField}": "Bob Johnson"}, {"description": {"contains": "keyword"}}], "limit": 10, "scope": "database", "extractedCollection": null}
- "What is the average price of products?" → {"type": "aggregate", "target": "price", "filter": null, "limit": null, "scope": "database", "extractedCollection": null, "aggregationFunction": "average", "aggregationField": "price"}
- "Show ${DEFAULT_CONFIG.itemType} with price greater than 100 and category electronics" → {"type": "search", "target": "${DEFAULT_CONFIG.itemType}", "filter": [{"price": {"gt": 100}}, {"category": "electronics"}], "limit": null, "scope": "database", "extractedCollection": null}
`;

  try {
    let response: string;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      const result = await genAI.models.generateContent({
        model: model || "gemini-2.0-flash",
        contents: [{ text: systemPrompt }, { text: `Question: "${question}"` }],
      });
      response = result.text || "fallbackResponse";
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
          const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
              { text: systemPrompt },
              { text: `Question: "${question}"` },
            ],
          });
          response = result.text || "{}";
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
  const config = DEFAULT_CONFIG;
  switch (intent.type) {
    case "count":
      if (intent.target === "collections") {
        return await countCollections();
      }
      if (intent.target === config.entityType || intent.target === "entities") {
        return await countEntitiesAcrossDatabase(config); // Corrected back to countEntitiesAcrossDatabase
      }
      if (
        (intent.target === config.itemType || intent.target === "items") && // User asking for specific item type like "images" or generic "items"
        intent.target !== "total" && // Differentiate from purely "total" vectors
        !(intent.filter && intent.filter[config.entityField]) // Not an entity-specific item count
      ) {
        // Pass the specific item type (e.g., "images" or actual config.itemType if intent.target is "items")
        const targetItemType =
          intent.target === "items" ? config.itemType : intent.target;
        return await countTotalItemsAcrossDatabase(config, targetItemType);
      }
      if (intent.filter && intent.filter[config.entityField]) {
        // This is for counting items BY a specific entity, should remain separate
        return await countItemsByEntityAcrossDatabase(intent.filter, config);
      }
      if (intent.target === "total") {
        // User explicitly asks for "total" vectors/records
        return await countTotalItemsAcrossDatabase(config, null); // No specific type to count
      }
      // Fallback for count operations if none of the above matched precisely
      // (e.g., if intent.target was something unexpected but type is count)
      // Default to counting total vectors without a specific type focus.
      return await countTotalItemsAcrossDatabase(config, null);

    case "collections":
      return await listCollections();

    case "database":
      return await describeDatabaseInfo(); // This function internally uses listCollections which is somewhat generic

    case "search":
      if (intent.filter && intent.filter[config.entityField]) {
        // searchAcrossCollections needs to be updated to use searchItems and config
        return await searchAcrossCollections(
          intent.filter,
          intent.limit || 10,
          config
        );
      }
      // Add a more generic search if no entity filter is provided?
      break;

    case "summarize":
      if (intent.filter && intent.filter[config.entityField]) {
        return await summarizeEntityAcrossDatabase(
          intent.filter,
          intent.limit || 20,
          config
        );
      }
      break;

    case "list":
      if (intent.target === config.entityType || intent.target === "entities") {
        return await listEntitiesAcrossDatabase(intent.limit || 50, config);
      }
      if (
        intent.target === config.itemType ||
        intent.target === "items" ||
        intent.target === "vectors" // Keep vectors for a bit for compatibility with old error message context
      ) {
        const collectionName = await getCollectionWithMostItems();
        if (collectionName) {
          return await listItems(collectionName, intent.limit || 20, config);
        }
        return {
          items: [],
          message: `Could not determine the collection with the most ${config.itemType} or it's empty.`,
        };
      }
      break;

    case "top":
    case "ranking":
      if (
        (intent.target === config.entityType || intent.target === "entities") &&
        intent.sortBy === `${config.itemType}_count`
      ) {
        return await getTopEntitiesByItemCountAcrossDatabase(
          intent.limit || 1,
          config
        );
      }
      // Add more ranking/top targets as new features are added
      break;

    case "aggregate":
      if (
        intent.extractedCollection &&
        intent.aggregationFunction &&
        intent.aggregationField
      ) {
        // If a collection is specified in the intent, delegate to collection-level aggregation
        // We need to call executeCollectionQuery, but it's not directly accessible here.
        // Instead, we can replicate its aggregation logic for the specified collection.
        // Or, ideally, refactor to have a shared aggregation core function.
        // For now, let's call a temporary helper or directly implement.

        // Re-using parts of executeCollectionQuery's aggregation logic for the specific collection:
        const collection = intent.extractedCollection;
        let pointsToAggregate: any[] = [];
        let currentOffset: any = undefined; // Changed type to any
        const scrollLimit = 250;

        do {
          const scrollResult = await client.scroll(collection, {
            limit: scrollLimit,
            ...(currentOffset !== undefined && { offset: currentOffset }),
            with_payload: true,
            filter: intent.filter
              ? convertIntentFilterToQdrant(intent.filter, config)
              : undefined,
          });
          pointsToAggregate.push(...scrollResult.points);
          currentOffset = scrollResult.next_page_offset;
        } while (currentOffset !== null && currentOffset !== undefined);

        if (pointsToAggregate.length === 0) {
          return {
            result: null,
            message: `No ${config.itemType} found in collection '${collection}' to aggregate.`,
          };
        }
        const values = pointsToAggregate
          .map((p) => p.payload?.[intent.aggregationField!])
          .filter((v) => typeof v === "number") as number[];
        if (values.length === 0) {
          return {
            result: null,
            message: `Field '${intent.aggregationField}' not found or not numeric in the ${config.itemType} within collection '${collection}'.`,
          };
        }
        let result: number | null = null;
        switch (intent.aggregationFunction) {
          case "sum":
            result = values.reduce((acc, val) => acc + val, 0);
            break;
          case "average":
            result = values.reduce((acc, val) => acc + val, 0) / values.length;
            break;
          case "min":
            result = Math.min(...values);
            break;
          case "max":
            result = Math.max(...values);
            break;
          default:
            return {
              result: null,
              message: `Unsupported aggregation function: ${intent.aggregationFunction}`,
            };
        }
        return {
          collection_name: collection,
          aggregation_function: intent.aggregationFunction,
          aggregation_field: intent.aggregationField,
          item_count_considered: values.length,
          total_items_scanned: pointsToAggregate.length,
          result: result,
        };
      } else if (intent.aggregationFunction && intent.aggregationField) {
        // No specific collection, and database-wide aggregation is complex without more specific item targeting.
        return {
          result: null,
          message: `Database-wide aggregation for field '${intent.aggregationField}' requires a specific collection to be identified in your query, or a filter that clearly targets a set of ${config.itemType} across collections.`,
        };
      }
      return {
        result: null,
        message:
          "Aggregation function, field, or target collection not sufficiently specified for database-level aggregation.",
      };

    default:
      throw new Error(
        `Database-level query type '${intent.type}' not implemented yet for target '${intent.target}'`
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
  const config = DEFAULT_CONFIG;
  switch (intent.type) {
    case "count":
      if (intent.target === config.entityType || intent.target === "entities") {
        return await countUniqueEntities(collection, config);
      } else if (
        (intent.target === config.itemType || intent.target === "items") &&
        intent.filter &&
        intent.filter[config.entityField]
      ) {
        return await countItemsByEntity(collection, intent.filter, config);
      } else {
        // Default to counting total items in the collection
        return await countTotal(collection);
      }

    case "search":
      // Ensure filter is passed correctly, searchItems handles entityField internally
      return await searchItems(
        collection,
        intent.filter,
        intent.limit || 10,
        config
      );

    case "summarize":
      if (intent.filter && intent.filter[config.entityField]) {
        return await summarizeEntityWork(
          collection,
          intent.filter,
          intent.limit || 20,
          config
        );
      }
      // Add case for summarizing whole collection if no entity filter?
      break;

    case "analyze":
      if (intent.filter && intent.filter[config.entityField]) {
        return await analyzeEntityWork(
          collection,
          intent.filter,
          intent.limit || 50,
          config
        );
      }
      break;

    case "list":
      if (intent.target === config.entityType || intent.target === "entities") {
        return await listUniqueEntities(collection, intent.limit || 50, config);
      } else {
        return await listItems(collection, intent.limit || 20, config);
      }

    case "filter": // filter intent often implies a search with specific criteria
      return await searchItems(
        collection,
        intent.filter,
        intent.limit || 20,
        config
      );

    case "describe":
      // describeCollection already uses DEFAULT_CONFIG internally
      return await describeCollection(collection);

    case "aggregate":
      if (intent.aggregationFunction && intent.aggregationField) {
        // Fetch all points matching the filter (if any) in the collection
        // For simplicity, we'll scroll all points if no filter, or apply a basic filter.
        // More complex filtering for aggregation can be added later.
        let pointsToAggregate: any[] = [];
        let currentOffset: any = undefined; // Changed type to any
        const scrollLimit = 250; // Process in batches

        do {
          const scrollResult = await client.scroll(collection, {
            limit: scrollLimit,
            ...(currentOffset !== undefined && { offset: currentOffset }),
            with_payload: true, // Ensure payload is fetched
            filter: intent.filter
              ? convertIntentFilterToQdrant(intent.filter, config)
              : undefined,
          });
          pointsToAggregate.push(...scrollResult.points);
          currentOffset = scrollResult.next_page_offset;
        } while (currentOffset !== null && currentOffset !== undefined);

        if (pointsToAggregate.length === 0) {
          return {
            result: null,
            message: `No ${config.itemType} found to aggregate.`,
          };
        }

        const values = pointsToAggregate
          .map((p) => p.payload?.[intent.aggregationField!])
          .filter((v) => typeof v === "number") as number[];

        if (values.length === 0) {
          return {
            result: null,
            message: `Field '${intent.aggregationField}' not found or not numeric in the ${config.itemType}.`,
          };
        }

        let result: number | null = null;
        switch (intent.aggregationFunction) {
          case "sum":
            result = values.reduce((acc, val) => acc + val, 0);
            break;
          case "average":
            result = values.reduce((acc, val) => acc + val, 0) / values.length;
            break;
          case "min":
            result = Math.min(...values);
            break;
          case "max":
            result = Math.max(...values);
            break;
          default:
            return {
              result: null,
              message: `Unsupported aggregation function: ${intent.aggregationFunction}`,
            };
        }
        return {
          aggregation_function: intent.aggregationFunction,
          aggregation_field: intent.aggregationField,
          item_count_considered: values.length, // Number of items that had the numeric field
          total_items_scanned: pointsToAggregate.length, // Total items matching filter (or all)
          result: result,
        };
      }
      return {
        result: null,
        message: "Aggregation function or field not specified in intent.",
      };

    case "top":
    case "ranking":
      if (
        (intent.target === config.entityType || intent.target === "entities") &&
        intent.sortBy === `${config.itemType}_count`
      ) {
        return await getTopEntitiesByItemCountInCollection(
          collection,
          intent.limit || 1,
          config
        );
      }
      break;

    default:
      throw new Error(
        `Unknown collection-level query type: ${intent.type} for target ${intent.target}`
      );
  }
  // Add a fallback throw here if a case doesn't return for some reason
  throw new Error(
    `Collection-level query could not be fully processed: ${intent.type} ${intent.target}`
  );
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
  collections: Array<{
    name: string;
    vectors_count?: number;
    itemTypeHint?: string; // New: Hint for the type of items in the collection
    sample_payloads?: any[]; // New: Sample payloads for inspection
  }>;
}> {
  const collectionsInfo = await client.getCollections();
  const rawCollections = collectionsInfo.collections;
  const config = DEFAULT_CONFIG; // For accessing additionalFields config

  const detailedCollections = await Promise.all(
    rawCollections.map(async (collection: any) => {
      let itemCount = 0;
      let itemTypeHint: string = "unknown";
      let samplePayloads: any[] = [];

      try {
        const countResult = await client.count(collection.name, {});
        itemCount = countResult.count || 0;

        if (itemCount > 0) {
          // Fetch a few sample items to infer type
          const sampleScroll = await client.scroll(collection.name, {
            limit: 3,
            with_payload: true,
          });
          samplePayloads = sampleScroll.points.map((p) => p.payload);

          if (samplePayloads.length > 0) {
            let hints: string[] = [];
            for (const payload of samplePayloads) {
              if (payload.mime_type && typeof payload.mime_type === "string") {
                if (payload.mime_type.startsWith("image/")) hints.push("image");
                else if (payload.mime_type.startsWith("text/"))
                  hints.push("document");
                else if (payload.mime_type.startsWith("application/pdf"))
                  hints.push("document");
                // Add more MIME type checks as needed
                else hints.push("data"); // Generic data if MIME type is not recognized
              } else if (
                config.additionalFields?.filename &&
                payload[config.additionalFields.filename]
              ) {
                const filename =
                  payload[config.additionalFields.filename].toLowerCase();
                if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/))
                  hints.push("image");
                else if (filename.match(/\.(txt|md|doc|docx|pdf)$/))
                  hints.push("document");
                // Add more extension checks
                else hints.push("file"); // Generic file if extension not recognized
              }
            }
            if (hints.length > 0) {
              const uniqueHints = [...new Set(hints)];
              if (uniqueHints.length === 1) itemTypeHint = uniqueHints[0];
              else itemTypeHint = "mixed";
            }
          }
        }
      } catch (error) {
        console.warn(
          `Failed to get details for collection ${collection.name}:`,
          error
        );
        // Keep itemCount as 0 and itemTypeHint as unknown if error occurs
      }
      return {
        name: collection.name,
        vectors_count: itemCount,
        itemTypeHint: itemCount > 0 ? itemTypeHint : undefined, // only provide hint if collection not empty
        // sample_payloads: samplePayloads, // Optionally return payloads if needed for debugging or more complex logic later
      };
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
  limit: number,
  config: DatabaseConfig = DEFAULT_CONFIG // Added config
): Promise<any> {
  const collectionsData = await listCollections();
  const allResults: any[] = [];

  // Search each collection
  for (const collection of collectionsData.collections) {
    try {
      // Use generic searchItems and pass config
      const results = await searchItems(collection.name, filter, limit, config);
      if (results.items && results.items.length > 0) {
        allResults.push({
          collection: collection.name,
          count: results.count,
          items: results.items, // Changed from images to items
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

async function countUniqueEntities(
  collection: string,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<{ count: number; entities: string[] }> {
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
    entities: Array.from(entities).slice(0, 20), // Still limit the returned list for display
  };
}

async function searchItems(
  collection: string,
  filter: any,
  limit: number,
  config: DatabaseConfig = DEFAULT_CONFIG
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

  const items = limitedPoints.map((point: any) => {
    const item: any = {
      id: point.id,
      [config.entityField]: point.payload?.[config.entityField],
    };

    // Safely access additionalFields
    const filenameField = config.additionalFields?.filename;
    const urlField = config.additionalFields?.url;
    const descriptionField = config.additionalFields?.description;

    if (filenameField && point.payload?.[filenameField]) {
      item[filenameField] = point.payload[filenameField];
    }
    if (urlField && point.payload?.[urlField]) {
      item[urlField] = point.payload[urlField];
    }
    if (descriptionField && point.payload?.[descriptionField]) {
      item[descriptionField] = point.payload[descriptionField];
    }

    // Include the full payload for flexibility
    item.payload = point.payload;

    return item;
  });

  return {
    count: limitedPoints.length,
    items,
  };
}

async function listUniqueEntities(
  collection: string,
  limit: number,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<{ entities: string[] }> {
  // Get ALL points from the collection to ensure accurate entity listing
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
      .map((point: any) => point.payload?.[config.entityField])
      .filter(Boolean)
  );

  // Return the requested number of entities
  return { entities: Array.from(entities).slice(0, limit) };
}

async function listItems(
  collection: string,
  limit: number,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<any> {
  const response = await client.scroll(collection, {
    limit,
    with_payload: true,
    with_vector: false,
  });

  const items = response.points.map((point: any) => {
    const item: any = {
      id: point.id,
      [config.entityField]: point.payload?.[config.entityField],
    };

    // Safely access additionalFields
    const filenameField = config.additionalFields?.filename;
    const urlField = config.additionalFields?.url;
    const descriptionField = config.additionalFields?.description;

    if (filenameField && point.payload?.[filenameField]) {
      item[filenameField] = point.payload[filenameField];
    }
    if (urlField && point.payload?.[urlField]) {
      item[urlField] = point.payload[urlField];
    }
    if (descriptionField && point.payload?.[descriptionField]) {
      item[descriptionField] = point.payload[descriptionField];
    }

    return item;
  });

  return {
    count: items.length,
    items: items.slice(0, limit),
  };
}

async function filterImages(
  collection: string,
  filter: any,
  limit: number
): Promise<any> {
  return await searchItems(collection, filter, limit, DEFAULT_CONFIG); // Pass config, call searchItems
}

async function describeCollection(collection: string): Promise<any> {
  const totalCount = await countTotal(collection);
  const entitiesData = await countUniqueEntities(collection);
  const sampleItems = await listItems(collection, 5);

  return {
    total_items: totalCount.count,
    unique_entities: entitiesData.count,
    sample_entities: entitiesData.entities.slice(0, 10),
    sample_items: sampleItems.items,
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
  const config = DEFAULT_CONFIG;

  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    return fallbackResponse;
  }

  let systemPrompt = `You are a helpful assistant that explains vector database query results in natural language.
General item type for this database is "${
    config.itemType
  }", and general entity type is "${config.entityType}".

DATA STRUCTURE FOR DATABASE COUNTS (intent.type === 'count' && intent.scope === 'database' && (intent.target === '${
    config.itemType
  }' || intent.target === 'items' || intent.target === 'total')):
- data.total_vectors_count: Grand total of all vectors/records.
- data.count_of_queried_item_type: (Optional) Count of the specific item type the user asked for (e.g., if they asked for "images" and itemTypeHint matched "image").
- data.queried_item_type: (Optional) The specific item type string (e.g., "images") that data.count_of_queried_item_type refers to.
- data.by_collection: Array of { name: string, count: number, itemTypeHint?: string (e.g., "image", "document", "mixed", "unknown") }.

RESPONSE LOGIC FOR DATABASE COUNTS:
1. MAIN SUMMARY:
   - If data.count_of_queried_item_type is available and greater than 0: Start with "There are a total of [data.count_of_queried_item_type] [data.queried_item_type]...".
   - Else if user asked for a specific type (intent.target is not 'total' or 'items'): Start with "Found 0 of the queried ${
     intent.target
   }."
   - Else (user asked for general 'total' or 'items', or specific type count is 0): Start with "There are a total of [data.total_vectors_count] vectors/records in the database..."
2. DISTRIBUTION DETAILS (ALWAYS SHOW THIS if data.by_collection exists):
   - State: "These are distributed across the following collections:"
   - For each collection in data.by_collection:
     - List as: "- [collection.name]: [collection.count] [derived type]"
     - To derive type: 
         - If collection.itemTypeHint is available and not 'unknown': Use it (e.g., "5 images", "1 document", "3 mixed types").
         - Else if collection.count > 0: Use "vectors/records" (e.g., "2 vectors/records").
         - Else (count is 0): Use "0 vectors/records".
     - If the user queried a *specific* item type (e.g., intent.target was "images") AND this collection's itemTypeHint is known AND it *differs* from the queried type: Add a note like "(not the queried '[intent.target]')". E.g., "docs_gemini: 1 document (not the queried 'images')".

The user asked: "${question}"
The query intent was: ${JSON.stringify(intent, null, 2)}
The data returned is: ${JSON.stringify(data, null, 2)}

OTHER GUIDELINES:
- Be concise.
- For lists not covered above, summarize if long.
- AGGREGATION: "The [data.aggregation_function] of [data.aggregation_field] for the considered ${
    config.itemType
  } is [data.result]."
- RANKING/TOP: Explicitly mention ties for top spot. Be precise with plurals.

Provide a natural language response based on these guidelines and the provided data.`;

  try {
    let response: string;

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      const result = await genAI.models.generateContent({
        model: model || "gemini-2.0-flash",
        contents: [{ text: systemPrompt }, { text: `Question: "${question}"` }],
      });
      response = result.text || "fallbackResponse";
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
          "OpenAI failed in generateResponse, trying Gemini fallback:",
          openaiError.message
        );
        // Auto-fallback to Gemini if OpenAI fails
        if (process.env.GEMINI_API_KEY) {
          const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
              { text: systemPrompt },
              { text: `Question: "${question}"` },
            ],
          });
          response = result.text || "{}";
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
  const safeData = data || {};
  const config = DEFAULT_CONFIG;

  if (intent.scope === "database") {
    switch (intent.type) {
      case "count":
        if (intent.target === "collections") {
          return `I found ${safeData.count || 0} collections in the database: ${
            safeData.collections?.join(", ") || "None found"
          }.`;
        }
        if (
          intent.target === config.entityType ||
          intent.target === "entities"
        ) {
          return `I found ${safeData.count || 0} unique ${
            config.entityType + pluralize(safeData.count || 0)
          } across all collections. Some of them include: ${
            safeData.entities?.slice(0, 5).join(", ") ||
            `No ${config.entityType + pluralize(0)} found`
          }.`;
        }
        // This now handles data from the enhanced countTotalItemsAcrossDatabase
        if (
          intent.target === config.itemType ||
          intent.target === "items" ||
          intent.target === "total"
        ) {
          const totalVectors = safeData.total_vectors_count || 0;
          const byCollection = safeData.by_collection || [];
          const numCollections = byCollection.length;
          let summaryMessage = "";

          if (
            safeData.queried_item_type &&
            typeof safeData.count_of_queried_item_type === "number"
          ) {
            if (safeData.count_of_queried_item_type > 0) {
              summaryMessage = `Found ${safeData.count_of_queried_item_type} ${safeData.queried_item_type}.`;
            } else {
              summaryMessage = `Found 0 of the queried ${safeData.queried_item_type}.`;
            }
            if (totalVectors !== safeData.count_of_queried_item_type) {
              summaryMessage += ` The database contains a total of ${totalVectors} vectors/records.`;
            }
          } else {
            summaryMessage = `The database contains ${totalVectors} total vectors/records.`;
          }
          summaryMessage += ` These are distributed across ${numCollections} collection${pluralize(
            numCollections
          )}.`;

          if (byCollection.length > 0) {
            summaryMessage += "\nBreakdown by collection:";
            summaryMessage += byCollection
              .map((c: any) => {
                let typeLabel =
                  c.itemTypeHint && c.itemTypeHint !== "unknown"
                    ? c.itemTypeHint + pluralize(c.count)
                    : "vector" +
                      pluralize(c.count) +
                      "/record" +
                      pluralize(c.count);

                // Check if user queried a specific type AND this collection's hint differs
                const singularQueriedType =
                  intent.target !== "total" && intent.target.endsWith("s")
                    ? intent.target.slice(0, -1)
                    : intent.target;
                if (
                  intent.target !== "total" &&
                  intent.target !== "items" &&
                  c.itemTypeHint &&
                  c.itemTypeHint !== "unknown" &&
                  c.itemTypeHint !== singularQueriedType
                ) {
                  typeLabel += ` (not the queried '${intent.target}')`;
                }
                return `\n- ${c.name}: ${c.count} ${typeLabel}`;
              })
              .join("");
          }
          return summaryMessage;
        }
        if (intent.filter && intent.filter[config.entityField]) {
          return `I found ${safeData.count || 0} ${
            config.itemType + pluralize(safeData.count || 0)
          } by ${
            safeData.entity || intent.filter[config.entityField]
          } across all collections. ${
            safeData.by_collection?.length > 0
              ? `Found in: ${safeData.by_collection
                  .map((c: any) => `${c.collection} (${c.count})`)
                  .join(", ")}.`
              : ""
          }`;
        }
        return `The database contains ${
          safeData.total_vectors_count || safeData.count || 0
        } total vectors/records across all collections.`; // Fallback if data structure is old

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
        } collections and found ${safeData.total_count || 0} matching items.`; // Assuming items is generic enough here
      case "summarize":
        if (intent.filter?.name) {
          return (
            `Summary of ${
              safeData.entity || intent.filter.name
            }'s work across the database:\n\n` +
            `Total Items: ${safeData.total_items || 0}\n` +
            `Collections: Found in ${
              safeData.collections_found || 0
            } collections\n` +
            `File Types: ${safeData.file_types?.join(", ") || "Various"}\n\n` +
            `Breakdown by collection:\n${
              safeData.by_collection
                ?.map((c: any) => `• ${c.collection}: ${c.item_count} items`)
                .join("\n") || "No collections found"
            }\n\n` +
            `Sample Items: ${
              safeData.sample_items
                ?.slice(0, 3)
                .map((img: any) => `${img.filename} (${img.collection})`)
                .join(", ") || "None found"
            }`
          );
        }
        break;
      case "list":
        if (
          intent.target === config.entityType ||
          intent.target === "entities"
        ) {
          return `I found ${safeData.entities?.length || 0} unique ${
            config.entityType + pluralize(safeData.entities?.length || 0)
          } across all collections: ${
            safeData.entities?.slice(0, 10).join(", ") ||
            `No ${config.entityType + pluralize(0)} found`
          }.`;
        }
        if (
          intent.target === config.itemType ||
          intent.target === "items" ||
          intent.target === "vectors"
        ) {
          if (safeData.items && safeData.items.length > 0) {
            return `Found ${safeData.items.length} ${
              config.itemType + pluralize(safeData.items.length)
            } across the database. Sample: ${safeData.items[0].id}...`;
          } else if (safeData.message) {
            return safeData.message;
          }
          return `No ${
            config.itemType + pluralize(0)
          } found across the database matching your criteria.`;
        }
        break;
    }
  }

  // Collection-level responses
  switch (intent.type) {
    case "count":
      if (intent.target === config.entityType || intent.target === "entities") {
        return `I found ${safeData.count || 0} unique ${
          config.entityType + pluralize(safeData.count || 0)
        } in the collection. Some of them include: ${
          safeData.entities?.slice(0, 5).join(", ") ||
          `No ${config.entityType + pluralize(0)} found`
        }.`;
      } else if (intent.filter && intent.filter[config.entityField]) {
        return `I found ${safeData.count || 0} ${
          config.itemType + pluralize(safeData.count || 0)
        } by ${
          safeData.entity || intent.filter[config.entityField]
        } in this collection.${
          safeData.sample_items?.length > 0
            ? ` Sample files: ${safeData.sample_items
                .slice(0, 3)
                .map(
                  (item: any) =>
                    item[config.additionalFields?.filename || "filename"] ||
                    item.id
                )
                .join(", ")}.`
            : ""
        }`;
      } else {
        return `The collection contains ${safeData.count || 0} total ${
          config.itemType + pluralize(safeData.count || 0)
        }.`;
      }

    case "search":
    case "filter":
      return `I found ${safeData.count || 0} ${
        config.itemType + pluralize(safeData.count || 0)
      } matching your criteria.`; // Added pluralize

    case "summarize":
      if (intent.filter?.name) {
        // ... (summary for entity in collection - assuming itemType is implicitly items/images based on context)
        // This part is harder to make fully generic with pluralize without more context from data structure
        return (
          `Summary of ${
            safeData.entity || intent.filter.name
          }'s work in this collection:\n\n` +
          `Total Items: ${safeData.total_items || 0}\n` +
          `File Types: ${safeData.file_types?.join(", ") || "Various"}\n` +
          `Sample Files: ${
            safeData.sample_filenames?.slice(0, 5).join(", ") || "None"
          }\n\n` +
          `Item Details:\n${
            safeData.items
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
        // Similar to summarize, uses artist/image specific terms from data structure
        return (
          `Analysis of ${
            safeData.artist || intent.filter.name // artist might be hardcoded in data structure
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
              .map(([pattern, count]) => `\"${pattern}\" (${count} files)`)
              .join(", ") || "No patterns found"
          }\n` +
          `Source Domains: ${
            Object.keys(safeData.source_domains || {}).join(", ") || "Various"
          }`
        );
      }
      break;

    case "list":
      if (intent.target === config.entityType || intent.target === "entities") {
        return `Here are the ${
          config.entityType + pluralize(safeData.entities?.length || 0)
        } in the collection: ${
          safeData.entities?.slice(0, 10).join(", ") ||
          `No ${config.entityType + pluralize(0)} found`
        }${safeData.entities?.length > 10 ? "..." : ""}.`;
      } else {
        // Corrected this specific problematic line
        return `I found ${safeData.count || 0} ${
          config.itemType + pluralize(safeData.count || 0)
        } in the collection.`;
      }

    case "describe":
      return `This collection contains ${safeData.total_items || 0} ${
        config.itemType + pluralize(safeData.total_items || 0)
      } from ${safeData.unique_entities || 0} unique ${
        config.entityType + pluralize(safeData.unique_entities || 0)
      }. Some featured ${
        config.entityType + pluralize(safeData.sample_entities?.length || 0)
      } include: ${
        safeData.sample_entities?.slice(0, 5).join(", ") ||
        `No ${config.entityType + pluralize(0)} found`
      }.`;

    case "top":
    case "ranking":
      if (safeData.top_artists && safeData.top_artists.length > 0) {
        // top_artists is specific to older structure
        // This section is hard to fully generify without knowing the exact generic data structure for top entities/items
        // Assuming for now that config.entityType would replace 'artists' and config.itemType for 'images' if data was generic
        const topEntities = safeData.top_artists; // Generic alias
        const maxItemCount = safeData.max_image_count; // Generic alias
        const entitiesWithMaxCount = safeData.artists_with_max_count; // Generic alias

        if (safeData.has_tie && intent.limit === 1) {
          const tiedEntities =
            entitiesWithMaxCount ||
            topEntities.filter(
              (entity: any) => entity.image_count === maxItemCount
            );

          if (tiedEntities.length === 2) {
            return `There's a tie! Both ${tiedEntities[0].name} and ${
              tiedEntities[1].name
            } have the most ${
              config.itemType + pluralize(maxItemCount)
            } with ${maxItemCount} ${
              config.itemType + pluralize(maxItemCount)
            } each.`;
          } else if (tiedEntities.length > 2) {
            const lastEntity = tiedEntities[tiedEntities.length - 1].name;
            const otherEntities = tiedEntities
              .slice(0, -1)
              .map((a: any) => a.name)
              .join(", ");
            return `There's a ${
              tiedEntities.length
            }-way tie! ${otherEntities}, and ${lastEntity} all have the most ${
              config.itemType + pluralize(maxItemCount)
            } with ${maxItemCount} ${
              config.itemType + pluralize(maxItemCount)
            } each.`;
          }
        }

        if (intent.limit === 1 && !safeData.has_tie) {
          const topEntity = topEntities[0];
          return `${topEntity.name} has the most ${
            config.itemType + pluralize(topEntity.image_count)
          } with ${topEntity.image_count} ${
            config.itemType + pluralize(topEntity.image_count)
          }.`;
        } else {
          const entityList = topEntities
            .map(
              (entity: any, index: number) =>
                `${index + 1}. ${entity.name} (${entity.image_count} ${
                  config.itemType + pluralize(entity.image_count)
                })` // Assuming image_count is item_count
            )
            .join(", ");

          let responseText = `Top ${intent.limit || topEntities.length} ${
            config.entityType + pluralize(intent.limit || topEntities.length)
          } by ${config.itemType}_count: ${entityList}`;

          if (safeData.has_tie && safeData.tie_count > 1) {
            responseText += `. Note: ${safeData.tie_count} ${
              config.entityType + pluralize(safeData.tie_count)
            } are tied for the highest count of ${maxItemCount} ${
              config.itemType + pluralize(maxItemCount)
            }.`;
          }
          return responseText;
        }
      }
      return `No ${config.entityType + pluralize(0)} found with ${
        config.itemType + pluralize(0)
      }.`; // Generic fallback

    default:
      return "I processed your query successfully using pattern matching.";
  }

  return "I processed your query successfully.";
}

function pluralize(count: number): string {
  return count === 1 ? "" : "s";
}

// Add pluralize to itemType usage in fallback responses.
// Example: config.itemType + pluralize(count)

// New database-level functions for artists and total counts
async function countEntitiesAcrossDatabase(
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<{
  count: number;
  entities: string[]; // Renamed from artists to entities for consistency
}> {
  const collectionsData = await listCollections();
  const allEntities = new Set<string>(); // Renamed from allArtists to allEntities

  // Collect entities from each collection
  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        // Call the generic countUniqueEntities function and pass the config
        const entitiesData = await countUniqueEntities(collection.name, config);
        entitiesData.entities.forEach((entity: string) =>
          allEntities.add(entity)
        ); // Use entitiesData.entities and add type to entity
      }
    } catch (error) {
      console.warn(
        `Failed to get ${config.entityType} from collection ${collection.name}:`,
        error
      );
    }
  }

  return {
    count: allEntities.size,
    entities: Array.from(allEntities).slice(0, 20), // Show first 20
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

async function listEntitiesAcrossDatabase(
  limit: number,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<{
  entities: string[]; // Renamed from artists
  by_collection: Array<{ collection: string; entities: string[] }>; // Renamed from artists
}> {
  const collectionsData = await listCollections();
  const allEntities = new Set<string>(); // Renamed from allArtists
  const byCollection: Array<{ collection: string; entities: string[] }> = []; // Renamed from artists

  // Collect entities from each collection
  for (const collection of collectionsData.collections) {
    try {
      if (collection.vectors_count && collection.vectors_count > 0) {
        const entitiesData = await listUniqueEntities(
          // Call to generic listUniqueEntities
          collection.name,
          Math.min(limit, 20),
          config // Pass config here
        );
        entitiesData.entities.forEach((entity) => allEntities.add(entity)); // Use entitiesData.entities
        byCollection.push({
          collection: collection.name,
          entities: entitiesData.entities, // Use entitiesData.entities
        });
      }
    } catch (error) {
      console.warn(
        `Failed to get ${config.entityType} from collection ${collection.name}:`,
        error
      );
    }
  }

  return {
    entities: Array.from(allEntities).slice(0, limit),
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

// Helper function to convert intent filter to Qdrant filter (basic implementation)
// This will need to be expanded significantly to support complex filters from the updated prompt
function convertIntentFilterToQdrant(filter: any, config: DatabaseConfig): any {
  if (!filter) return undefined;

  const qdrantFilter: { must?: any[]; should?: any[]; must_not?: any[] } = {
    must: [],
  };

  const processSingleFilter = (singleFilter: any) => {
    const conditions: any[] = [];
    for (const key in singleFilter) {
      const value = singleFilter[key];
      if (key === config.entityField) {
        conditions.push({ key: config.entityField, match: { value: value } });
      } else if (typeof value === "object" && value !== null) {
        if (value.contains) {
          conditions.push({ key: key, match: { text: value.contains } }); // Basic text containment
        } else if (value.gt) {
          conditions.push({ key: key, range: { gt: value.gt } });
        } else if (value.lt) {
          conditions.push({ key: key, range: { lt: value.lt } });
        }
        // Add more operators here (gte, lte, etc.)
      } else {
        conditions.push({ key: key, match: { value: value } });
      }
    }
    return conditions;
  };

  if (Array.isArray(filter)) {
    // Multiple AND conditions
    filter.forEach((subFilter) => {
      qdrantFilter.must!.push(...processSingleFilter(subFilter));
    });
  } else {
    // Single filter object
    qdrantFilter.must!.push(...processSingleFilter(filter));
  }

  return qdrantFilter.must!.length > 0 ? qdrantFilter : undefined;
}

// Renamed function
async function countTotalItemsAcrossDatabase(
  config: DatabaseConfig = DEFAULT_CONFIG,
  specificItemTypeToCount: string | null = null // New parameter
): Promise<{
  total_vectors_count: number;
  count_of_queried_item_type?: number;
  queried_item_type?: string;
  by_collection: Array<{ name: string; count: number; itemTypeHint?: string }>;
}> {
  const collectionsData = await listCollections(); // listCollections now returns itemTypeHint
  let totalVectors = 0;
  let countOfSpecificType = 0;

  // Determine the singular form of the queried type for accurate comparison
  const singularQueriedType =
    specificItemTypeToCount && specificItemTypeToCount.endsWith("s")
      ? specificItemTypeToCount.slice(0, -1)
      : specificItemTypeToCount;

  collectionsData.collections.forEach((col) => {
    totalVectors += col.vectors_count || 0;
    // Compare hint (singular) with the singular form of the queried type
    if (
      specificItemTypeToCount &&
      col.itemTypeHint &&
      col.itemTypeHint === singularQueriedType
    ) {
      countOfSpecificType += col.vectors_count || 0;
    }
  });

  const result: any = {
    total_vectors_count: totalVectors,
    by_collection: collectionsData.collections.map((col) => ({
      name: col.name,
      count: col.vectors_count || 0,
      itemTypeHint: col.itemTypeHint,
    })),
  };

  if (specificItemTypeToCount) {
    result.count_of_queried_item_type = countOfSpecificType;
    result.queried_item_type = specificItemTypeToCount; // Keep original (potentially plural) for response
  }

  return result;
}

// Generic wrapper functions that call the existing artist-specific functions
// These provide a generic interface while maintaining backward compatibility

async function countItemsByEntityAcrossDatabase(
  filter: any,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<{
  count: number;
  entity: string;
  by_collection: Array<{ collection: string; count: number }>;
}> {
  // Call the existing artist-specific function
  const result = await countImagesByArtistAcrossDatabase(filter);

  // Return with generic naming
  return {
    count: result.count,
    entity: result.artist, // Map artist to entity
    by_collection: result.by_collection,
  };
}

async function summarizeEntityAcrossDatabase(
  filter: any,
  limit: number,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<any> {
  // Call the existing artist-specific function
  const result = await summarizeArtistAcrossDatabase(filter, limit);

  // Return with generic field mapping if needed
  return {
    ...result,
    entity: result.artist, // Map artist to entity for consistency
  };
}

async function getTopEntitiesByItemCountAcrossDatabase(
  limit: number,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<any> {
  // Call the existing artist-specific function
  const result = await getTopArtistsByImageCountAcrossDatabase(limit);

  // Map artist-specific fields to generic ones
  return {
    ...result,
    top_entities: result.top_artists?.map((artist: any) => ({
      name: artist.name,
      item_count: artist.image_count, // Map image_count to item_count
      collections: artist.collections,
    })),
    total_entities_found: result.total_artists_found,
    max_item_count: result.max_image_count,
    entities_with_max_count: result.artists_with_max_count?.map(
      (artist: any) => ({
        name: artist.name,
        item_count: artist.image_count,
      })
    ),
    total_items: result.total_images,
    average_items_per_entity: result.average_images_per_artist,
  };
}

async function countItemsByEntity(
  collection: string,
  filter: any,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<{ count: number; entity: string; sample_items: any[] }> {
  // Call the existing artist-specific function
  const result = await countImagesByArtist(collection, filter);

  // Return with generic naming
  return {
    count: result.count,
    entity: result.artist, // Map artist to entity
    sample_items: result.sample_images, // Map sample_images to sample_items
  };
}

async function summarizeEntityWork(
  collection: string,
  filter: any,
  limit: number,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<any> {
  // Call the existing artist-specific function
  const result = await summarizeArtistWork(collection, filter, limit);

  // Return with generic field mapping
  return {
    ...result,
    entity: result.artist, // Map artist to entity
    total_items: result.total_images, // Map total_images to total_items
    displayed_items: result.displayed_images, // Map displayed_images to displayed_items
    items: result.images, // Map images to items
  };
}

async function analyzeEntityWork(
  collection: string,
  filter: any,
  limit: number,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<any> {
  // Call the existing artist-specific function
  const result = await analyzeArtistWork(collection, filter, limit);

  // Return with generic field mapping
  return {
    ...result,
    entity: result.artist, // Map artist to entity
    total_items: result.total_images, // Map total_images to total_items
    sample_items: result.sample_images, // Map sample_images to sample_items
  };
}

async function getTopEntitiesByItemCountInCollection(
  collection: string,
  limit: number,
  config: DatabaseConfig = DEFAULT_CONFIG
): Promise<any> {
  // Call the existing artist-specific function
  const result = await getTopArtistsByImageCountInCollection(collection, limit);

  // Map artist-specific fields to generic ones
  return {
    ...result,
    top_entities: result.top_artists?.map((artist: any) => ({
      name: artist.name,
      item_count: artist.image_count, // Map image_count to item_count
    })),
    total_entities_found: result.total_artists_found,
    max_item_count: result.max_image_count,
    entities_with_max_count: result.artists_with_max_count?.map(
      (artist: any) => ({
        name: artist.name,
        item_count: artist.image_count,
      })
    ),
    total_items: result.total_images,
    average_items_per_entity: result.average_images_per_artist,
  };
}
