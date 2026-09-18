import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"..");

test("V7 Phase 4 schema contains recurring schedule, sessions and tuition CRM",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase4_scheduling_billing.sql"),"utf8");
  for(const table of ["recurring_schedule_rules","sessions","session_billing_entries"]){
    assert.ok(sql.includes("public."+table),table);
  }
  for(const status of ["SCHEDULED","COMPLETED","STUDENT_NO_SHOW","TEACHER_NO_SHOW","EARLY_CANCELLATION","LATE_CANCELLATION","RESCHEDULED","CANCELLED"]){
    assert.ok(sql.includes("'"+status+"'"),status);
  }
});

test("tuition billing is derived only from approved billable session states",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase4_scheduling_billing.sql"),"utf8");
  const ensureStart=sql.indexOf("create or replace function public.ensure_session_billing");
  const finalizeStart=sql.indexOf("create or replace function public.finalize_session");
  assert.ok(ensureStart>=0&&finalizeStart>ensureStart);
  const ensureBody=sql.slice(ensureStart,finalizeStart);
  assert.ok(ensureBody.includes("('COMPLETED','STUDENT_NO_SHOW','LATE_CANCELLATION')"));
  assert.equal(ensureBody.includes("'TEACHER_NO_SHOW'"),false);
  assert.equal(ensureBody.includes("'EARLY_CANCELLATION'"),false);
  assert.match(ensureBody,/v_enrollment\.session_rate/);
});

test("teacher cancellation never bills parent and parent cancellation uses configured threshold",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase4_scheduling_billing.sql"),"utf8");
  const cancelStart=sql.indexOf("create or replace function public.cancel_session");
  const rescheduleStart=sql.indexOf("create or replace function public.reschedule_session");
  const body=sql.slice(cancelStart,rescheduleStart);
  assert.ok(body.includes("v_actor:='TEACHER'"));
  assert.ok(body.includes("v_status:='CANCELLED'"));
  assert.ok(body.includes("late_cancellation_hours"));
  assert.ok(body.includes("v_status:='LATE_CANCELLATION'"));
  assert.ok(body.includes("v_status:='EARLY_CANCELLATION'"));
});

test("waiver is non-destructive, reasoned and auditable",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase4_scheduling_billing.sql"),"utf8");
  const waiveStart=sql.indexOf("create or replace function public.waive_session_charge");
  const paidStart=sql.indexOf("create or replace function public.mark_session_charge_paid");
  const body=sql.slice(waiveStart,paidStart);
  assert.ok(body.includes("waiver_reason_required"));
  assert.ok(body.includes("status='WAIVED'"));
  assert.ok(body.includes("override_reason=trim(p_reason)"));
  assert.equal(/update\s+public\.sessions/i.test(body),false);
  assert.ok(body.includes("'SESSION_CHARGE_WAIVED'"));
});

test("recurrence and manual reschedule are teacher-timezone safe",async()=>{
  const [base,local]=await Promise.all([
    fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase4_scheduling_billing.sql"),"utf8"),
    fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase4_timezone_reschedule.sql"),"utf8"),
  ]);
  assert.ok(base.includes("at time zone v_rule.timezone"));
  assert.ok(base.includes("v_workspace.timezone"));
  assert.ok(local.includes("at time zone v_workspace.timezone"));
  assert.ok(local.includes("reschedule_session_local"));
});

test("teacher, parent and child surfaces consume Phase 4 APIs",async()=>{
  const [api,teacherOps,teacherPortal,family,child,nav]=await Promise.all([
    fs.readFile(path.join(root,"src/api.js"),"utf8"),
    fs.readFile(path.join(root,"src/TeacherOperations.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/TeacherPortal.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/FamilyPage.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/ChildHub.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/ui-v4.jsx"),"utf8"),
  ]);
  for(const fn of ["createRecurringScheduleRule","finalizeSession","cancelSession","rescheduleSessionLocal","waiveSessionCharge","markSessionChargePaid"]){
    assert.ok(api.includes("function "+fn)||api.includes("async function "+fn),fn);
  }
  assert.ok(teacherPortal.includes('path==="/teacher/schedule"'));
  assert.ok(teacherPortal.includes('path==="/teacher/billing"'));
  assert.ok(teacherOps.includes("TeacherSchedulePanel"));
  assert.ok(teacherOps.includes("TeacherBillingPanel"));
  assert.ok(family.includes("كشف الاستحقاقات"));
  assert.ok(family.includes("الحصص القادمة"));
  assert.ok(child.includes("nextLesson"));
  assert.ok(nav.includes('/teacher/schedule'));
  assert.ok(nav.includes('/teacher/billing'));
});
