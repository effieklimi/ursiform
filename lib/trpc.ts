import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { prisma } from "./prisma";

/**
 * Create context for tRPC requests (Pages API)
 * This is where you can add authentication, user info, etc.
 */
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  return {
    req,
    res,
    prisma,
  };
};

/**
 * Create context for tRPC requests (App Directory)
 */
export const createTRPCContextApp = async (req: Request) => {
  return {
    req,
    prisma,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
export type ContextApp = Awaited<ReturnType<typeof createTRPCContextApp>>;

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context | ContextApp>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
