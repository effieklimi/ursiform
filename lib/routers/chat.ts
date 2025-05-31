import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { DatabaseService } from "../db";

export const chatRouter = createTRPCRouter({
  // Get all chats
  getAll: publicProcedure.query(async () => {
    return await DatabaseService.getAllChats();
  }),

  // Get a specific chat with messages
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await DatabaseService.getChat(input.id);
    }),

  // Create a new chat
  create: publicProcedure
    .input(
      z.object({
        title: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await DatabaseService.createChat(input.title, input.tags);
    }),

  // Update chat title
  updateTitle: publicProcedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ input }) => {
      return await DatabaseService.updateChat(input.id, input.title);
    }),

  // Generate and update chat title and tags automatically
  generateTitleAndTags: publicProcedure
    .input(
      z.object({
        chatId: z.string(),
        userMessage: z.string(),
        assistantMessage: z.string(),
        selectedCollection: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Generate a concise title based on the conversation
        const title = await generateChatTitle(
          input.userMessage,
          input.assistantMessage
        );

        // Generate contextual tags
        const tags = generateChatTags(
          input.userMessage,
          input.assistantMessage,
          input.selectedCollection
        );

        // Update the chat with the generated title and tags
        const updatedChat = await DatabaseService.updateChat(
          input.chatId,
          title,
          tags
        );

        return updatedChat;
      } catch (error) {
        console.error("Error generating chat title and tags:", error);
        // Fallback to a simple title if generation fails
        const fallbackTitle = `Chat - ${new Date().toLocaleDateString()}`;
        const fallbackTags = input.selectedCollection
          ? [input.selectedCollection]
          : ["General"];
        return await DatabaseService.updateChat(
          input.chatId,
          fallbackTitle,
          fallbackTags
        );
      }
    }),

  // Delete a chat
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await DatabaseService.deleteChat(input.id);
      return { success: true };
    }),

  // Get chat count
  getCount: publicProcedure.query(async () => {
    return await DatabaseService.getChatCount();
  }),
});

// Helper function to generate chat titles
async function generateChatTitle(
  userMessage: string,
  assistantMessage: string
): Promise<string> {
  try {
    // Use a simple approach - extract key topics from the user message
    const title = extractTitleFromMessage(userMessage);
    return title;
  } catch (error) {
    console.error("Error generating title:", error);
    // Fallback to extracting keywords from user message
    const words = userMessage.split(" ").slice(0, 4);
    return words.join(" ") + (userMessage.split(" ").length > 4 ? "..." : "");
  }
}

// Helper function to generate contextual tags
function generateChatTags(
  userMessage: string,
  assistantMessage: string,
  selectedCollection?: string
): string[] {
  const tags: string[] = [];
  const message = userMessage.toLowerCase();

  // First priority: Add specific collection name if available
  if (selectedCollection) {
    tags.push(selectedCollection);
  } else {
    // Try to extract collection name from the message
    const extractedCollection = extractCollectionNameFromMessage(message);
    if (extractedCollection) {
      tags.push(extractedCollection);
    }
  }

  // Second priority: Determine query scope and type
  const queryScope = determineQueryScope(message);
  const queryType = determineQueryType(message);

  // Add scope-specific tags
  if (queryScope === "database") {
    tags.push("Database-wide");
  } else if (queryScope === "collections" && !selectedCollection) {
    tags.push("Collections");
  }

  // Add query type tags (only if not redundant)
  if (queryType && !tags.includes(queryType)) {
    tags.push(queryType);
  }

  // Add content-specific tags only if we don't have collection/scope tags
  if (tags.length < 2) {
    const contentTag = determineContentType(message);
    if (contentTag && !tags.includes(contentTag)) {
      tags.push(contentTag);
    }
  }

  // Remove duplicates and limit to 2 tags maximum
  const uniqueTags = [...new Set(tags)];
  return uniqueTags.slice(0, 2);
}

// Helper function to extract collection name from message
function extractCollectionNameFromMessage(message: string): string | null {
  // Look for common patterns that indicate collection names
  const collectionPatterns = [
    /from (\w+) collection/i,
    /in (\w+) collection/i,
    /(\w+) collection/i,
    /about (\w+)/i,
    /in (\w+)/i,
  ];

  for (const pattern of collectionPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const potential = match[1].toLowerCase();
      // Filter out common words that aren't collection names
      const commonWords = [
        "the",
        "my",
        "all",
        "any",
        "this",
        "that",
        "what",
        "how",
        "when",
        "where",
        "why",
        "which",
      ];
      if (!commonWords.includes(potential) && potential.length > 2) {
        return (
          match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
        );
      }
    }
  }

  return null;
}

