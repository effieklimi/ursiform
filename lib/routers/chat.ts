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
