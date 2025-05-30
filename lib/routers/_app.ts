import { createTRPCRouter } from "../trpc";
import { chatRouter } from "./chat";
import { messageRouter } from "./message";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/trpc should be manually added here.
 */
export const appRouter = createTRPCRouter({
  chat: chatRouter,
  message: messageRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
