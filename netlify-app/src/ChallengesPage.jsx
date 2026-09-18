import React,{useEffect,useMemo,useState} from "react";
import {getActiveChildId,getCurrentUser,listChildTaskAssignments,listChildren} from "./api.js";
import {isChildModeActive} from "./ChildHub.jsx";
import {AppShell,Button,Card,CHILD_NAV,Empty,FAMILY_NAV,Hero,Ring,Section,go} from "./ui-v4.jsx";

function typeLabel(v){return ({NEW_MEMORIZATION:"حفظ جديد",REVIEW:"مراجعة",RECITATION:"تسميع",BEHAVIOR:"سلوك"}[v]||v||"مهمة");}
function statusLabel(v){return ({assigned:"مطلوبة",pending_teacher_approval:"بانتظار المعلم",approved:"تم اعتمادها",rejected:"تحتاج إعادة"}[v]||v||"");}
function toneFor(v){return v==="approved"?"mint":v==="rejected"?"pink":v==="pending_teacher_approval"?"gold":"sky";}
function iconFor(v){return v==="approved"?"circleCheck":v==="pending_teacher_approval"?"clock":v==="rejected"?"review":"target";}
function formatDate(value){if(!value)return "—";try{return new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch{return value;}}

export default function ChallengesPage(){
  const [user,setUser]=useState(undefined),[child,setChild]=useState(null),[tasks,setTasks]=useState([]),[err,setErr]=useState("");
  useEffect(()=>{let alive=true;(async()=>{try{
    const current=await getCurrentUser();if(!alive)return;if(!current)return go("/login");if(current.accountType==="teacher")return;
    setUser(current);
    const kids=await listChildren(current);
    const selected=kids.find(k=>k.id===getActiveChildId())||kids[0]||null;
    if(!alive)return;setChild(selected);
    if(selected){const rows=await listChildTaskAssignments(selected.id);if(alive)setTasks(rows||[]);}
  }catch(e){if(alive)setErr(e.message||"تعذر تحميل مهام المعلم.");}})();return()=>{alive=false;};},[]);

  const approved=useMemo(()=>tasks.filter(t=>t.status==="approved").length,[tasks]);
  const pending=useMemo(()=>tasks.filter(t=>t.status==="pending_teacher_approval").length,[tasks]);
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز مهمتي...</p></div>;

  const childMode=isChildModeActive(),progress=tasks.length?Math.round(approved/tasks.length*100):0;
  const ordered=[...tasks].sort((a,b)=>{
    const rank={assigned:0,rejected:1,pending_teacher_approval:2,approved:3};
    return (rank[a.status]??9)-(rank[b.status]??9)||new Date(a.due_at||0)-new Date(b.due_at||0);
  });

  return <AppShell mode={childMode?"child":"family"} subtitle="مهمتي" nav={childMode?CHILD_NAV:FAMILY_NAV} footer="أبو العزايم • المهمة تأتي من المعلم، والاعتماد النهائي عند المعلم.">
    <Hero eyebrow="مهام المعلم" title={child?("مهمات "+child.display_name):"مهمتي"}
      description={tasks.length?"اختار المهمة اللي عليها الدور. بعد ما تخلصها، ولي الأمر يرسلها للمعلم عشان يراجعها.":"لما المعلم يرسل مهمة هتظهر هنا تلقائيًا."}
      icon="target" tone="sky" aside={<Ring value={progress} label={approved+"/"+tasks.length}/>}/>
    {err&&<div className="msg error">{err}</div>}
    {tasks.length>0&&<div className="aa-metrics">
      <Card icon="target" title={String(tasks.length-approved-pending)} text="تحتاج شغل أو إعادة" tone="sky"/>
      <Card icon="clock" title={String(pending)} text="بانتظار المعلم" tone="gold"/>
      <Card icon="circleCheck" title={String(approved)} text="اعتمدها المعلم" tone="mint"/>
    </div>}
    <Section eyebrow="الآن" title="المهام">
      {ordered.length?<div className="aa-world-grid">{ordered.map(row=>{
        const note=row.status==="rejected"&&row.latestSubmission?.rejection_note
          ?("ملاحظة المعلم: "+row.latestSubmission.rejection_note)
          :(row.task?.teacher_note||"");
        const text=typeLabel(row.task?.task_type)+" • "+(row.task?.points_reward||0)+" نقطة بعد الاعتماد • موعد التسليم "+formatDate(row.due_at)+(note?(" • "+note):"");
        return <Card key={row.id} className="aa-world-card" icon={iconFor(row.status)} title={row.task?.title||"مهمة"} text={text}
          tone={toneFor(row.status)} badge={statusLabel(row.status)}
          action={!childMode&&(row.status==="assigned"||row.status==="rejected")?"إرسال الإنجاز من حساب الأسرة":undefined}
          onClick={!childMode&&(row.status==="assigned"||row.status==="rejected")?()=>go("/family"):undefined}/>;
      })}</div>:<Empty icon="target" title="لا توجد مهام بعد" text="المعلم لم يرسل مهمة لهذا الطفل حتى الآن."/>}
    </Section>
    {childMode&&tasks.some(t=>t.status==="assigned"||t.status==="rejected")&&
      <Section eyebrow="بعد ما تخلص" title="خلي ولي الأمر يرسل الإنجاز" description="أنت تنفذ المهمة، وولي الأمر يرسلها للمعلم. النقاط لا تظهر إلا بعد مراجعة المعلم واعتماده."/>}
    {!childMode&&tasks.some(t=>t.status==="assigned"||t.status==="rejected")&&
      <Section eyebrow="لولي الأمر" title="إرسال الإنجاز" description="التسليم موجود في حساب الأسرة مع خانة ملاحظة اختيارية.">
        <Button icon="family" onClick={()=>go("/family")}>الذهاب لحساب الأسرة</Button>
      </Section>}
  </AppShell>;
}
