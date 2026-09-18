import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"..");

test("V7 Phase 3 creates auditable task workflow tables",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase3_tasks.sql"),"utf8");
  for(const table of ["tasks","task_assignments","task_submissions"]){
    assert.ok(sql.includes("public."+table),table);
  }
  for(const state of ["assigned","pending_teacher_approval","approved","rejected"]){
    assert.ok(sql.includes("'"+state+"'"),state);
  }
  for(const rpc of ["create_task_assignment","submit_task_assignment","review_task_assignment"]){
    assert.ok(sql.includes("public."+rpc),rpc);
  }
});

test("parent submission cannot award points and teacher approval is idempotent",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase3_tasks.sql"),"utf8");
  const submitStart=sql.indexOf("create or replace function public.submit_task_assignment");
  const reviewStart=sql.indexOf("create or replace function public.review_task_assignment");
  assert.ok(submitStart>=0&&reviewStart>submitStart);
  const submitBody=sql.slice(submitStart,reviewStart);
  assert.equal(submitBody.includes("insert into public.point_ledger"),false);
  const reviewBody=sql.slice(reviewStart);
  assert.ok(reviewBody.includes("'TASK_APPROVED'"));
  assert.ok(reviewBody.includes("v_task.points_reward,v_task.points_reward,v_task.points_reward"));
  assert.ok(reviewBody.includes("'task-approved:'||v_assignment.id::text"));
  assert.ok(reviewBody.includes("on conflict(student_id,idempotency_key)"));
});

test("task rejection requires a reason and preserves submission history",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase3_tasks.sql"),"utf8");
  assert.ok(sql.includes("rejection_reason_required"));
  assert.ok(sql.includes("insert into public.task_submissions"));
  assert.ok(sql.includes("assignment_not_submittable"));
  assert.ok(sql.includes("v_assignment.status not in ('assigned','rejected')"));
  assert.equal(/delete\s+from\s+public\.task_submissions/i.test(sql),false);
});

test("teacher, parent and child UI use the V7 task APIs",async()=>{
  const [api,teacher,family,challenges,child,nav]=await Promise.all([
    fs.readFile(path.join(root,"src/api.js"),"utf8"),
    fs.readFile(path.join(root,"src/TeacherPortal.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/FamilyPage.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/ChallengesPage.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/ChildHub.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/ui-v4.jsx"),"utf8"),
  ]);
  for(const fn of ["listChildTaskAssignments","listTeacherTaskAssignments","createTaskAssignment","submitTaskAssignment","reviewTaskAssignment"]){
    assert.ok(api.includes("function "+fn)||api.includes("async function "+fn),fn);
  }
  assert.ok(teacher.includes('path==="/teacher/tasks"'));
  assert.ok(teacher.includes("reviewTaskAssignment"));
  assert.ok(teacher.includes("سبب الرفض إلزامي"));
  assert.ok(family.includes("submitTaskAssignment"));
  assert.ok(family.includes("النقاط لن تُضاف قبل اعتماده"));
  assert.ok(challenges.includes("listChildTaskAssignments"));
  assert.equal(challenges.includes("const defs=["),false);
  assert.ok(child.includes("listChildTaskAssignments"));
  assert.ok(nav.includes('/teacher/tasks'));
});
