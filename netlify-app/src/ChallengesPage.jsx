import React, { useEffect, useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import { getActiveChildId, getCurrentUser, listChildren, listRewardsToday } from "./api.js";

function routePath(){return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;}
function navigate(path){if(routePath()!==path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}}

const challengeDefs=[
  {id:"memorize",title:"جلسة حفظ",text:"أكمل جلسة حفظ واحدة اليوم",icon:"quran",route:"/memorize",tone:"sky",done:rows=>rows.some(r=>r.source_type==="memorize_session")},
  {id:"review",title:"جلسة مراجعة",text:"راجع سورة واحدة وثبّت الحفظ",icon:"review",route:"/review",tone:"mint",done:rows=>rows.some(r=>r.source_type==="review_session")},
  {id:"game",title:"لعبة تعليمية",text:"أكمل لعبة واحدة من منطقة الألعاب",icon:"game",route:"/games",tone:"lavender",done:rows=>rows.some(r=>["game_session","memory_game","surah_order_game","surah_quiz_game"].includes(r.source_type))},
];

export default function ChallengesPage(){
  const [user,setUser]=useState(undefined);const [child,setChild]=useState(null);const [rewards,setRewards]=useState([]);const [err,setErr]=useState("");
  useEffect(()=>{let alive=true;(async()=>{try{const current=await getCurrentUser();if(!alive)return;if(!current)return navigate("/login");if(current.accountType==="teacher")return;setUser(current);const kids=await listChildren(current);const selected=kids.find(k=>k.id===getActiveChildId())||kids[0]||null;if(!alive)return;setChild(selected);if(selected)setRewards(await listRewardsToday(selected.id));}catch(e){if(alive)setErr(e.message||"تعذر تحميل تحديات اليوم.");}})();return()=>{alive=false;};},[]);
  const doneCount=useMemo(()=>challengeDefs.filter(c=>c.done(rewards)).length,[rewards]);
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز التحديات...</p></div>;
  const progress=Math.round(doneCount/challengeDefs.length*100);
  return <div className="app challenges-v2" dir="rtl"><header className="challenge-topbar"><div className="wrap nav"><button className="brand" onClick={()=>navigate("/")}><span className="logo"><Icon name="target" size={22}/></span><span><b>تحديات اليوم</b><small>خطوات صغيرة يومية</small></span></button><div className="actions"><button className="secondary" onClick={()=>navigate("/child")}><Icon name="child" size={17}/> وضع الطفل</button><button className="secondary" onClick={()=>navigate("/games")}><Icon name="game" size={17}/> الألعاب</button></div></div></header><main className="wrap page challenge-page"><section className="challenge-hero"><div><span className="challenge-kicker"><Icon name="target" size={18}/> هدف اليوم</span><h1>{doneCount===3?"أحسنت! أنهيت تحديات اليوم":"ثلاث خطوات تصنع فرقًا"}</h1><p>{child?`تقدم ${child.display_name} اليوم محفوظ تلقائيًا من النشاط الحقيقي.`:"اختر طفلًا من حساب الأسرة لبدء التحديات."}</p></div><div className="challenge-progress"><div style={{"--progress":`${progress}%`}}><strong>{doneCount}/3</strong><span>مكتمل</span></div></div></section>{err&&<div className="msg error">{err}</div>}<section className="challenge-grid-v2">{challengeDefs.map(def=>{const done=def.done(rewards);return <article className={`challenge-card-v2 ${def.tone} ${done?"done":""}`} key={def.id}><span className="challenge-icon"><Icon name={done?"check":def.icon} size={31}/></span><div className="grow"><small>{done?"مكتمل اليوم":"متبقي"}</small><h2>{def.title}</h2><p>{def.text}</p></div><button className={done?"secondary":"primary"} onClick={()=>navigate(def.route)}><Icon name={done?"review":"arrow"} size={17}/>{done?"تدريب إضافي":"ابدأ الآن"}</button></article>;})}</section><section className="challenge-tip"><span><Icon name="sparkle" size={26}/></span><div><b>الثبات أهم من الكثرة</b><p>جلسة قصيرة يومية للحفظ والمراجعة واللعب تساعد الطفل على الاستمرار بدون ضغط أو ملل.</p></div></section></main><footer><div className="wrap">أبو العزايم للحفظ الممتع • نشاط يومي بسيط يصنع عادة قوية.</div></footer></div>;
}
