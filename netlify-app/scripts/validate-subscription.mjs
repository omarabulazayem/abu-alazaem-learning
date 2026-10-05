import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const migrationPath=path.join(root,"../patches-live/supabase/migrations/20261005_teacher_saas_subscription_foundation.sql");
const apiPath=path.join(root,"src/api.js");
const adminPath=path.join(root,"src/AdminPortal.jsx");
const teacherPath=path.join(root,"src/TeacherPortal.jsx");
const routerPath=path.join(root,"src/RootRouter.jsx");
const uiPath=path.join(root,"src/ui-v4.jsx");

const read=p=>fs.readFileSync(p,"utf8");
const migration=read(migrationPath);
const api=read(apiPath);
const admin=read(adminPath);
const teacher=read(teacherPath);
const router=read(routerPath);
const ui=read(uiPath);

const checks=[
  [migration,"create table if not exists public.saas_plans","saas_plans table"],
  [migration,"create table if not exists public.teacher_subscriptions","teacher_subscriptions table"],
  [migration,"create table if not exists public.teacher_subscription_events","subscription events table"],
  [migration,"status text not null default 'PENDING_PLAN'","pending subscription state"],
  [migration,"create or replace function public.ensure_teacher_subscription()","workspace subscription trigger function"],
  [migration,"create trigger teacher_workspace_ensure_subscription","workspace subscription trigger"],
  [migration,"create or replace function public.upsert_saas_plan(","admin plan RPC"],
  [migration,"public.is_platform_admin()","admin authorization"],
  [migration,"create or replace function public.apply_teacher_subscription_event(","provider event RPC"],
  [migration,"coalesce(auth.role(),'') <> 'service_role'","service-role webhook guard"],
  [migration,"grant execute on function public.apply_teacher_subscription_event","service-role execute grant"],
  [migration,"using (active=true or public.is_platform_admin())","plan visibility RLS"],
  [migration,"public.owns_teacher_workspace(workspace_id)","teacher subscription RLS"],
  [migration,"create trigger saas_plans_set_updated_at","plan updated_at trigger"],
  [api,"export async function listSaasPlans","plan API"],
  [api,"export async function getTeacherSubscription","subscription API"],
  [api,"export async function upsertSaasPlan","admin plan API"],
  [teacher,"function TeacherSubscriptionPanel","teacher subscription UI"],
  [teacher,'path==="/teacher/subscription"',"teacher subscription route"],
  [teacher,"subscription:data.subscription","teacher overview subscription state"],
  [admin,"listSaasPlans(true)","admin reads inactive plans"],
  [admin,"upsertSaasPlan(form)","admin saves plans"],
  [router,'import AdminPortal from "./AdminPortal.jsx"',"admin portal import"],
  [router,'(path==="/admin"||path.startsWith("/admin/"))&&admin',"protected admin route"],
  [router,'if(admin&&!path.startsWith("/admin"))navigate("/admin",true)',"admin redirect"],
  [ui,'{path:"/teacher/subscription",label:"الاشتراك",icon:"star"}',"teacher subscription navigation"],
  [ui,'admin:"إدارة المنصة"',"admin branding"],
];

const failed=checks.filter(([source,needle])=>!source.includes(needle)).map(([,needle,label])=>label+":"+needle);
for(const [label,source] of [["saas subscription migration",migration],["api.js",api],["AdminPortal.jsx",admin],["TeacherPortal.jsx",teacher],["RootRouter.jsx",router],["ui-v4.jsx",ui]]){
  const bad=[...source.matchAll(/#(?:[0-9A-Fa-f]{0,5}|[0-9A-Fa-f]{7,})\b/g)];
  if(bad.length) failed.push(label+": malformed hex token");
}
if(failed.length){
  console.error("Subscription validation failed.");
  for(const item of failed) console.error(" - "+item);
  process.exit(1);
}
console.log("Subscription validation pass.");
