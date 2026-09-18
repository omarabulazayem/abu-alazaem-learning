import React,{useEffect,useMemo,useState} from "react";
import {
  adminSetTeacherWorkspaceStatus,adminTeacherOverview,getCurrentUser,listAuditLogs,listNotificationDeliveries,signOut
} from "./api.js";
import Icon from "./Icon.jsx";
import {ADMIN_NAV,AppShell,Button,Empty,Hero,Metric,Section,go} from "./ui-v4.jsx";

function fmt(value){try{return new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch{return value||"";}}
function statusLabel(v){return ({active:"نشط",paused:"متوقف مؤقتًا",suspended:"موقوف",closed:"مغلق"}[v]||v||"");}

export default function AdminPortal(){
  const [user,setUser]=useState(undefined),[teachers,setTeachers]=useState([]),[audit,setAudit]=useState([]),[deliveries,setDeliveries]=useState([]);
  const [reasons,setReasons]=useState({}),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");

  async function load(){
    const [teacherRows,auditRows,deliveryRows]=await Promise.all([
      adminTeacherOverview(),listAuditLogs(150),listNotificationDeliveries(150)
    ]);
    setTeachers(Array.isArray(teacherRows)?teacherRows:[]);
    setAudit(auditRows||[]);setDeliveries(deliveryRows||[]);
  }
  useEffect(()=>{let alive=true;(async()=>{try{
    const current=await getCurrentUser();if(!alive)return;
    if(!current)return go("/login");
    if(current.accountType!=="admin")return go(current.accountType==="teacher"?"/teacher":"/family");
    setUser(current);await load();
  }catch(e){if(alive)setError(e.message||"تعذر فتح لوحة الإدارة.");}})();return()=>{alive=false;};},[]);

  const emailStats=useMemo(()=>({
    pending:deliveries.filter(d=>d.channel==="EMAIL"&&d.status==="PENDING").length,
    sent:deliveries.filter(d=>d.channel==="EMAIL"&&d.status==="SENT").length,
    failed:deliveries.filter(d=>d.channel==="EMAIL"&&d.status==="FAILED").length,
  }),[deliveries]);

  async function changeStatus(row,status){
    const reason=String(reasons[row.workspace_id]||"").trim();
    if(reason.length<3){setError("سبب الإجراء الإداري إلزامي.");return;}
    if(!window.confirm("تأكيد تغيير حالة مساحة المعلم إلى "+statusLabel(status)+"؟"))return;
    setBusy(true);setMessage("");setError("");
    try{
      await adminSetTeacherWorkspaceStatus(row.workspace_id,status,reason);
      setReasons(v=>({...v,[row.workspace_id]:""}));
      setMessage("تم تحديث حالة المعلم وتسجيل الإجراء في Audit Log.");await load();
    }catch(e){setError(e.message||"تعذر تحديث حالة المعلم.");}
    finally{setBusy(false);}
  }

  async function logout(){await signOut();go("/");}
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز الإدارة...</p></div>;

  return <AppShell mode="admin" subtitle="Super Admin" nav={ADMIN_NAV}
    actions={<Button kind="ghost" icon="logout" onClick={logout}>خروج</Button>}
    footer="أبو العزايم • لوحة تشغيلية للدعم والحسابات والتدقيق، وليست واجهة تعليمية.">
    <Hero eyebrow="Super Admin" title="تشغيل المنصة" description="إدارة حالة المعلمين، مراقبة Outbox، ومراجعة سجل الإجراءات بدون تصفح بيانات الأطفال اليومية." icon="shield" tone="sky"/>
    {message&&<div className="msg ok">{message}</div>}{error&&<div className="msg error">{error}</div>}
    <div className="aa-teacher-layout">
      <Metric icon="teacher" label="مساحات المعلمين" value={teachers.length} tone="sky"/>
      <Metric icon="circleCheck" label="نشطة" value={teachers.filter(t=>t.status==="active").length} tone="mint"/>
      <Metric icon="clock" label="Email Pending" value={emailStats.pending} tone="gold"/>
      <Metric icon="close" label="Email Failed" value={emailStats.failed} tone="sky"/>
    </div>

    <Section eyebrow="Teacher accounts" title="حالة المعلمين" description="التفعيل/الإيقاف إجراء استثنائي تشغيلي، وكل تغيير يحتاج سببًا ويُسجل في Audit Log.">
      {teachers.length?<div className="aa-person-list">{teachers.map(row=><article className="aa-person-card" key={row.workspace_id}>
        <div className="aa-person-head"><span className="aa-avatar"><Icon name="teacher" size={24}/></span><div>
          <b>{row.teacher_name||row.display_name||"معلم"}</b><small>{row.email||"—"} • {row.timezone||"—"} • {statusLabel(row.status)}</small>
        </div></div>
        <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800}}>سبب الإجراء
          <input value={reasons[row.workspace_id]||""} onChange={e=>setReasons(v=>({...v,[row.workspace_id]:e.target.value}))} placeholder="سبب الدعم/الإيقاف/الاستعادة"/>
        </label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
          {row.status!=="active"&&<Button onClick={()=>changeStatus(row,"active")} disabled={busy} icon="circleCheck">تفعيل/استعادة</Button>}
          {row.status!=="suspended"&&<Button kind="secondary" onClick={()=>changeStatus(row,"suspended")} disabled={busy} icon="lock">إيقاف</Button>}
        </div>
      </article>)}</div>:<Empty icon="teacher" title="لا توجد حسابات معلمين بعد"/>}
    </Section>

    <Section eyebrow="Email Outbox" title="حالة التوصيل">
      <div className="aa-metrics">
        <Metric icon="clock" label="Pending" value={emailStats.pending} tone="gold"/>
        <Metric icon="circleCheck" label="Sent" value={emailStats.sent} tone="mint"/>
        <Metric icon="close" label="Failed" value={emailStats.failed} tone="sky"/>
      </div>
      <p style={{fontSize:12,lineHeight:1.8}}>الـOutbox جاهز، لكن إرسال البريد الخارجي نفسه يحتاج ربط مزود Email ببيانات اعتماد منفصلة. لا يتم اعتبار PENDING بريدًا مُرسلًا.</p>
    </Section>

    <Section eyebrow="Audit Log" title="آخر الإجراءات الحساسة">
      {audit.length?<div className="aa-table-list">{audit.map(row=><article className="aa-table-row" key={row.id}>
        <span><Icon name="shield" size={21}/></span><div><b>{row.action}</b><small>{row.entity_type}{row.reason?" • "+row.reason:""} • {fmt(row.created_at)}</small></div><strong>{row.actor_user_id?"User":"System"}</strong>
      </article>)}</div>:<Empty icon="shield" title="لا توجد أحداث Audit بعد"/>}
    </Section>
  </AppShell>;
}
