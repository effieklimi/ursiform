import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { DatabaseService } from "../db";

export const messageRouter = createTRPCRouter({
  // Get messages for a chat
  getByChatId: publicProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ input }) => {
      return await DatabaseService.getMessages(input.chatId);
    }),

  // Add a new message
  add: publicProcedure
    .input(
      z.object({
        chatId: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await DatabaseService.addMessage(
        input.chatId,
        input.role,
        input.content
      );
    }),

  // Delete a message
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await DatabaseService.deleteMessage(input.id);
      return { success: true };
    }),

  // Get message count
  getCount: publicProcedure.query(async () => {
    return await DatabaseService.getMessageCount();
  }),
});
