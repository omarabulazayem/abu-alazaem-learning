import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"..");

test("V7 Phase 6 separates notification events from delivery channels",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase6_notifications_admin.sql"),"utf8");
  assert.ok(sql.includes("public.notifications"));
  assert.ok(sql.includes("public.notification_deliveries"));
  assert.ok(sql.includes("channel in ('IN_APP','EMAIL')"));
  assert.ok(sql.includes("'IN_APP',p_recipient_user_id::text,'SENT'"));
  assert.ok(sql.includes("'EMAIL',v_email,'PENDING'"));
});

test("minimum pre-subscription notification categories are wired to business events",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase6_notifications_admin.sql"),"utf8");
  for(const event of [
    "parent_invite","lesson_reminder","lesson_rescheduled","lesson_cancelled",
    "new_task","task_submitted","task_approved","task_rejected",
    "points_reversed","weekly_result","tuition_status_change"
  ]) assert.ok(sql.includes("'"+event+"'"),event);
  assert.ok(sql.includes("task_assignments_notify_created"));
  assert.ok(sql.includes("session_billing_notify_update"));
  assert.ok(sql.includes("point_ledger_notify_reversal"));
  assert.ok(sql.includes("leaderboard_weeks_notify_closed"));
});

test("lesson reminders are server scheduled and deduplicated",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase6_notifications_admin.sql"),"utf8");
  assert.ok(sql.includes("v7-lesson-reminders"));
  assert.ok(sql.includes("*/15 * * * *"));
  assert.ok(sql.includes("lesson-reminder-24h:"));
  assert.ok(sql.includes("dedupe_key text unique"));
});

test("Super Admin teacher status changes require reason and create audit history",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase6_notifications_admin.sql"),"utf8");
  const start=sql.indexOf("create or replace function public.admin_set_teacher_workspace_status");
  assert.ok(start>=0);
  const body=sql.slice(start);
  assert.ok(body.includes("admin_required"));
  assert.ok(body.includes("admin_reason_required"));
  assert.ok(body.includes("'ADMIN_TEACHER_STATUS_CHANGED'"));
  assert.ok(body.includes("before_state"));
  assert.ok(body.includes("after_state"));
});

test("invite notification tokens are redacted after use or expiry",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase6_invite_token_hardening.sql"),"utf8");
  assert.ok(sql.includes("redact_invite_notification_token"));
  assert.ok(sql.includes("payload=d.payload-'action_path'"));
  assert.ok(sql.includes("status<>'pending'"));
  assert.ok(sql.includes("v7-invite-token-redaction"));
});

test("in-app inbox is current-user scoped even for admin",async()=>{
  const api=await fs.readFile(path.join(root,"src/api.js"),"utf8");
  const start=api.indexOf("export async function listNotifications");
  const end=api.indexOf("export async function markNotificationRead",start);
  const body=api.slice(start,end);
  assert.ok(body.includes("getStoredSession()?.user?.id"));
  assert.ok(body.includes("recipient_user_id=eq."));
});

test("notifications and admin pages are not Child Mode safe routes",async()=>{
  const [router,notifications,admin,ui]=await Promise.all([
    fs.readFile(path.join(root,"src/RootRouter.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/NotificationsPage.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/AdminPortal.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/ui-v4.jsx"),"utf8"),
  ]);
  const safeLine=router.split("\n").find(line=>line.includes("const childSafeRoutes"))||"";
  assert.equal(safeLine.includes("/notifications"),false);
  assert.equal(safeLine.includes("/admin"),false);
  assert.ok(router.includes('path==="/notifications"'));
  assert.ok(router.includes('path==="/admin"'));
  assert.ok(notifications.includes("markAllNotificationsRead"));
  assert.ok(admin.includes("adminSetTeacherWorkspaceStatus"));
  assert.ok(admin.includes("Audit Log"));
  assert.ok(ui.includes("ADMIN_NAV"));
});
