import React,{useEffect,useMemo,useState} from "react";
import {getCurrentUser,listNotifications,markAllNotificationsRead,markNotificationRead} from "./api.js";
import Icon from "./Icon.jsx";
import {ADMIN_NAV,AppShell,Button,Empty,FAMILY_NAV,Hero,Section,TEACHER_NAV,go} from "./ui-v4.jsx";

const TYPE_LABELS={
  parent_invite:"دعوة معلم",lesson_reminder:"تذكير حصة",lesson_rescheduled:"تغيير موعد",lesson_cancelled:"إلغاء حصة",
  new_task:"مهمة جديدة",task_submitted:"تسليم مهمة",task_approved:"اعتماد مهمة",task_rejected:"رفض مهمة",
  points_reversed:"تصحيح نقاط",weekly_result:"نتيجة الأسبوع",tuition_status_change:"الاستحقاقات",
  teacher_account_status:"حالة الحساب"
};
function fmt(value){try{return new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch{return value||"";}}

export default function NotificationsPage(){
  const [user,setUser]=useState(undefined),[rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function load(){
    try{setRows(await listNotifications(150));setError("");}
    catch(e){setError(e.message||"تعذر تحميل الإشعارات.");}
  }
  useEffect(()=>{let alive=true;(async()=>{try{
    const current=await getCurrentUser();if(!alive)return;if(!current)return go("/login");
    setUser(current);const list=await listNotifications(150);if(alive)setRows(list||[]);
  }catch(e){if(alive)setError(e.message||"تعذر تحميل الإشعارات.");}})();return()=>{alive=false;};},[]);
  const unread=useMemo(()=>rows.filter(r=>!r.read_at).length,[rows]);

  async function read(row){
    if(row.read_at){if(row.action_path)go(row.action_path);return;}
    setBusy(true);try{await markNotificationRead(row.id);await load();if(row.action_path)go(row.action_path);}
    catch(e){setError(e.message||"تعذر تحديث الإشعار.");}finally{setBusy(false);}
  }
  async function readAll(){
    setBusy(true);try{await markAllNotificationsRead();await load();}
    catch(e){setError(e.message||"تعذر تحديث الإشعارات.");}finally{setBusy(false);}
  }

  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تحميل الإشعارات...</p></div>;
  const mode=user.accountType==="teacher"?"teacher":user.accountType==="admin"?"admin":"family";
  const nav=user.accountType==="teacher"?TEACHER_NAV:user.accountType==="admin"?ADMIN_NAV:FAMILY_NAV;
  return <AppShell mode={mode} subtitle="الإشعارات" nav={nav} footer="أبو العزايم • الأحداث منفصلة عن قنوات التوصيل.">
    <Hero eyebrow="In-app Notifications" title="الإشعارات" description={"لديك "+unread+" إشعار غير مقروء."} icon="mail" tone="sky"
      actions={unread?<Button kind="secondary" onClick={readAll} disabled={busy} icon="circleCheck">تحديد الكل كمقروء</Button>:null}/>
    {error&&<div className="msg error">{error}</div>}
    <Section eyebrow="آخر الأحداث" title="الوارد">
      {rows.length?<div className="aa-person-list">{rows.map(row=><article className="aa-person-card" key={row.id} style={{opacity:row.read_at?.85:1}}>
        <div className="aa-person-head"><span className="aa-avatar"><Icon name={row.read_at?"mail":"sparkle"} size={23}/></span><div>
          <b>{row.title}</b><small>{TYPE_LABELS[row.event_type]||row.event_type} • {fmt(row.created_at)}</small>
        </div></div>
        <p style={{margin:"8px 0",fontSize:13,lineHeight:1.8}}>{row.body}</p>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <strong>{row.read_at?"مقروء":"جديد"}</strong>
          <Button kind={row.read_at?"ghost":"secondary"} onClick={()=>read(row)} disabled={busy} icon={row.action_path?"arrow":"circleCheck"}>
            {row.action_path?"فتح":"تمت القراءة"}
          </Button>
        </div>
      </article>)}</div>:<Empty icon="mail" title="لا توجد إشعارات بعد"/>}
    </Section>
  </AppShell>;
}
