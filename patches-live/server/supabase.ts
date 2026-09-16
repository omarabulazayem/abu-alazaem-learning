import type { Request } from "express";

export type AccountType = "parent" | "teacher" | "admin";

export type AppUser = {
  id: string;
  email: string | null;
  name: string | null;
  accountType: AccountType;
};

export type SupabaseSession = {
  user: AppUser;
  accessToken: string;
};

type AuthUserPayload = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function getSupabaseUrl() {
  const value = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!value) throw new Error("Supabase URL is missing");
  return value.replace(/\/+$/, "");
}

function getPublishableKey() {
  const value =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!value) throw new Error("Supabase publishable key is missing");
  return value;
}

function bearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function authenticateSupabaseRequest(req: Request): Promise<SupabaseSession> {
  const accessToken = bearerToken(req);
  if (!accessToken) throw new Error("Missing bearer token");

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: getPublishableKey(),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const authUser = (await parseJson(response)) as AuthUserPayload | null;
  if (!response.ok || !authUser?.id) throw new Error("Invalid Supabase session");

  const rows = await userRest<Array<{ id: string; display_name: string; account_type: AccountType }>>(
    accessToken,
    `/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=id,display_name,account_type&limit=1`,
  );
  const profile = rows[0];
  const metadata = authUser.user_metadata ?? {};
  const rawType = profile?.account_type ?? metadata.account_type;
  const accountType: AccountType = rawType === "teacher" || rawType === "admin" ? rawType : "parent";

  return {
    accessToken,
    user: {
      id: authUser.id,
      email: authUser.email ?? null,
      name: profile?.display_name ?? (typeof metadata.display_name === "string" ? metadata.display_name : null),
      accountType,
    },
  };
}

export async function userRest<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getSupabaseUrl()}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: getPublishableKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const data = await parseJson(response);
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: unknown }).message)
        : String(data ?? "Supabase request failed");
    throw new Error(message);
  }
  return data as T;
}

export function isSupabaseConfigured() {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
      (process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY),
  );
}
