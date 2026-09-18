import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"..");

test("V7 Phase 5 creates teacher-scoped weekly snapshots",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase5_leaderboard.sql"),"utf8");
  for(const table of ["leaderboard_weeks","leaderboard_snapshots"]){
    assert.ok(sql.includes("public."+table),table);
  }
  assert.ok(sql.includes("workspace_id"));
  assert.ok(sql.includes("unique(workspace_id,week_start)"));
  assert.ok(sql.includes("unique(leaderboard_week_id,student_id)"));
});

test("leaderboard week is Saturday through Friday in Teacher Timezone",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase5_leaderboard.sql"),"utf8");
  assert.ok(sql.includes("v_week_start:=v_local_date-((extract(dow from v_local_date)::integer+1)%7)"));
  assert.ok(sql.includes("v_week_end:=v_week_start+6"));
  assert.ok(sql.includes("at time zone v_workspace.timezone"));
  assert.ok(sql.includes("((v_week_end+1)::timestamp at time zone v_workspace.timezone)"));
});

test("shared positions use competition ranking and closed snapshots are immutable",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase5_leaderboard.sql"),"utf8");
  assert.match(sql,/rank\(\)\s+over\(order by s\.final_score desc\)/i);
  assert.match(sql,/before update or delete on public\.leaderboard_snapshots/i);
  assert.ok(sql.includes("leaderboard_snapshot_is_immutable"));
  assert.ok(sql.includes("closed_leaderboard_week_is_immutable"));
});

test("weekly podium reward never changes Weekly Score",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase5_leaderboard.sql"),"utf8");
  assert.ok(sql.includes("'WEEKLY_REWARD'"));
  assert.ok(sql.includes("v_snapshot.reward_points,v_snapshot.reward_points,0"));
  assert.ok(sql.includes("'weekly-reward:'||v_week.id::text||':'||v_snapshot.student_id::text"));
  assert.ok(sql.includes("when r.final_score<=0 then 0"));
});

test("leaderboard privacy masks names before returning cross-family standings",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase5_leaderboard.sql"),"utf8");
  assert.ok(sql.includes("leaderboard_display_name"));
  assert.ok(sql.includes("first_name_initial"));
  assert.ok(sql.includes("first_name_only"));
  assert.ok(sql.includes("'hidden'"));
  assert.ok(sql.includes("return 'طالب'"));
});

test("database scheduler maintains and closes due weeks automatically",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase5_leaderboard.sql"),"utf8");
  assert.ok(sql.includes("create extension if not exists pg_cron"));
  assert.ok(sql.includes("'v7-leaderboard-maintenance'"));
  assert.ok(sql.includes("'*/5 * * * *'"));
  assert.ok(sql.includes("public.maintain_leaderboard_weeks()"));
  assert.ok(sql.includes("closes_at_utc<=now()"));
});

test("leaderboard UI is available to teacher, parent and Child Mode",async()=>{
  const [api,page,router,teacher,ui,child]=await Promise.all([
    fs.readFile(path.join(root,"src/api.js"),"utf8"),
    fs.readFile(path.join(root,"src/LeaderboardPage.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/RootRouter.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/TeacherPortal.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/ui-v4.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/ChildHub.jsx"),"utf8"),
  ]);
  assert.ok(api.includes("getWorkspaceLeaderboard"));
  assert.ok(api.includes("updateLeaderboardSettings"));
  assert.ok(page.includes("TeacherLeaderboardPanel"));
  assert.ok(page.includes("last_closed_standings"));
  assert.ok(page.includes("نتيجة السبت"));
  assert.ok(router.includes('"/leaderboard"'));
  assert.ok(teacher.includes('path==="/teacher/leaderboard"'));
  assert.ok(ui.includes('/teacher/leaderboard'));
  assert.ok(child.includes('path:"/leaderboard"'));
});
