import React,{useEffect,useMemo,useState} from "react";
import {listNotifications,markAllNotificationsRead,markNotificationRead} from "./api.js";
import {Button,Section} from "./ui-v4.jsx";
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
  LESSON_COMPLETED:"circleCheck",
  LESSON_CANCELLED:"close",
  LESSON_RESCHEDULED:"clock",
  POINTS_CHANGED:"star"
};

export default function NotificationsPanel({userId,title="التنبيهات",limit=8}){
  const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function load(){
    if(!userId)return;
    try{setRows(await listNotifications(userId,Math.max(limit,20)));setError("");}
    catch(e){setError(e.message||"تعذر تحميل التنبيهات.");}
  }
  useEffect(()=>{
    load();
    const id=setInterval(load,30000);
    return()=>clearInterval(id);
  },[userId,limit]);
  const visible=rows.slice(0,limit);
  const unread=useMemo(()=>rows.filter(r=>!r.read_at).length,[rows]);
  async function read(id){
    setBusy(true);
    try{await markNotificationRead(id);setRows(v=>v.map(r=>r.id===id?{...r,read_at:new Date().toISOString()}:r));}
    catch(e){setError(e.message||"تعذر تحديث الإشعار.");}
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
    {visible.length?<div className="aa-notification-list">{visible.map(row=><button key={row.id} className={`aa-notification ${row.read_at?"is-read":""}`} onClick={()=>!row.read_at&&read(row.id)} disabled={busy}>
      <span><Icon name={ICONS[row.event_type]||"mail"} size={20}/></span>
      <div><b>{row.title}</b><small>{row.body}</small><em>{formatDate(row.created_at)}</em></div>
      {!row.read_at&&<i aria-label="غير مقروء"/>}
    </button>)}</div>:<div className="aa-notification-empty"><Icon name="mail" size={24}/><span>لا توجد تنبيهات جديدة حاليًا.</span></div>}
  </Section>;
}
