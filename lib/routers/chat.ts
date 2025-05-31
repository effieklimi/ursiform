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

  // Add collection tag if specific collection was selected
  if (selectedCollection) {
    tags.push(selectedCollection);
  }

  // Determine query type based on user message
  const message = userMessage.toLowerCase();

  // Check for different types of queries/actions
  if (
    message.includes("show") ||
    message.includes("find") ||
    message.includes("search") ||
    message.includes("get") ||
    message.includes("list")
  ) {
    tags.push("Query");
  } else if (
    message.includes("how many") ||
    message.includes("count") ||
    message.includes("how much")
  ) {
    tags.push("Count");
  } else if (
    message.includes("what") ||
    message.includes("who") ||
    message.includes("when") ||
    message.includes("where")
  ) {
    tags.push("Question");
  } else if (
    message.includes("why") ||
    message.includes("explain") ||
    message.includes("tell me about")
  ) {
    tags.push("Explanation");
  } else if (
    message.includes("how") &&
    (message.includes("work") || message.includes("do"))
  ) {
    tags.push("How-to");
  } else if (
    message.includes("compare") ||
    message.includes("difference") ||
    message.includes("versus") ||
    message.includes("vs")
  ) {
    tags.push("Comparison");
  } else if (
    message.includes("create") ||
    message.includes("add") ||
    message.includes("insert") ||
    message.includes("update") ||
    message.includes("delete") ||
    message.includes("modify")
  ) {
    tags.push("Action");
  } else {
    tags.push("General");
  }

  // Add content-specific tags based on keywords
  if (
    message.includes("artist") ||
    message.includes("artwork") ||
    message.includes("painting") ||
    message.includes("sculpture")
  ) {
    tags.push("Art");
  } else if (
    message.includes("document") ||
    message.includes("paper") ||
    message.includes("text") ||
    message.includes("file")
  ) {
    tags.push("Documents");
  } else if (
    message.includes("data") ||
    message.includes("database") ||
    message.includes("collection")
  ) {
    tags.push("Data");
  } else if (
    message.includes("algorithm") ||
    message.includes("machine learning") ||
    message.includes("ai") ||
    message.includes("neural")
  ) {
    tags.push("AI/ML");
  } else if (
    message.includes("api") ||
    message.includes("code") ||
    message.includes("programming") ||
    message.includes("development")
  ) {
    tags.push("Technical");
  }

  // Limit to 2 tags maximum, prioritize most specific ones
  return tags.slice(0, 2);
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
