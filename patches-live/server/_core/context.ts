import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { authenticateSupabaseRequest, type AppUser } from "../supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AppUser | null;
  accessToken: string | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  try {
    const session = await authenticateSupabaseRequest(opts.req);
    return { req: opts.req, res: opts.res, user: session.user, accessToken: session.accessToken };
  } catch {
    return { req: opts.req, res: opts.res, user: null, accessToken: null };
  }
}
