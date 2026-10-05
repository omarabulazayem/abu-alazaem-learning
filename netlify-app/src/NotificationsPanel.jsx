import React,{useEffect,useMemo,useState} from "react";
import {listNotifications,markAllNotificationsRead,markNotificationRead} from "./api.js";
import {Button,Section,go} from "./ui-v4.jsx";
import Icon from "./Icon.jsx";

function formatDate(value){
  if(!value)return "—";
  try{return new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}
  catch{return String(value);}
}

const ICONS={
  TASK_ASSIGNED:"target",
  TASK_SUBMITTED:"target",
  TASK_APPROVED:"circleCheck",
  TASK_REJECTED:"review",
  PARENT_INVITE:"mail",
  LESSON_COMPLETED:"circleCheck",
  LESSON_REMINDER:"clock",
  LESSON_CANCELLED:"close",
  LESSON_RESCHEDULED:"clock",
  POINTS_CHANGED:"star",
  SAAS_SUBSCRIPTION_CHANGED:"chart"
};

function targetPath(type,mode,metadata={}){
  if(mode==="teacher"){
    if(type==="TASK_SUBMITTED"&&metadata.assignment_id)return `/teacher/tasks?assignment=${metadata.assignment_id}`;
    if(type==="TASK_SUBMITTED")return "/teacher/tasks";
    if(type==="ENROLLMENT_ACCEPTED"&&metadata.student_id)return `/teacher/student/${metadata.student_id}`;
    if((type==="LESSON_RESCHEDULED"||type==="LESSON_CANCELLED"||type==="LESSON_COMPLETED")&&metadata.student_id)return `/teacher/student/${metadata.student_id}`;
    if(type==="POINTS_CHANGED"&&metadata.student_id)return `/teacher/student/${metadata.student_id}`;
    if(type==="SAAS_SUBSCRIPTION_CHANGED")return "/teacher/subscription";
    if(type==="ENROLLMENT_ACCEPTED"||type==="POINTS_CHANGED")return "/teacher/students";
    if(type==="LESSON_RESCHEDULED"||type==="LESSON_CANCELLED"||type==="LESSON_COMPLETED")return "/teacher/schedule";
    return "/teacher";
  }
  if(type==="PARENT_INVITE")return "/family";
  if(type==="TASK_ASSIGNED"||type==="TASK_APPROVED"||type==="TASK_REJECTED"){
    return metadata.student_id&&metadata.assignment_id?"/family?student="+metadata.student_id+"&assignment="+metadata.assignment_id:"/family";
  }
  if(type==="LESSON_REMINDER"&&metadata.student_id&&metadata.session_id)return "/family?student="+metadata.student_id+"&session="+metadata.session_id;
  if(type==="LESSON_RESCHEDULED"||type==="LESSON_CANCELLED"||type==="LESSON_COMPLETED"){
    return metadata.student_id&&metadata.session_id?"/family?student="+metadata.student_id+"&session="+metadata.session_id:"/family";
  }
  if(type==="TUITION_STATUS_CHANGED"){
    return metadata.student_id&&metadata.billing_entry_id?"/family?student="+metadata.student_id+"&billing="+metadata.billing_entry_id:"/family";
  }
  if(type==="POINTS_CHANGED"){
    return metadata.student_id&&metadata.transaction_id?"/family?student="+metadata.student_id+"&transaction="+metadata.transaction_id:"/family";
  }
  if(type==="WEEKLY_RESULT"&&metadata.student_id)return "/family?student="+metadata.student_id;
  return "/family";
}

export default function NotificationsPanel({userId,title="التنبيهات",limit=8,mode="family"}){
  const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function load(){
    if(!userId)return;
    try{setRows(await listNotifications(userId,Math.max(limit,20)));setError("");}
    catch(e){setError(e.message||"تعذر تحميل التنبيهات.");}
  }
  useEffect(()=>{
    load();
    const id=setInterval(load,30000);
    const onNotifications=()=>load();
    window.addEventListener("abu-notifications",onNotifications);
    return()=>{clearInterval(id);window.removeEventListener("abu-notifications",onNotifications);};
  },[userId,limit]);
  const visible=rows.slice(0,limit);
  const unread=useMemo(()=>rows.filter(r=>!r.read_at).length,[rows]);
  async function read(row){
    setBusy(true);
    try{
      if(!row.read_at){
        await markNotificationRead(row.id);
        setRows(v=>v.map(r=>r.id===row.id?{...r,read_at:new Date().toISOString()}:r));
      }
      const target=targetPath(row.event_type,mode,row.metadata||{});
      if(target)go(target);
    }catch(e){setError(e.message||"تعذر تحديث الإشعار.");}
    finally{setBusy(false);}
  }
  async function readAll(){
    if(!unread)return;
    setBusy(true);
    try{await markAllNotificationsRead(userId);setRows(v=>v.map(r=>r.read_at? r : {...r,read_at:new Date().toISOString()}));}
    catch(e){setError(e.message||"تعذر تحديث التنبيهات.");}
    finally{setBusy(false);}
  }
  return <Section eyebrow={unread?(`${unread} جديد`):"آخر التنبيهات"} title={title} action={unread?<Button kind="secondary" onClick={readAll} disabled={busy}>تحديد الكل كمقروء</Button>:null}>
    {error&&<div className="msg error">{error}</div>}
    {visible.length?<div className="aa-notification-list">{visible.map(row=><button key={row.id} className={`aa-notification ${row.read_at?"is-read":""}`} onClick={()=>read(row)} disabled={busy}>
      <span><Icon name={ICONS[row.event_type]||"mail"} size={20}/></span>
      <div><b>{row.title}</b><small>{row.body}</small><em>{formatDate(row.created_at)}</em></div>
      {!row.read_at&&<i aria-label="غير مقروء"/>}
    </button>)}</div>:<div className="aa-notification-empty"><Icon name="mail" size={24}/><span>لا توجد تنبيهات جديدة حاليًا.</span></div>}
  </Section>;
}
