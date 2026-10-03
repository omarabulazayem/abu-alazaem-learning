import fs from "node:fs";
import path from "node:path";

const root=path.resolve("..");
const migrationPath=path.join(root,"patches-live","supabase","migrations","20261003_notifications_foundation.sql");
const migration=fs.readFileSync(migrationPath,"utf8");
const api=fs.readFileSync(path.join("src","api.js"),"utf8");
const panel=fs.readFileSync(path.join("src","NotificationsPanel.jsx"),"utf8");
const family=fs.readFileSync(path.join("src","FamilyPage.jsx"),"utf8");
const portal=fs.readFileSync(path.join("src","TeacherPortal.jsx"),"utf8");

const checks=[
  [migration,"create table if not exists public.notifications","notifications table"],
  [migration,"create table if not exists public.notification_deliveries","delivery table"],
  [migration,"create or replace function public.create_notification","notification helper"],
  [migration,"TASK_ASSIGNED","task assignment event"],
  [migration,"TASK_SUBMITTED","task submission event"],
  [migration,"TASK_APPROVED","task approval event"],
  [migration,"LESSON_RESCHEDULED","lesson reschedule event"],
  [migration,"TUITION_STATUS_CHANGED","tuition event"],
  [migration,"POINTS_CHANGED","points event"],
  [migration,"WEEKLY_RESULT","weekly leaderboard event"],
  [migration,"notify_leaderboard_snapshot_created","leaderboard trigger"],
  [migration,"revoke execute on function public.notify_leaderboard_snapshot_created()","leaderboard trigger revoke"],
  [migration,"notifications_select_own","notifications RLS"],
  [migration,"revoke execute on function public.notification_parent_for_child(uuid)","internal helper revoke"],
  [migration,"revoke execute on function public.notify_task_assignment_created()","task trigger revoke"],
  [api,"export async function listNotifications","notification list API"],
  [api,"export async function markNotificationRead","notification read API"],
  [api,"export async function markAllNotificationsRead","notification bulk read API"],
  [panel,"listNotifications","panel data flow"],
  [panel,"markNotificationRead","panel read action"],
  [family,"<NotificationsPanel userId=","family notification UI"],
  [portal,"<NotificationsPanel userId=","teacher notification UI"],
];

const failed=checks.filter(([source,needle])=>!source.includes(needle)).map(([,needle,label])=>label+":"+needle);
if(failed.length){
  console.error("Notifications validation failed.");
  for(const item of failed)console.error(" - "+item);
  process.exit(1);
}
console.log("Notifications validation passed.");