// Helper function to determine query scope
function determineQueryScope(
  message: string
): "collection" | "database" | "collections" | null {
  // Database-wide indicators
  const databaseIndicators = [
    "across all",
    "database",
    "all collections",
    "total",
    "overall",
    "globally",
    "entire database",
    "whole database",
    "all data",
  ];

  // Collections overview indicators
  const collectionsIndicators = [
    "what collections",
    "how many collections",
    "list collections",
    "show collections",
    "available collections",
    "collections exist",
  ];

  if (databaseIndicators.some((indicator) => message.includes(indicator))) {
    return "database";
  }

  if (collectionsIndicators.some((indicator) => message.includes(indicator))) {
    return "collections";
  }

  return null;
}

// Helper function to determine query type
function determineQueryType(message: string): string | null {
  // Counting queries
  if (
    message.includes("how many") ||
    message.includes("count") ||
    message.includes("number of")
  ) {
    return "Count";
  }

  // Analysis queries
  if (
    message.includes("analyze") ||
    message.includes("analysis") ||
    message.includes("breakdown")
  ) {
    return "Analysis";
  }

  // Search/find queries
  if (
    message.includes("find") ||
    message.includes("search") ||
    message.includes("look for")
  ) {
    return "Search";
  }

  // List/show queries
  if (
    message.includes("list") ||
    message.includes("show") ||
    message.includes("display")
  ) {
    return "List";
  }

  // Summary queries
  if (
    message.includes("summarize") ||
    message.includes("summary") ||
    message.includes("overview")
  ) {
    return "Summary";
  }

  // Top/ranking queries
  if (
    message.includes("top") ||
    message.includes("most") ||
    message.includes("highest") ||
    message.includes("ranking")
  ) {
    return "Ranking";
  }

  // Comparison queries
  if (
    message.includes("compare") ||
    message.includes("difference") ||
    message.includes("versus") ||
    message.includes("vs")
  ) {
    return "Compare";
  }

  // Explanation queries
  if (
    message.includes("explain") ||
    message.includes("why") ||
    message.includes("tell me about")
  ) {
    return "Explain";
  }

  // Action queries
  if (
    message.includes("create") ||
    message.includes("add") ||
    message.includes("update") ||
    message.includes("delete")
  ) {
    return "Action";
  }

  return null;
}

// Helper function to determine content type (only used as fallback)
function determineContentType(message: string): string | null {
  if (
    message.includes("artist") ||
    message.includes("artwork") ||
    message.includes("painting") ||
    message.includes("sculpture")
  ) {
    return "Art";
  }

  if (
    message.includes("document") ||
    message.includes("paper") ||
    message.includes("text") ||
    message.includes("file")
  ) {
    return "Documents";
  }

  if (
    message.includes("image") ||
    message.includes("photo") ||
    message.includes("picture")
  ) {
    return "Images";
  }

  if (
    message.includes("api") ||
    message.includes("code") ||
    message.includes("programming")
  ) {
    return "Technical";
  }

  return null;
}

