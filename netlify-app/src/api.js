const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SESSION_KEY = "abu-alazaem-netlify-session";
const ACTIVE_CHILD_KEY = "abu-alazaem-active-child";

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("إعدادات Supabase غير موجودة في نسخة الموقع الحالية.");
}

function appUrl(path = "/") {
  if (typeof location === "undefined") return undefined;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  const relative = String(path || "/").replace(/^\/+/, "");
  return new URL(`${base}${relative}`, location.origin).toString();
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
  localStorage.removeItem(ACTIVE_CHILD_KEY);
  window.dispatchEvent(new Event("abu-auth"));
  window.dispatchEvent(new Event("abu-child"));
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
  const type = params.get("type") || "auth";
  history.replaceState({}, "", `${location.pathname}${location.search}`);
  return { session, type };
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

export async function signUp({ email, password, displayName, accountType, childName, childAgeBand, childAgeYears, childGender }) {
  const redirectTo = appUrl("/login");
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
        child_age_years: accountType === "parent" && Number.isInteger(Number(childAgeYears)) ? Number(childAgeYears) : undefined,
        child_gender: accountType === "parent" ? childGender || "unspecified" : undefined,
      },
    }),
  });
  if (data?.access_token) saveSession(data);
  return { sessionCreated: Boolean(data?.access_token), user: data?.user || null };
}

export async function requestPasswordReset(email) {
  const redirectTo = appUrl("/login");
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
  let redirectInfo = null;
  if (!getStoredSession()) redirectInfo = await consumeAuthRedirect().catch(() => null);
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
  const result = {
    id: authUser.id,
    email: authUser.email || null,
    name: profile.display_name || authUser?.user_metadata?.display_name || null,
    accountType: profile.account_type,
  };
  if (redirectInfo && redirectInfo.type !== "recovery" && typeof location !== "undefined" && location.pathname === "/login") {
    const target = result.accountType === "teacher" ? "/teacher" : result.accountType === "admin" ? "/admin" : "/family";
    history.replaceState({}, "", target);
    queueMicrotask(() => window.dispatchEvent(new PopStateEvent("popstate")));
  }
  return result;
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

function childProfilePayload(input) {
  const payload = {
    display_name: String(input.displayName || "").trim(),
    age_band: input.ageBand || "7-9",
    avatar: input.avatar || "🧒🏻",
    gender: ["male", "female", "unspecified"].includes(input.gender) ? input.gender : "unspecified",
  };
  const ageYears = Number(input.ageYears);
  if (Number.isInteger(ageYears) && ageYears >= 3 && ageYears <= 18) payload.age_years = ageYears;
  if (input.customization && typeof input.customization === "object") payload.customization = input.customization;
  return payload;
}

export async function createChild(user, input) {
  const rows = await rest("/child_profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: user.id, ...childProfilePayload(input) }),
  });
  return rows?.[0];
}

