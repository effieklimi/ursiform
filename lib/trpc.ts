import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { prisma } from "./prisma";

/**
 * Create context for tRPC requests
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

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
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
