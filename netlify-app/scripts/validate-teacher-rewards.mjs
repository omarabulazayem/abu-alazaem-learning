import fs from "node:fs";
import path from "node:path";

const root = path.resolve("..");
const migrationPath = path.join(root,"patches-live","supabase","migrations","20261003_teacher_bonus_rpc.sql");
const apiPath = path.join("src","api.js");
const portalPath = path.join("src","TeacherPortal.jsx");

const migration=fs.readFileSync(migrationPath,"utf8");
const api=fs.readFileSync(apiPath,"utf8");
const portal=fs.readFileSync(portalPath,"utf8");

const checks=[
  [migration,"create or replace function public.grant_teacher_bonus","teacher bonus RPC"],
  [migration,"'TEACHER_BONUS'","TEACHER_BONUS ledger type"],
  [migration,"insert into public.audit_logs","bonus audit log"],
  [migration,"grant execute on function public.grant_teacher_bonus","RPC execute grant"],
  [api,"export async function grantTeacherBonus","client bonus helper"],
  [api,"export async function reversePointTransaction","client reversal helper"],
  [portal,"grantTeacherBonus,","portal bonus import"],
  [portal,"reversePointTransaction,","portal reversal import"],
  [portal,"مكافأة سريعة","bonus UI"],
  [portal,"سحب النقاط","reversal UI"],
];

const failed=checks.filter(([source,needle])=>!source.includes(needle)).map(([,needle,label])=>label+":"+needle);
if(failed.length){
  console.error("Teacher rewards validation failed.");
  for(const item of failed)console.error(" - "+item);
  process.exit(1);
}
console.log("Teacher rewards validation passed.");
