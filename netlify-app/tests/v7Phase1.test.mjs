import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"..");

test("V7 Phase 1 schema establishes Enrollment ownership without deleting legacy compatibility",async()=>{
  const base=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase1_identity_enrollment.sql"),"utf8");
  for(const table of ["teacher_workspaces","teacher_settings","parent_student_relations","enrollments","enrollment_invites","family_security","audit_logs"]){
    assert.ok(base.includes(`public.${table}`),table);
  }
  for(const rpc of ["create_enrollment_invite","accept_enrollment_invite","set_child_mode_pin","verify_child_mode_pin"]){
    assert.ok(base.includes(`public.${rpc}`),rpc);
  }
  assert.doesNotMatch(base,/drop\s+table\s+(if\s+exists\s+)?public\.(classes|class_students)/i);
});

test("V7 client flow uses Enrollment invites and a four digit PIN",async()=>{
  const [api,family,child,teacher,nav]=await Promise.all([
    fs.readFile(path.join(root,"src/api.js"),"utf8"),
    fs.readFile(path.join(root,"src/FamilyPage.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/ChildHub.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/TeacherPortal.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/ui-v4.jsx"),"utf8"),
  ]);
  for(const fn of ["createEnrollmentInvite","acceptEnrollmentInvite","listTeacherEnrollments","listParentEnrollments","setChildModePin","verifyChildModePin"]){
    assert.ok(api.includes(`function ${fn}`)||api.includes(`async function ${fn}`),fn);
  }
  assert.ok(family.includes("PENDING_INVITE_KEY"));
  assert.ok(family.includes("setChildModePin"));
  assert.ok(child.includes("verifyChildModePin"));
  assert.ok(child.includes("hasChildModePin"));
  assert.equal(child.includes("signIn(user.email"),false);
  assert.ok(teacher.includes("createEnrollmentInvite"));
  assert.ok(teacher.includes("teacherEnrollmentOverview"));
  assert.ok(nav.includes('/teacher/invites'));
});

test("teacher management navigation no longer promotes legacy classes",async()=>{
  const policy=await fs.readFile(path.join(root,"src/accessPolicy.js"),"utf8");
  assert.ok(policy.includes('["الدعوات", "/teacher/invites"]'));
  assert.equal(policy.includes('["الفصول", "/teacher/classes"]'),false);
});
