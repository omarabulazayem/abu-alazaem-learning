const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SESSION_KEY = "abu-alazaem-netlify-session";
const ACTIVE_CHILD_KEY = "abu-alazaem-active-child";

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("إعدادات Supabase غير موجودة في Netlify.");
}

async function json(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function errorMessage(data, fallback) {
  if (data && typeof data === "object") return data.message || data.msg || data.error_description || data.error || fallback;
  return typeof data === "string" && data ? data : fallback;
}

export function getStoredSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

function saveSession(payload) {
  const accessToken = payload?.access_token;
  const refreshToken = payload?.refresh_token;
  const user = payload?.user;
  if (!accessToken || !refreshToken || !user?.id) return null;
  const session = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + Number(payload?.expires_in || 3600) * 1000,
    user,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("abu-auth"));
  return session;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("abu-auth"));
}

async function authRequest(path, init = {}) {
  assertConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await json(response);
  if (!response.ok) throw new Error(errorMessage(data, "تعذر تنفيذ طلب تسجيل الدخول."));
  return data;
}

async function userFromAccessToken(token) {
  assertConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  const data = await json(response);
  if (!response.ok || !data?.id) throw new Error(errorMessage(data, "تعذر التحقق من جلسة الحساب."));
  return data;
}

async function consumeAuthRedirect() {
  if (typeof location === "undefined" || !location.hash || !location.hash.includes("access_token=")) return null;
  const params = new URLSearchParams(location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  const user = await userFromAccessToken(accessToken);
  const session = saveSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number(params.get("expires_in") || 3600),
    user,
  });
  history.replaceState({}, "", `${location.pathname}${location.search}`);
  return { session, type: params.get("type") || "auth" };
}

async function refreshSession(session) {
  try {
    const data = await authRequest("/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    return saveSession(data);
  } catch {
    clearSession();
    return null;
  }
}

export async function accessToken() {
  let session = getStoredSession();
  if (!session) return null;
  if (session.expiresAt - Date.now() < 60_000) session = await refreshSession(session);
  return session?.accessToken || null;
}

export async function signIn(email, password) {
  const data = await authRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!saveSession(data)) throw new Error("لم يتم إنشاء جلسة تسجيل الدخول.");
  return getCurrentUser();
}

export async function signUp({ email, password, displayName, accountType, childName, childAgeBand }) {
  const redirectTo = typeof location !== "undefined" ? `${location.origin}/login` : undefined;
  const path = redirectTo ? `/signup?redirect_to=${encodeURIComponent(redirectTo)}` : "/signup";
  const data = await authRequest(path, {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      data: {
        display_name: displayName,
        account_type: accountType === "teacher" ? "teacher" : "parent",
        child_name: accountType === "parent" ? childName || undefined : undefined,
        child_age_band: accountType === "parent" ? childAgeBand || "7-9" : undefined,
      },
    }),
  });
  if (data?.access_token) saveSession(data);
  return { sessionCreated: Boolean(data?.access_token), user: data?.user || null };
}

