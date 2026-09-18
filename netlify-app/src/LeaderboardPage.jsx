import React,{useEffect,useMemo,useState} from "react";
import {
  getActiveChildId,getCurrentUser,getWorkspaceLeaderboard,listChildren,listParentEnrollments,
  updateLeaderboardSettings
} from "./api.js";
import {isChildModeActive} from "./ChildHub.jsx";
import Icon from "./Icon.jsx";
import {AppShell,Button,Card,CHILD_NAV,Empty,FAMILY_NAV,Hero,Metric,Section,go} from "./ui-v4.jsx";

function fmtWeek(week){
  if(!week)return "—";
  try{
    const f=new Intl.DateTimeFormat("ar-EG",{day:"numeric",month:"short"});
    return f.format(new Date(week.week_start+"T12:00:00Z"))+" — "+f.format(new Date(week.week_end+"T12:00:00Z"));
  }catch{return String(week.week_start||"")+" — "+String(week.week_end||"");}
}
function saturdayIn(timezone){
  try{return new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:timezone||"UTC"}).format(new Date())==="Sat";}
  catch{return false;}
}
function medal(rank){return rank===1?"medal":rank===2?"trophy":rank===3?"star":"target";}

function Standings({rows=[],viewerStudentId,closed=false}){
  if(!rows.length)return <Empty icon="trophy" title="لا توجد نتائج بعد" text="يظهر الترتيب عندما يبدأ الطلاب في جمع Weekly Score."/>;
  return <div className="aa-table-list">{rows.map((row,index)=><article className="aa-table-row" key={row.student_id||index}>
    <span><Icon name={medal(Number(row.rank))} size={23}/></span>
    <div><b>{row.display_name||"طالب"}{row.student_id===viewerStudentId?" — أنت":""}</b>
      <small>{closed&&Number(row.reward_points||0)>0?("جائزة الأسبوع: "+row.reward_points+" نقطة"):"Weekly Score"}</small>
    </div>
    <strong>#{row.rank} • {row.score}</strong>
  </article>)}</div>;
}

