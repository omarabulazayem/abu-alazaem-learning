import fs from "node:fs";
import path from "node:path";

const root=path.resolve("..");
const migrationPath=path.join(root,"patches-live","supabase","migrations","20261003_notifications_foundation.sql");
const reminderMigrationPath=path.join(root,"patches-live","supabase","migrations","20261005_lesson_reminders.sql");
const migration=fs.readFileSync(migrationPath,"utf8");
const reminderMigration=fs.readFileSync(reminderMigrationPath,"utf8");
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
  [migration,"create trigger leaderboard_snapshot_notification_created","leaderboard notification trigger"],
  [migration,"for each row execute function public.notify_leaderboard_snapshot_created();","leaderboard trigger execution"],
  [reminderMigration,"create or replace function public.ensure_lesson_reminder","lesson reminder RPC"],
  [reminderMigration,"LESSON_REMINDER","lesson reminder event"],
  [reminderMigration,"metadata->>'session_id'","reminder idempotency key"],
  [reminderMigration,"grant execute on function public.ensure_lesson_reminder(uuid) to authenticated","reminder RPC grant"],
  [api,"export async function ensureLessonReminder","lesson reminder API"],
  [panel,"LESSON_REMINDER","lesson reminder UI mapping"],
  [panel,"metadata.student_id+\"&session=\"+metadata.session_id","lesson reminder deep link"],
  [family,"ensureLessonReminder","family reminder creation"],
  [family,"abu-notifications","family notification refresh event"],

  [migration,"revoke execute on function public.notify_leaderboard_snapshot_created()","leaderboard trigger revoke"],
  [migration,"notifications_select_own","notifications RLS"],
  [migration,"revoke execute on function public.notification_parent_for_child(uuid)","internal helper revoke"],
  [migration,"revoke execute on function public.notify_task_assignment_created()","task trigger revoke"],
  [api,"export async function listNotifications","notification list API"],
  [api,"export async function markNotificationRead","notification read API"],
  [api,"export async function markAllNotificationsRead","notification bulk read API"],
  [panel,"listNotifications","panel data flow"],
  [panel,"markNotificationRead","panel read action"],
  [panel,"row.metadata||{}","metadata-aware notification routing"],
  [panel,"metadata.student_id","teacher student-context routing"],
  [panel,"metadata.assignment_id","submitted-task deep link"],
  [portal,"data-assignment-id={row.id}","task focus target"],
  [portal,"aa-task-focus","task focus class"],
  [family,"<NotificationsPanel userId=","family notification UI"],
  [family,"familyNotificationFocus","family deep-link parser"],
  [family,"data-assignment-id={row.id}","family task focus target"],
  [family,"data-session-id={row.id}","family session focus target"],
  [family,"data-transaction-id={row.id}","family points focus target"],
  [family,"data-billing-id={entry.id}","family billing focus target"],
  [family,"aa-notification-focus","family notification focus class"],
  [portal,"<NotificationsPanel userId=","teacher notification UI"],
];

const malformedDollarQuotes=(migration.match(/as \\$(?!\\$)|\\n\\$(?!\\$);/g)||[]);
if(malformedDollarQuotes.length){
  console.error("Notifications SQL validation failed: malformed dollar quoting.");
  process.exit(1);
}

const failed=checks.filter(([source,needle])=>!source.includes(needle)).map(([,needle,label])=>label+":"+needle);
if(failed.length){
  console.error("Notifications validation failed.");
  for(const item of failed)console.error(" - "+item);
  process.exit(1);
}
console.log("Notifications validation passed.");
