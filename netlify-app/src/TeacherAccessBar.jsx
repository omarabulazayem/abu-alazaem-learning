import React,{useState} from "react";
import {TEACHER_PREVIEW_NAV_ITEMS} from "./accessPolicy.js";
import Icon from "./Icon.jsx";
import {Button,getLessonContext,go} from "./ui-v4.jsx";

export default function TeacherAccessBar({children}){
  const [open,setOpen]=useState(false),[lessonContext]=useState(()=>getLessonContext());
  return <div className="aa-teacher-preview-shell" dir="rtl">
    <div className="aa-preview-bar"><div className="aa-preview-bar-inner"><div className="aa-preview-status"><span><Icon name="teacher" size={20}/></span><div><b>معاينة المعلم</b><small>المعاينة لا تغيّر تقدم أي طالب</small></div></div><div className="aa-preview-actions"><Button kind="secondary" icon="teacher" onClick={()=>go("/teacher")}>لوحة المعلم</Button><Button kind={open?"soft":"ghost"} icon="quran" onClick={()=>setOpen(v=>!v)}>معاينة قسم آخر</Button></div></div>{open&&<div className="aa-preview-menu">{TEACHER_PREVIEW_NAV_ITEMS.map(([label,path])=><button key={path} onClick={()=>{go(path);setOpen(false);}}>{label}</button>)}</div>}</div>
    {lessonContext&&<div className="aa-lesson-context-bar"><strong>سياق الحصة</strong><span>سورة {lessonContext.surah||"غير محددة"}{lessonContext.number?" — الآية "+lessonContext.number:""}{lessonContext.phase?" — "+lessonContext.phase:""}</span><Button kind="secondary" onClick={()=>go("/teacher/whiteboard")}>السبورة</Button><Button kind="secondary" onClick={()=>go("/quran")}>المصحف</Button><Button kind="secondary" onClick={()=>go("/games")}>الألعاب</Button></div>}
    {children}
  </div>;
}