export function LeaderboardBoard({workspaceId,viewerStudentId,workspaceName,onLoaded}){
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  async function load(){
    if(!workspaceId){setData(null);setLoading(false);return;}
    setLoading(true);
    try{
      const result=await getWorkspaceLeaderboard(workspaceId);
      setData(result||null);setError("");onLoaded?.(result||null);
    }catch(e){setError(e.message||"تعذر تحميل الترتيب.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[workspaceId]);

  if(loading)return <div className="center"><i className="spinner"/><p>جارٍ حساب ترتيب الأسبوع...</p></div>;
  if(error)return <div className="msg error">{error}</div>;
  if(!data)return <Empty icon="trophy" title="اختر معلمًا لعرض الترتيب"/>;

  const current=data.current_week;
  const meClosed=(data.last_closed_standings||[]).find(r=>r.student_id===viewerStudentId);
  const isSaturday=saturdayIn(current?.timezone);
  return <>
    {viewerStudentId&&isSaturday&&meClosed&&<Hero eyebrow="نتيجة السبت" title={meClosed.rank<=3?"أحسنت! وصلت للمنصة":"أسبوع جديد بدأ"}
      description={meClosed.rank<=3
        ?("مركزك في الأسبوع المغلق #"+meClosed.rank+(meClosed.reward_points?(" وربحت "+meClosed.reward_points+" نقطة."):""))
        :"نتيجة الأسبوع السابق محفوظة، وبدأت فرصة جديدة من الصفر في Weekly Score."}
      icon={meClosed.rank<=3?"medal":"sparkle"} tone={meClosed.rank<=3?"gold":"sky"}/>}
    <div className="aa-metrics">
      <Metric icon="calendar" label="الأسبوع الحالي" value={fmtWeek(current)} tone="sky"/>
      <Metric icon="teacher" label="المعلم" value={workspaceName||"مساحة المعلم"} tone="mint"/>
      <Metric icon="trophy" label="عدد المشاركين" value={(data.standings||[]).length} tone="gold"/>
      <Metric icon="clock" label="الإغلاق" value="الجمعة 11:59 م" tone="sky"/>
    </div>
    <Section eyebrow="هذا الأسبوع" title="الترتيب الحالي" description={"المنافسة داخل مساحة هذا المعلم فقط • "+(current?.timezone||"Teacher Timezone")}>
      <Standings rows={data.standings||[]} viewerStudentId={viewerStudentId}/>
    </Section>
    {data.last_closed_week&&<Section eyebrow="Snapshot محفوظ" title={"الأسبوع السابق "+fmtWeek(data.last_closed_week)}
      description="هذه النتيجة غير قابلة للتعديل بعد الإغلاق، حتى لو حدث سحب نقاط لاحقًا.">
      <Standings rows={data.last_closed_standings||[]} viewerStudentId={viewerStudentId} closed/>
    </Section>}
  </>;
}

export function TeacherLeaderboardPanel({data}){
  const workspace=data.workspace;
  const settings=data.settings||{};
  const [form,setForm]=useState({
    privacy:settings.leaderboard_privacy||"first_name_initial",
    firstReward:settings.first_place_reward??50,
    secondReward:settings.second_place_reward??30,
    thirdReward:settings.third_place_reward??20,
  });
  const [message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[refreshKey,setRefreshKey]=useState(0);

  async function save(e){
    e.preventDefault();if(!workspace?.id)return;
    setBusy(true);setMessage("");setError("");
    try{
      await updateLeaderboardSettings(workspace.id,form);
      setMessage("تم حفظ إعدادات الخصوصية وجوائز المراكز القادمة.");
      setRefreshKey(v=>v+1);
    }catch(e){setError(e.message||"تعذر حفظ إعدادات الترتيب.");}
    finally{setBusy(false);}
  }

  if(!workspace)return <Empty icon="teacher" title="مساحة المعلم غير جاهزة"/>;
  return <>
    <Hero eyebrow="Weekly Leaderboard" title="المنافسة الأسبوعية" description="الترتيب خاص بطلاب مساحتك فقط، ويُغلق تلقائيًا ليلة الجمعة حسب توقيتك." icon="trophy" tone="gold"/>
    {message&&<div className="msg ok">{message}</div>}{error&&<div className="msg error">{error}</div>}
    <Section eyebrow="الإعدادات" title="الخصوصية وجوائز المنصة">
      <form className="aa-form-card aa-form" onSubmit={save} style={{maxWidth:760}}>
        <label>طريقة عرض اسم الطفل<select value={form.privacy} onChange={e=>setForm(v=>({...v,privacy:e.target.value}))}>
          <option value="first_name_initial">الاسم الأول + أول حرف من الاسم التالي</option>
          <option value="first_name_only">الاسم الأول فقط</option>
          <option value="hidden">إخفاء الاسم — طالب</option>
        </select></label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10}}>
          <label>المركز الأول<input type="number" min="0" value={form.firstReward} onChange={e=>setForm(v=>({...v,firstReward:e.target.value}))}/></label>
          <label>المركز الثاني<input type="number" min="0" value={form.secondReward} onChange={e=>setForm(v=>({...v,secondReward:e.target.value}))}/></label>
          <label>المركز الثالث<input type="number" min="0" value={form.thirdReward} onChange={e=>setForm(v=>({...v,thirdReward:e.target.value}))}/></label>
        </div>
        <Button type="submit" disabled={busy} icon="shield">{busy?"جارٍ الحفظ...":"حفظ الإعدادات"}</Button>
      </form>
    </Section>
    <LeaderboardBoard key={refreshKey} workspaceId={workspace.id} workspaceName={workspace.display_name}/>
  </>;
}

export default function LeaderboardPage(){
  const [user,setUser]=useState(undefined),[child,setChild]=useState(null),[links,setLinks]=useState([]),[workspaceId,setWorkspaceId]=useState(""),[error,setError]=useState("");
  useEffect(()=>{let alive=true;(async()=>{try{
    const current=await getCurrentUser();if(!alive)return;
    if(!current)return go("/login");
    if(current.accountType==="teacher")return go("/teacher/leaderboard");
    setUser(current);
    const [kids,enrollments]=await Promise.all([listChildren(current),listParentEnrollments()]);
    const selected=kids.find(k=>k.id===getActiveChildId())||kids[0]||null;
    if(!alive)return;
    setChild(selected);
    const childLinks=(enrollments||[]).filter(e=>e.student_id===selected?.id&&["active","paused"].includes(e.status));
    setLinks(childLinks);
    setWorkspaceId(childLinks[0]?.workspace_id||"");
  }catch(e){if(alive)setError(e.message||"تعذر فتح الترتيب.");}})();return()=>{alive=false;};},[]);

  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز الترتيب...</p></div>;
  const childMode=isChildModeActive();
  const selectedLink=links.find(l=>l.workspace_id===workspaceId)||links[0]||null;
  return <AppShell mode={childMode?"child":"family"} subtitle="ترتيبي" nav={childMode?CHILD_NAV:FAMILY_NAV}
    footer="أبو العزايم • منافسة إيجابية داخل مساحة المعلم فقط.">
    <Hero eyebrow="Weekly Score" title={childMode?"ترتيبي هذا الأسبوع":"ترتيب الطفل مع المعلم"}
      description={child?"كل معلم له مسابقة أسبوعية منفصلة لـ "+child.display_name+".":"اختر طفلًا من حساب الأسرة أولًا."}
      icon="trophy" tone="gold"/>
    {error&&<div className="msg error">{error}</div>}
    {links.length>1&&<Section eyebrow="المعلم" title="اختر المسابقة">
      <div className="aa-quran-toolbar" style={{gridTemplateColumns:"1fr"}}>
        <select value={workspaceId} onChange={e=>setWorkspaceId(e.target.value)}>
          {links.map(link=><option key={link.id} value={link.workspace_id}>{link.workspace?.display_name||"معلم"}</option>)}
        </select>
      </div>
    </Section>}
    {selectedLink?<LeaderboardBoard workspaceId={selectedLink.workspace_id} workspaceName={selectedLink.workspace?.display_name} viewerStudentId={child?.id}/>:
      <Empty icon="trophy" title="لا توجد مسابقة بعد" text="يحتاج الطفل إلى Enrollment نشط مع معلم."/>}
  </AppShell>;
}
