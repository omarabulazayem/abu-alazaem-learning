import React from "react";
import Icon from "./Icon.jsx";
import {getStoredSession,listNotifications} from "./api.js";

export const LESSON_CONTEXT_KEY="abu-alazaem-lesson-context-v1";
export function getLessonContext(){try{return JSON.parse(localStorage.getItem(LESSON_CONTEXT_KEY)||"null");}catch{return null;}}
export function saveLessonContext(context){try{if(context)localStorage.setItem(LESSON_CONTEXT_KEY,JSON.stringify(context));else localStorage.removeItem(LESSON_CONTEXT_KEY);}catch{}}

export function routePath(){
  return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;
}
export function go(path){
  const target=new URL(path,window.location.href);
  const currentKey=routePath()+(window.location.search||"");
  const targetKey=target.pathname+(target.search||"");
  if(currentKey===targetKey)return;
  history.pushState({},"",path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const CHILD_NAV=[
  {path:"/child",label:"عالمي",icon:"home"},
  {path:"/memorize",label:"نحفظ",icon:"quran"},
  {path:"/games",label:"نلعب",icon:"game"},
  {path:"/review",label:"نراجع",icon:"review"},
  {path:"/room",label:"غرفتي",icon:"room"},
];

export const FAMILY_NAV=[
  {path:"/",label:"الرئيسية",icon:"home"},
  {path:"/family",label:"الأسرة",icon:"family"},
  {path:"/quran",label:"القرآن",icon:"quran"},
  {path:"/achievements",label:"الإنجازات",icon:"trophy"},
  {path:"/leaderboard",label:"الترتيب",icon:"medal"},
];

export const ADMIN_NAV=[
  {path:"/admin",label:"الخطط",icon:"chart"},
];

export const TEACHER_NAV=[
  {path:"/teacher",label:"نظرة عامة",icon:"teacher"},
  {path:"/teacher/invites",label:"الدعوات",icon:"mail"},
  {path:"/teacher/students",label:"الطلاب",icon:"users"},
  {path:"/teacher/tasks",label:"المهام",icon:"target"},
  {path:"/teacher/schedule",label:"الجدول",icon:"clock"},
  {path:"/teacher/billing",label:"الاستحقاقات",icon:"chart"},
  {path:"/teacher/leaderboard",label:"الترتيب",icon:"medal"},
  {path:"/teacher/game-reports",label:"تقارير الألعاب",icon:"game"},
  {path:"/teacher/whiteboard",label:"السبورة",icon:"edit"},
];

export function Brand({subtitle="للحفظ الممتع",onClick=()=>go("/")}){
  return <button className="aa-brand" onClick={onClick}>
    <span className="aa-brand-mark"><Icon name="mosque" size={28}/></span>
    <span><b>أبو العزايم</b><small>{subtitle}</small></span>
  </button>;
}

function TeacherLessonDock(){
  const context=getLessonContext();
  if(!context)return null;
  const surah=context.surah||"غير محددة";
  const ayah=context.number||context.ayah||null;
  return <div className="aa-teacher-lesson-dock" role="region" aria-label="أدوات الحصة">
    <div className="aa-teacher-lesson-current"><span><Icon name="teacher" size={18}/></span><div><small>الحصة الحالية</small><b>سورة {surah}{ayah?" • الآية "+ayah:""}{context.gameTitle?" • "+context.gameTitle:""}</b></div></div>
    <div className="aa-teacher-lesson-actions">
      <button onClick={()=>go("/teacher/whiteboard")} className={routePath()==="/teacher/whiteboard"?"is-active":""}><Icon name="edit" size={17}/><span>السبورة</span></button>
      <button onClick={()=>go("/quran")} className={routePath()==="/quran"?"is-active":""}><Icon name="quran" size={17}/><span>المصحف</span></button>
      <button onClick={()=>go("/games")} className={routePath()==="/games"?"is-active":""}><Icon name="game" size={17}/><span>الألعاب</span></button>
    </div>
  </div>;
}
function NotificationBell({mode}){
  const [unread,setUnread]=React.useState(0);
  const target=mode==="teacher"?"/teacher":"/family";
  async function load(){
    const session=getStoredSession();
    const userId=session?.user?.id;
    if(!userId){setUnread(0);return;}
    try{
      const rows=await listNotifications(userId,100);
      setUnread(rows.filter(row=>!row.read_at).length);
    }catch{setUnread(0);}
  }
  React.useEffect(()=>{
    load();
    const timer=setInterval(load,30000);
    const onAuth=()=>load();
    const onNotifications=()=>load();
    window.addEventListener("abu-auth",onAuth);
    window.addEventListener("abu-notifications",onNotifications);
    return()=>{clearInterval(timer);window.removeEventListener("abu-auth",onAuth);window.removeEventListener("abu-notifications",onNotifications);};
  },[]);
  return <button className="aa-notification-bell" type="button" aria-label={unread ? "التنبيهات • "+unread+" جديدة" : "التنبيهات"} onClick={()=>go(target)}>
    <Icon name="mail" size={20}/>
    <span>التنبيهات</span>
    {unread>0&&<b>{unread>99?"99+":unread}</b>}
  </button>;
}
export function AppShell({mode="public",subtitle,nav=[],actions,children,footer="رحلة هادئة وواضحة مع القرآن.",hideNav=false}){
  const current=routePath();
  return <div className={`aa-app aa-mode-${mode}`} dir="rtl">
    <header className="aa-header">
      <div className="aa-header-inner">
        <Brand subtitle={subtitle||({child:"عالم الطفل",teacher:"بوابة المعلم",family:"حساب الأسرة",admin:"إدارة المنصة"}[mode]||"للحفظ الممتع")} onClick={()=>go(mode==="child"?"/child":mode==="teacher"?"/teacher":"/")}/>
        {!hideNav&&nav.length>0&&<nav className="aa-nav" aria-label="التنقل الرئيسي">
          {nav.map(item=><button key={item.path} className={current===item.path?"is-active":""} onClick={()=>go(item.path)}><Icon name={item.icon||"arrow"} size={20}/><span>{item.label}</span></button>)}
        </nav>}
        {(mode==="teacher"||mode==="family")&&<NotificationBell mode={mode}/>}<div className="aa-header-actions">{actions}</div>
      </div>
    </header>
    <main className="aa-main">{mode==="teacher"&&<TeacherLessonDock/>}{children}</main>
    <footer className="aa-footer"><div>{footer}</div></footer>
    {mode==="child"&&<nav className="aa-bottom-nav" aria-label="تنقل الطفل">{CHILD_NAV.map(item=><button key={item.path} className={current===item.path?"is-active":""} onClick={()=>go(item.path)}><Icon name={item.icon} size={22}/><span>{item.label}</span></button>)}</nav>}
  </div>;
}

export function Hero({eyebrow,title,description,icon="sparkle",tone="sky",actions,aside,children}){
  return <section className={`aa-hero aa-tone-${tone}`}>
    <div className="aa-hero-copy">
      {eyebrow&&<span className="aa-eyebrow"><Icon name={icon} size={17}/>{eyebrow}</span>}
      <h1>{title}</h1>
      {description&&<p>{description}</p>}
      {actions&&<div className="aa-hero-actions">{actions}</div>}
      {children}
    </div>
    {aside&&<div className="aa-hero-aside">{aside}</div>}
  </section>;
}

export function Section({eyebrow,title,description,action,children,className=""}){
  return <section className={`aa-section ${className}`}>
    {(title||eyebrow||action)&&<div className="aa-section-head"><div>{eyebrow&&<span>{eyebrow}</span>}{title&&<h2>{title}</h2>}{description&&<p>{description}</p>}</div>{action&&<div>{action}</div>}</div>}
    {children}
  </section>;
}

export function Card({icon,title,text,tone="plain",badge,action,onClick,children,className=""}){
  const Tag=onClick?"button":"article";
  return <Tag className={`aa-card aa-card-${tone} ${onClick?"aa-card-clickable":""} ${className}`} onClick={onClick}>
    <div className="aa-card-top">{icon&&<span className="aa-card-icon"><Icon name={icon} size={30}/></span>}{badge&&<span className="aa-card-badge">{badge}</span>}</div>
    {title&&<h3>{title}</h3>}
    {text&&<p>{text}</p>}
    {children}
    {action&&<span className="aa-card-action">{action}<Icon name="arrow" size={17}/></span>}
  </Tag>;
}

export function Metric({icon,label,value,tone="sky"}){
  return <article className={`aa-metric aa-tone-${tone}`}><span><Icon name={icon} size={22}/></span><div><b>{value}</b><small>{label}</small></div></article>;
}

export function Empty({icon="sparkle",title,text,action}){
  return <div className="aa-empty"><span><Icon name={icon} size={38}/></span><h3>{title}</h3>{text&&<p>{text}</p>}{action}</div>;
}

export function ProgressBar({value=0,label}){
  const safe=Math.max(0,Math.min(100,Number(value)||0));
  return <div className="aa-progress-wrap">{label&&<div className="aa-progress-label"><span>{label}</span><b>{safe}%</b></div>}<div className="aa-progress"><i style={{width:`${safe}%`}}/></div></div>;
}

export function Ring({value=0,label}){
  const safe=Math.max(0,Math.min(100,Number(value)||0));
  return <div className="aa-ring" style={{"--aa-ring":`${safe*3.6}deg`}}><div><b>{safe}%</b><span>{label}</span></div></div>;
}

export function Button({children,kind="primary",icon,onClick,disabled,className="",type="button"}){
  return <button type={type} className={`aa-btn aa-btn-${kind} ${className}`} onClick={onClick} disabled={disabled}>{icon&&<Icon name={icon} size={18}/>}<span>{children}</span></button>;
}
