import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { authenticateSupabaseRequest, type AppUser } from "../supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AppUser | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: AppUser | null = null;
  try {
    user = await authenticateSupabaseRequest(opts.req);
  } catch {
    user = null;
  }

  return { req: opts.req, res: opts.res, user };
}
