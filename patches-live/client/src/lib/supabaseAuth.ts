const SESSION_KEY = "abu-alazaem-supabase-session";
const AUTH_EVENT = "abu-alazaem-auth-change";

type SupabaseUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SupabaseUser;
};

export type AccountType = "parent" | "teacher" | "admin";

export type AppAuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  accountType: AccountType;
};

function getConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return { url, anonKey };
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function emitAuthChange() {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

function writeSession(payload: any): StoredSession | null {
  const accessToken = payload?.access_token;
  const refreshToken = payload?.refresh_token;
  const expiresIn = Number(payload?.expires_in ?? 3600);
  const user = payload?.user as SupabaseUser | undefined;

  if (!accessToken || !refreshToken || !user?.id) return null;

  const session: StoredSession = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    user,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emitAuthChange();
  return session;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  emitAuthChange();
}

async function authRequest(path: string, init: RequestInit = {}) {
  const { url, anonKey } = getConfig();
  const response = await fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.msg || data?.message || data?.error_description || "Supabase authentication request failed");
  }
  return data;
}

async function restRequest(path: string, accessToken: string) {
  const { url, anonKey } = getConfig();
  const response = await fetch(`${url}/rest/v1${path}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || "Supabase data request failed");
  }
  return response.json();
}

async function refreshSession(session: StoredSession): Promise<StoredSession | null> {
  try {
    const data = await authRequest("/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    return writeSession(data);
  } catch {
    clearSession();
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  let session = readSession();
  if (!session) return null;

  if (session.expiresAt - Date.now() < 60_000) {
    session = await refreshSession(session);
  }
  return session?.accessToken ?? null;
}

export async function signInWithPassword(email: string, password: string) {
  const data = await authRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const session = writeSession(data);
  if (!session) throw new Error("لم يتم إنشاء جلسة تسجيل الدخول.");
  return session;
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  displayName: string;
  accountType: Exclude<AccountType, "admin">;
  childName?: string;
  childAgeBand?: "3-6" | "7-9" | "10-12";
}) {
  const data = await authRequest("/signup", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      data: {
        display_name: input.displayName,
        account_type: input.accountType,
        child_name: input.accountType === "parent" ? input.childName : undefined,
        child_age_band: input.accountType === "parent" ? input.childAgeBand : undefined,
      },
    }),
  });

  const session = writeSession(data);
  return { session, user: data?.user as SupabaseUser | undefined };
}

export async function signOut() {
  const token = await getAccessToken();
  if (token) {
    try {
      await authRequest("/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Local logout should still succeed even if the remote session expired.
    }
  }
  clearSession();
}

export async function getCurrentUser(): Promise<AppAuthUser | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const authUser = (await authRequest("/user", {
      headers: { Authorization: `Bearer ${token}` },
    })) as SupabaseUser;

    const profiles = await restRequest(
      `/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=id,display_name,account_type&limit=1`,
      token,
    );
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    const metadata = authUser.user_metadata ?? {};

    return {
      id: authUser.id,
      email: authUser.email ?? null,
      name: profile?.display_name ?? (metadata.display_name as string | undefined) ?? null,
      accountType: (profile?.account_type ?? metadata.account_type ?? "parent") as AccountType,
    };
  } catch {
    clearSession();
    return null;
  }
}

export function onAuthChange(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_KEY) callback();
  };
  const onCustom = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(AUTH_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUTH_EVENT, onCustom);
  };
}