export async function updateChild(childId, input) {
  const rows = await rest(`/child_profiles?id=eq.${encodeURIComponent(childId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(childProfilePayload(input)),
  });
  return rows?.[0];
}

export async function joinChildToClass(childId, joinCode) {
  return rpc("link_child_to_class", { p_child_id: childId, p_join_code: joinCode.trim().toUpperCase() });
}

// V7 identity / enrollment APIs. Legacy class APIs remain below for transition only.
export async function getTeacherWorkspace(userId) {
  if (!userId) return null;
  const rows = await rest(`/teacher_workspaces?owner_teacher_user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  return rows?.[0] || null;
}

export async function getTeacherSettings(workspaceId) {
  if (!workspaceId) return null;
  const rows = await rest(`/teacher_settings?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*&limit=1`);
  return rows?.[0] || null;
}

export async function createEnrollmentInvite(parentEmail, sessionRate = 0) {
  const result = await rpc("create_enrollment_invite", {
    p_parent_email: String(parentEmail || "").trim().toLowerCase(),
    p_session_rate: Math.max(0, Number(sessionRate) || 0),
    p_expires_hours: 168,
  });
  return Array.isArray(result) ? result[0] : result;
}

export function enrollmentInviteUrl(token) {
  return appUrl(`/family?invite=${encodeURIComponent(token || "")}`);
}

export async function listTeacherInvites(userId) {
  if (!userId) return [];
  return rest(`/enrollment_invites?invited_by=eq.${encodeURIComponent(userId)}&select=id,workspace_id,invited_email,session_rate,status,expires_at,accepted_at,created_at&order=created_at.desc&limit=50`);
}

export async function listTeacherEnrollments(userId) {
  if (!userId) return [];
  const rows = await rest(`/enrollments?teacher_user_id=eq.${encodeURIComponent(userId)}&status=neq.ended&select=*&order=accepted_at.desc.nullslast,created_at.desc`);
  if (!rows?.length) return [];
  const childIds = [...new Set(rows.map(r => r.student_id).filter(Boolean))];
  if (!childIds.length) return rows.map(r => ({ ...r, child: null }));
  const childFilter = childIds.map(id => `id.eq.${id}`).join(",");
  const children = await rest(`/child_profiles?or=(${childFilter})&is_active=eq.true&select=*`);
  const childMap = new Map((children || []).map(child => [child.id, child]));
  return rows.map(row => ({ ...row, child: childMap.get(row.student_id) || null }));
}

export async function listParentEnrollments() {
  const rows = await rest("/enrollments?status=neq.ended&select=*&order=accepted_at.desc.nullslast,created_at.desc");
  if (!rows?.length) return [];
  const workspaceIds = [...new Set(rows.map(r => r.workspace_id).filter(Boolean))];
  let workspaces = [];
  if (workspaceIds.length) {
    const filter = workspaceIds.map(id => `id.eq.${id}`).join(",");
    workspaces = await rest(`/teacher_workspaces?or=(${filter})&select=id,display_name,timezone,status`);
  }
  const workspaceMap = new Map((workspaces || []).map(w => [w.id, w]));
  return rows.map(row => ({ ...row, workspace: workspaceMap.get(row.workspace_id) || null }));
}

export async function acceptEnrollmentInvite(token, childId) {
  const result = await rpc("accept_enrollment_invite", {
    p_invite_token: String(token || "").trim(),
    p_child_id: childId,
  });
  return Array.isArray(result) ? result[0] : result;
}

export async function setChildModePin(pin) {
  return rpc("set_child_mode_pin", { p_pin: String(pin || "").trim() });
}

export async function verifyChildModePin(pin) {
  const result = await rpc("verify_child_mode_pin", { p_pin: String(pin || "").trim() });
  return Array.isArray(result) ? Boolean(result[0]) : Boolean(result);
}

export async function hasChildModePin() {
  const result = await rpc("has_child_mode_pin", {});
  return Array.isArray(result) ? Boolean(result[0]) : Boolean(result);
}

export async function getStudentWallet(childId) {
  if (!childId) return { wallet_balance: 0, lifetime_points: 0 };
  const rows = await rest(`/student_wallets?student_id=eq.${encodeURIComponent(childId)}&select=student_id,wallet_balance,lifetime_points,updated_at&limit=1`);
  return rows?.[0] || { student_id: childId, wallet_balance: 0, lifetime_points: 0 };
}

export async function listStudentWallets() {
  return rest("/student_wallets?select=student_id,wallet_balance,lifetime_points,updated_at");
}

export async function listGameStoreItems() {
  return rest("/game_store_items?active=eq.true&select=game_id,wallet_price,active&order=wallet_price.asc");
}

export async function listGameUnlocks(childId) {
  if (!childId) return [];
  return rest(`/game_unlocks?student_id=eq.${encodeURIComponent(childId)}&select=id,student_id,game_id,unlocked_at,price_paid,ledger_transaction_id&order=unlocked_at.desc`);
}

export async function purchaseGameUnlock(childId, gameId) {
  return rpc("purchase_game_unlock", { p_child_id: childId, p_game_id: gameId });
}

export async function listPointLedger(childId, limit = 50) {
  if (!childId) return [];
  return rest(`/point_ledger?student_id=eq.${encodeURIComponent(childId)}&select=*&order=created_at.desc&limit=${Math.min(100,Math.max(1,Number(limit)||50))}`);
}

async function hydrateTaskAssignments(assignments = []) {
  if (!assignments.length) return [];
  const taskIds=[...new Set(assignments.map(a=>a.task_id).filter(Boolean))];
  const assignmentIds=[...new Set(assignments.map(a=>a.id).filter(Boolean))];
  const [tasks,submissions]=await Promise.all([
    taskIds.length?rest(`/tasks?or=(${taskIds.map(id=>`id.eq.${id}`).join(",")})&select=*`):[],
    assignmentIds.length?rest(`/task_submissions?or=(${assignmentIds.map(id=>`assignment_id.eq.${id}`).join(",")})&select=*&order=submitted_at.desc`):[],
  ]);
  const taskMap=new Map((tasks||[]).map(t=>[t.id,t]));
  const latestSubmission=new Map();
  for(const s of submissions||[])if(!latestSubmission.has(s.assignment_id))latestSubmission.set(s.assignment_id,s);
  return assignments.map(a=>({...a,task:taskMap.get(a.task_id)||null,latestSubmission:latestSubmission.get(a.id)||null}));
}

export async function listChildTaskAssignments(childId) {
  if(!childId)return [];
  const rows=await rest(`/task_assignments?student_id=eq.${encodeURIComponent(childId)}&select=*&order=due_at.asc`);
  return hydrateTaskAssignments(rows||[]);
}

export async function listTeacherTaskAssignments() {
  const rows=await rest("/task_assignments?select=*&order=updated_at.desc");
  return hydrateTaskAssignments(rows||[]);
}

export async function createTaskAssignment({enrollmentId,title,type,points,dueAt,teacherNote=""}) {
  return rpc("create_task_assignment",{
    p_enrollment_id:enrollmentId,
    p_title:String(title||"").trim(),
    p_task_type:type,
    p_points_reward:Math.max(0,Number(points)||0),
    p_due_at:new Date(dueAt).toISOString(),
    p_teacher_note:String(teacherNote||"").trim()||null,
  });
}

export async function submitTaskAssignment(assignmentId,parentNote="") {
  return rpc("submit_task_assignment",{p_assignment_id:assignmentId,p_parent_note:String(parentNote||"").trim()||null});
}

export async function reviewTaskAssignment(assignmentId,approve,note="") {
  return rpc("review_task_assignment",{p_assignment_id:assignmentId,p_approve:Boolean(approve),p_note:String(note||"").trim()||null});
}

export async function listRecurringScheduleRules() {
  return rest("/recurring_schedule_rules?select=*&order=weekday.asc,local_start_time.asc");
}

export async function listVisibleSessions({from=null,to=null,status=null}={}) {
  const parts=["select=*","order=scheduled_start_utc.asc"];
  if(from)parts.push("scheduled_start_utc=gte."+encodeURIComponent(new Date(from).toISOString()));
  if(to)parts.push("scheduled_start_utc=lte."+encodeURIComponent(new Date(to).toISOString()));
  if(status)parts.push("status=eq."+encodeURIComponent(status));
  return rest("/sessions?"+parts.join("&"));
}

export async function listSessionBillingEntries() {
  return rest("/session_billing_entries?select=*&order=created_at.desc");
}

export async function createRecurringScheduleRule({enrollmentId,weekday,startTime,durationMinutes=45,weeksAhead=12}) {
  const normalized=String(startTime||"").trim();
  if(!normalized)throw new Error("اختر وقت الحصة.");
  return rpc("create_recurring_schedule_rule",{
    p_enrollment_id:enrollmentId,
    p_weekday:Number(weekday),
    p_local_start_time:normalized.length===5?normalized+":00":normalized,
    p_duration_minutes:Number(durationMinutes)||45,
    p_weeks_ahead:Number(weeksAhead)||12,
  });
}

export async function setRecurringScheduleRuleActive(ruleId,active) {
  return rpc("set_recurring_schedule_rule_active",{p_rule_id:ruleId,p_active:Boolean(active)});
}

export async function materializeScheduleRule(ruleId,weeksAhead=12) {
  return rpc("materialize_schedule_rule",{p_rule_id:ruleId,p_weeks_ahead:Number(weeksAhead)||12});
}

export async function finalizeSession(sessionId,status,teacherNote="") {
  return rpc("finalize_session",{
    p_session_id:sessionId,
    p_status:status,
    p_teacher_note:String(teacherNote||"").trim()||null,
  });
}

export async function cancelSession(sessionId,reason="") {
  return rpc("cancel_session",{p_session_id:sessionId,p_reason:String(reason||"").trim()||null});
}

export async function rescheduleSession(sessionId,newStart,teacherNote="") {
  const date=new Date(newStart);
  if(Number.isNaN(date.getTime()))throw new Error("اختر موعدًا جديدًا صحيحًا.");
  return rpc("reschedule_session",{
    p_session_id:sessionId,
    p_new_start_utc:date.toISOString(),
    p_teacher_note:String(teacherNote||"").trim()||null,
  });
}

export async function rescheduleSessionLocal(sessionId,localDate,localStartTime,teacherNote="") {
  const date=String(localDate||"").trim();
  const time=String(localStartTime||"").trim();
  if(!date||!time)throw new Error("اختر التاريخ والوقت الجديدين.");
  return rpc("reschedule_session_local",{
    p_session_id:sessionId,
    p_local_date:date,
    p_local_start_time:time.length===5?time+":00":time,
    p_teacher_note:String(teacherNote||"").trim()||null,
  });
}

export async function waiveSessionCharge(entryId,reason) {
  return rpc("waive_session_charge",{p_billing_entry_id:entryId,p_reason:String(reason||"").trim()});
}

export async function markSessionChargePaid(entryId) {
  return rpc("mark_session_charge_paid",{p_billing_entry_id:entryId});
}

export async function getWorkspaceLeaderboard(workspaceId) {
  if(!workspaceId)return null;
  return rpc("get_workspace_leaderboard",{p_workspace_id:workspaceId});
}

export async function updateLeaderboardSettings(workspaceId,{privacy,firstReward,secondReward,thirdReward}) {
  const rows=await rest("/teacher_settings?workspace_id=eq."+encodeURIComponent(workspaceId),{
    method:"PATCH",
    headers:{Prefer:"return=representation"},
    body:JSON.stringify({
      leaderboard_privacy:privacy,
      first_place_reward:Math.max(0,Number(firstReward)||0),
      second_place_reward:Math.max(0,Number(secondReward)||0),
      third_place_reward:Math.max(0,Number(thirdReward)||0),
    }),
  });
  return rows?.[0]||null;
}

export async function listNotifications(limit=100) {
  const userId=getStoredSession()?.user?.id;
  if(!userId)return [];
  return rest("/notifications?recipient_user_id=eq."+encodeURIComponent(userId)+"&select=*&order=created_at.desc&limit="+Math.min(200,Math.max(1,Number(limit)||100)));
}

export async function markNotificationRead(notificationId) {
  return rpc("mark_notification_read",{p_notification_id:notificationId});
}

export async function markAllNotificationsRead() {
  return rpc("mark_all_notifications_read",{});
}

export async function adminTeacherOverview() {
  return rpc("admin_teacher_overview",{});
}

export async function adminSetTeacherWorkspaceStatus(workspaceId,status,reason) {
  return rpc("admin_set_teacher_workspace_status",{
    p_workspace_id:workspaceId,
    p_status:status,
    p_reason:String(reason||"").trim(),
  });
}

export async function listAuditLogs(limit=100) {
  return rest("/audit_logs?select=*&order=created_at.desc&limit="+Math.min(300,Math.max(1,Number(limit)||100)));
}

export async function listNotificationDeliveries(limit=100) {
  return rest("/notification_deliveries?select=*&order=created_at.desc&limit="+Math.min(300,Math.max(1,Number(limit)||100)));
}

export async function teacherEnrollmentOverview(userId) {
  const [workspace,enrollments,invites] = await Promise.all([
    getTeacherWorkspace(userId),listTeacherEnrollments(userId),listTeacherInvites(userId)
  ]);
  const settings = workspace ? await getTeacherSettings(workspace.id).catch(()=>null) : null;
  const childIds = [...new Set(enrollments.map(e=>e.student_id).filter(Boolean))];
  if (!childIds.length) return { workspace, settings, enrollments, invites, students: [], reviewsToday: 0 };
  const progressFilter = childIds.map(id=>`child_id.eq.${id}`).join(",");
  const [progress,reviews] = await Promise.all([
    rest(`/learning_progress?or=(${progressFilter})&select=child_id,memorized_percent,review_percent,status,last_activity_at`),
    (()=>{const d=new Date();d.setHours(0,0,0,0);return rest(`/review_events?or=(${progressFilter})&reviewed_at=gte.${encodeURIComponent(d.toISOString())}&select=child_id,reviewed_at`);})()
  ]);
  const students = enrollments.filter(e=>e.child).map(e=>{
    const rows=(progress||[]).filter(p=>p.child_id===e.student_id);
    const avg=key=>rows.length?Math.round(rows.reduce((sum,r)=>sum+Number(r[key]||0),0)/rows.length):0;
    const progressLast=rows.map(r=>r.last_activity_at).filter(Boolean).sort().at(-1)||null;
    return {
      ...e.child,
      enrollmentId:e.id,
      enrollmentStatus:e.status,
      sessionRate:Number(e.session_rate||0),
      workspaceId:e.workspace_id,
      memorizedAverage:avg("memorized_percent"),
      reviewAverage:avg("review_percent"),
      masteredCount:rows.filter(r=>r.status==="mastered").length,
      surahCount:rows.length,
      lastActivityAt:e.child.last_activity_at||progressLast,
      classes:[],
    };
  });
  return { workspace, settings, enrollments, invites, students, reviewsToday:(reviews||[]).length };
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
      const progressLast = rows.map(r => r.last_activity_at).filter(Boolean).sort().at(-1) || null;
      return { ...child, classes: names, memorizedAverage: avg("memorized_percent"), reviewAverage: avg("review_percent"), masteredCount: rows.filter(r => r.status === "mastered").length, surahCount: rows.length, lastActivityAt: child.last_activity_at || progressLast };
    }),
  };
}