export async function requestPasswordReset(email) {
  const redirectTo = typeof location !== "undefined" ? `${location.origin}/login` : undefined;
  const path = redirectTo ? `/recover?redirect_to=${encodeURIComponent(redirectTo)}` : "/recover";
  return authRequest(path, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function updatePassword(password) {
  const token = await accessToken();
  if (!token) throw new Error("رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته.");
  return authRequest("/user", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
}

export async function signOut() {
  const token = await accessToken();
  if (token) {
    await authRequest("/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }
  clearSession();
}

export async function rest(path, init = {}) {
  assertConfig();
  const token = await accessToken();
  if (!token) throw new Error("يلزم تسجيل الدخول أولًا.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await json(response);
  if (!response.ok) throw new Error(errorMessage(data, "تعذر قراءة البيانات من Supabase."));
  return data;
}

export async function rpc(name, body) {
  return rest(`/rpc/${name}`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(body) });
}

export async function getCurrentUser() {
  if (!getStoredSession()) await consumeAuthRedirect().catch(() => null);
  const token = await accessToken();
  if (!token) return null;
  let authUser;
  try { authUser = await userFromAccessToken(token); }
  catch { clearSession(); return null; }
  const profiles = await rest(`/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=id,display_name,account_type&limit=1`);
  const profile = profiles?.[0];
  if (!profile || !["parent", "teacher", "admin"].includes(profile.account_type)) {
    clearSession();
    throw new Error("ملف الحساب غير مكتمل. أعد تسجيل الدخول أو تواصل مع الإدارة.");
  }
  return {
    id: authUser.id,
    email: authUser.email || null,
    name: profile.display_name || authUser?.user_metadata?.display_name || null,
    accountType: profile.account_type,
  };
}

export function getActiveChildId() { return localStorage.getItem(ACTIVE_CHILD_KEY); }
export function setActiveChildId(id) {
  if (id) localStorage.setItem(ACTIVE_CHILD_KEY, id); else localStorage.removeItem(ACTIVE_CHILD_KEY);
  window.dispatchEvent(new Event("abu-child"));
}

export async function listChildren(user) {
  if (!user) return [];
  if (user.accountType === "teacher") return [];
  return rest(`/child_profiles?parent_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=*&order=created_at.asc`);
}

export async function createChild(user, input) {
  const rows = await rest("/child_profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: user.id, display_name: input.displayName, age_band: input.ageBand, avatar: input.avatar || "🧒🏻" }),
  });
  return rows?.[0];
}

export async function joinChildToClass(childId, joinCode) {
  return rpc("link_child_to_class", { p_child_id: childId, p_join_code: joinCode.trim().toUpperCase() });
}

export async function getProgress(childId) {
  if (!childId) return [];
  return rest(`/learning_progress?child_id=eq.${encodeURIComponent(childId)}&select=*&order=surah_number.asc`);
}

export async function saveProgress(row) {
  const rows = await rest("/learning_progress?on_conflict=child_id,surah_number", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ ...row, last_activity_at: new Date().toISOString() }),
  });
  return rows?.[0];
}

export function dayKey(prefix, detail) {
  const date = new Date().toISOString().slice(0, 10);
  return detail == null ? `${prefix}:${date}` : `${prefix}:${detail}:${date}`;
}

export async function claimReward(childId, event, sourceKey) {
  return rpc("claim_learning_reward", { p_child_id: childId, p_event: event, p_source_key: sourceKey });
}

export async function listAchievements(childId) {
  if (!childId) return [];
  return rest(`/achievements?child_id=eq.${encodeURIComponent(childId)}&select=*&order=unlocked_at.asc`);
}

export async function listRewardsToday(childId) {
  if (!childId) return [];
  const start = new Date(); start.setUTCHours(0,0,0,0);
  return rest(`/reward_ledger?child_id=eq.${encodeURIComponent(childId)}&created_at=gte.${encodeURIComponent(start.toISOString())}&select=source_type,source_key,points,stars,created_at&order=created_at.asc`);
}

export async function recordReview(user, childId, surahNumber, score, notes = "") {
  const rows = await rest("/review_events", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ child_id: childId, surah_number: surahNumber, score, notes: notes || null, reviewed_at: new Date().toISOString(), created_by: user.id }),
  });
  const existing = await rest(`/learning_progress?child_id=eq.${encodeURIComponent(childId)}&surah_number=eq.${surahNumber}&select=*&limit=1`);
  if (existing?.[0]) {
    const memorized = Number(existing[0].memorized_percent || 0);
    await rest(`/learning_progress?child_id=eq.${encodeURIComponent(childId)}&surah_number=eq.${surahNumber}`, {
      method: "PATCH",
      body: JSON.stringify({ review_percent: score, status: memorized >= 100 && score >= 85 ? "mastered" : "review", last_activity_at: new Date().toISOString() }),
    });
  }
  return rows?.[0];
}

export async function teacherClasses(userId) {
  return rest(`/classes?teacher_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`);
}

export async function createTeacherClass(userId, name) {
  const joinCode = Math.random().toString(36).slice(2, 10).toUpperCase();
  const rows = await rest("/classes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ teacher_id: userId, name, join_code: joinCode }),
  });
  return rows?.[0];
}

export async function teacherOverview(userId) {
  const classes = await teacherClasses(userId);
  const classIds = classes.map(x => x.id);
  if (!classIds.length) return { classes, students: [], sessionsToday: 0 };
  const classFilter = classIds.map(id => `class_id.eq.${id}`).join(",");
  const links = await rest(`/class_students?or=(${classFilter})&select=class_id,child_id`);
  const childIds = [...new Set(links.map(x => x.child_id))];
  if (!childIds.length) return { classes, students: [], sessionsToday: 0 };
  const childFilter = childIds.map(id => `id.eq.${id}`).join(",");
  const children = await rest(`/child_profiles?or=(${childFilter})&is_active=eq.true&select=*&order=display_name.asc`);
  const progressFilter = childIds.map(id => `child_id.eq.${id}`).join(",");
  const progress = await rest(`/learning_progress?or=(${progressFilter})&select=child_id,memorized_percent,review_percent,status,last_activity_at`);
  const today = new Date(); today.setHours(0,0,0,0);
  const reviews = await rest(`/review_events?or=(${progressFilter})&reviewed_at=gte.${encodeURIComponent(today.toISOString())}&select=child_id,reviewed_at`);
  const classNames = new Map(classes.map(c => [c.id, c.name]));
  return {
    classes,
    sessionsToday: reviews.length,
    students: children.map(child => {
      const rows = progress.filter(p => p.child_id === child.id);
      const avg = key => rows.length ? Math.round(rows.reduce((sum,r) => sum + Number(r[key] || 0), 0) / rows.length) : 0;
      const names = links.filter(l => l.child_id === child.id).map(l => classNames.get(l.class_id)).filter(Boolean);
      const last = rows.map(r => r.last_activity_at).filter(Boolean).sort().at(-1) || null;
      return { ...child, classes: names, memorizedAverage: avg("memorized_percent"), reviewAverage: avg("review_percent"), masteredCount: rows.filter(r => r.status === "mastered").length, surahCount: rows.length, lastActivityAt: last };
    }),
  };
}
