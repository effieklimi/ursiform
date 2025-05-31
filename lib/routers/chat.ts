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
    .input(z.object({ title: z.string().optional() }))
    .mutation(async ({ input }) => {
      return await DatabaseService.createChat(input.title);
    }),

  // Update chat title
  updateTitle: publicProcedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ input }) => {
      return await DatabaseService.updateChat(input.id, input.title);
    }),

  // Generate and update chat title automatically
  generateTitle: publicProcedure
    .input(
      z.object({
        chatId: z.string(),
        userMessage: z.string(),
        assistantMessage: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Generate a concise title based on the conversation
        const title = await generateChatTitle(
          input.userMessage,
          input.assistantMessage
        );

        // Update the chat with the generated title
        const updatedChat = await DatabaseService.updateChat(
          input.chatId,
          title
        );

        return updatedChat;
      } catch (error) {
        console.error("Error generating chat title:", error);
        // Fallback to a simple title if generation fails
        const fallbackTitle = `Chat - ${new Date().toLocaleDateString()}`;
        return await DatabaseService.updateChat(input.chatId, fallbackTitle);
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

// Simple title extraction function
function extractTitleFromMessage(message: string): string {
  // Clean the message
  let title = message.trim();

  // Handle different question patterns more intelligently
  if (title.toLowerCase().startsWith("what")) {
    // For "What" questions, try to preserve some structure
    title = title.replace(
      /^what\s+(is|are|do|does|did|can|could|should|would|will)\s*/i,
      ""
    );
    title = title.replace(/^what\s+/i, "");
  } else if (title.toLowerCase().startsWith("how")) {
    // For "How" questions, preserve the "how" context
    title = title.replace(
      /^how\s+(do|does|did|can|could|should|would|will|to)\s*/i,
      "How to "
    );
    title = title.replace(/^how\s+many\s*/i, "Count of ");
    title = title.replace(/^how\s+much\s*/i, "Amount of ");
    title = title.replace(/^how\s+/i, "How to ");
  } else if (title.toLowerCase().startsWith("why")) {
    title = title.replace(
      /^why\s+(do|does|did|is|are|can|could|should|would|will)\s*/i,
      "Why "
    );
    title = title.replace(/^why\s+/i, "Why ");
  } else if (title.toLowerCase().startsWith("when")) {
    title = title.replace(
      /^when\s+(do|does|did|is|are|can|could|should|would|will)\s*/i,
      "When "
    );
    title = title.replace(/^when\s+/i, "When ");
  } else if (title.toLowerCase().startsWith("where")) {
    title = title.replace(
      /^where\s+(do|does|did|is|are|can|could|should|would|will)\s*/i,
      "Where "
    );
    title = title.replace(/^where\s+/i, "Where ");
  } else if (title.toLowerCase().startsWith("who")) {
    title = title.replace(
      /^who\s+(is|are|was|were|can|could|should|would|will)\s*/i,
      "Who "
    );
    title = title.replace(/^who\s+/i, "Who ");
  } else {
    // For other patterns, remove common starters but preserve some structure
    title = title.replace(
      /^(show me|tell me|find|search|get|give me|can you|could you|please)\s+/i,
      ""
    );
  }

  // Remove trailing question marks
  title = title.replace(/\?+$/, "");

  // Clean up extra spaces
  title = title.replace(/\s+/g, " ").trim();

  // Split into words
  const words = title.split(/\s+/);

  // Keep more connecting words for better flow, but filter out very common ones
  const wordsToFilter = ["the", "and", "of", "to", "in", "for", "with", "by"];
  const filteredWords = words.filter((word) => {
    if (
      word.length <= 2 &&
      !["AI", "ML", "UI", "UX", "IT"].includes(word.toUpperCase())
    ) {
      return false;
    }
    return !wordsToFilter.includes(word.toLowerCase());
  });

  // Take up to 6-7 words for better readability (increased from 5)
  const titleWords = filteredWords.slice(0, 7);

  // Smart capitalization - preserve proper nouns and important words
  const capitalizedWords = titleWords.map((word, index) => {
    // Always capitalize first word
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    // Keep existing capitalization for likely proper nouns and acronyms
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
    ];
    if (acronyms.includes(word.toUpperCase())) {
      return word.toUpperCase();
    }

    // Capitalize important words
    const importantWords = [
      "how",
      "what",
      "why",
      "when",
      "where",
      "who",
      "count",
      "amount",
    ];
    if (importantWords.includes(word.toLowerCase())) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    // Keep lowercase for small connecting words that we didn't filter
    const keepLowercase = [
      "a",
      "an",
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
    ];
    if (keepLowercase.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }

    // Default to title case
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  let result = capitalizedWords.join(" ");

  // Increase length limit for better readability
  if (result.length > 50) {
    result = result.substring(0, 47) + "...";
  }

  // Better fallback if result is too short or empty
  if (result.length < 3) {
    // Take first few words without heavy filtering
    const firstWords = message.split(" ").slice(0, 4);
    result = firstWords
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    if (result.length > 45) {
      result = result.substring(0, 42) + "...";
    }
  }

  return result || `Chat - ${new Date().toLocaleDateString()}`;
}