// Simple title extraction function
function extractTitleFromMessage(message: string): string {
  // Clean the message
  let title = message.trim();

  // Remove trailing question marks but keep the sentence structure
  title = title.replace(/\?+$/, "");

  // Handle different question patterns to create natural sentences
  if (title.toLowerCase().startsWith("what")) {
    // For "What" questions, keep natural structure
    title = title.replace(/^what\s+(is|are)\s+the\s+/i, "The ");
    title = title.replace(/^what\s+(is|are)\s+/i, "");
    title = title.replace(/^what\s+/i, "");
  } else if (title.toLowerCase().startsWith("how many")) {
    // Convert "How many X do they have" to "How Many X"
    title = title.replace(
      /^how\s+many\s+(.+?)\s+(do|does|did|can|could|should|would|will)\s+.*/i,
      "How Many $1"
    );
    title = title.replace(/^how\s+many\s+/i, "How Many ");
  } else if (title.toLowerCase().startsWith("how much")) {
    title = title.replace(
      /^how\s+much\s+(.+?)\s+(do|does|did|can|could|should|would|will)\s+.*/i,
      "How Much $1"
    );
    title = title.replace(/^how\s+much\s+/i, "How Much ");
  } else if (title.toLowerCase().startsWith("how")) {
    // For other "How" questions, preserve the structure better
    title = title.replace(
      /^how\s+(do|does|did|can|could|should|would|will)\s+/i,
      "How "
    );
    title = title.replace(/^how\s+to\s+/i, "How to ");
    title = title.replace(/^how\s+/i, "How ");
  } else if (title.toLowerCase().startsWith("why")) {
    title = title.replace(
      /^why\s+(do|does|did|is|are|can|could|should|would|will)\s+/i,
      "Why "
    );
    title = title.replace(/^why\s+/i, "Why ");
  } else if (title.toLowerCase().startsWith("when")) {
    title = title.replace(
      /^when\s+(do|does|did|is|are|was|were|can|could|should|would|will)\s+/i,
      "When "
    );
    title = title.replace(/^when\s+/i, "When ");
  } else if (title.toLowerCase().startsWith("where")) {
    title = title.replace(
      /^where\s+(do|does|did|is|are|can|could|should|would|will|can i|could i)\s+/i,
      "Where "
    );
    title = title.replace(/^where\s+/i, "Where ");
  } else if (title.toLowerCase().startsWith("who")) {
    title = title.replace(
      /^who\s+(is|are|was|were|can|could|should|would|will)\s+/i,
      "Who "
    );
    title = title.replace(/^who\s+/i, "Who ");
  } else {
    // For other patterns, clean up but preserve sentence structure
    title = title.replace(
      /^(show me|tell me|can you show me|can you tell me)\s+/i,
      ""
    );
    title = title.replace(/^(find|search|get|give me)\s+/i, "");
    title = title.replace(/^(can you|could you|please)\s+/i, "");
  }

  // Clean up extra spaces
  title = title.replace(/\s+/g, " ").trim();

  // Split into words for processing
  const words = title.split(/\s+/);

  // Only filter out articles and very common words, but keep sentence structure words
  const wordsToFilter = ["the", "a", "an"];
  const filteredWords = words.filter((word) => {
    // Keep most words for natural sentences, only filter out articles
    if (word.length <= 1) return false;
    return !wordsToFilter.includes(word.toLowerCase());
  });

  // Take up to 8 words for complete sentences
  const titleWords = filteredWords.slice(0, 8);

  // Smart capitalization for natural sentences
  const capitalizedWords = titleWords.map((word, index) => {
    // Always capitalize first word
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    // Keep existing capitalization for likely proper nouns
    if (word.charAt(0) === word.charAt(0).toUpperCase() && word.length > 2) {
      return word;
    }

    // Handle common acronyms
    const acronyms = [
      "AI",
      "ML",
      "UI",
      "UX",
      "IT",
      "API",
      "URL",
      "HTTP",
      "CSS",
      "HTML",
      "JS",
      "SQL",
      "JSON",
      "XML",
    ];
    if (acronyms.includes(word.toUpperCase())) {
      return word.toUpperCase();
    }

    // Capitalize important words in titles
    const importantWords = [
      "how",
      "what",
      "why",
      "when",
      "where",
      "who",
      "many",
      "much",
      "work",
      "works",
      "database",
      "collection",
      "collections",
    ];
    if (importantWords.includes(word.toLowerCase())) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    // Keep lowercase for small words but preserve natural sentence flow
    const keepLowercase = [
      "of",
      "to",
      "in",
      "for",
      "with",
      "by",
      "at",
      "on",
      "up",
      "or",
      "as",
      "if",
      "be",
      "do",
      "go",
      "my",
      "me",
      "us",
      "we",
      "he",
      "it",
      "is",
      "was",
      "are",
      "were",
      "have",
      "has",
      "had",
      "and",
      "but",
      "from",
      "that",
      "this",
      "they",
      "them",
      "their",
    ];
    if (keepLowercase.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }

    // Default to title case for main words
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  let result = capitalizedWords.join(" ");

  // Ensure reasonable length but allow for complete sentences
  if (result.length > 60) {
    result = result.substring(0, 57) + "...";
  }

  // Better fallback if result is too short
  if (result.length < 3) {
    // Take first few words and make them into a proper title
    const firstWords = message.split(" ").slice(0, 5);
    result = firstWords
      .map((word, index) => {
        if (index === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ")
      .replace(/\?+$/, "");

    if (result.length > 55) {
      result = result.substring(0, 52) + "...";
    }
  }

  return result || `Chat - ${new Date().toLocaleDateString()}`;
}
