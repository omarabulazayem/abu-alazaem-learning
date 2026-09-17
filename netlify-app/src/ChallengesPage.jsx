import React,{useEffect,useMemo,useState} from "react";
import {getActiveChildId,getCurrentUser,listChildren,listRewardsToday} from "./api.js";
import {isChildModeActive} from "./ChildHub.jsx";
import {AppShell,Button,Card,CHILD_NAV,FAMILY_NAV,Hero,Ring,Section,go} from "./ui-v4.jsx";

const defs=[
  {id:"memorize",title:"نحفظ شوية",text:"جلسة حفظ واحدة قصيرة",icon:"quran",route:"/memorize",tone:"sky",done:rows=>rows.some(r=>r.source_type==="memorize_session")},
  {id:"review",title:"نراجع حاجة",text:"راجع سورة واحدة",icon:"review",route:"/review",tone:"mint",done:rows=>rows.some(r=>r.source_type==="review_session")},
  {id:"game",title:"نلعب لعبة",text:"جولة تعليمية واحدة",icon:"game",route:"/games",tone:"lavender",done:rows=>rows.some(r=>["game_session","memory_game","surah_order_game","surah_quiz_game"].includes(r.source_type))},
];

export default function ChallengesPage(){
  const [user,setUser]=useState(undefined),[child,setChild]=useState(null),[rewards,setRewards]=useState([]),[err,setErr]=useState("");
  useEffect(()=>{let alive=true;(async()=>{try{const current=await getCurrentUser();if(!alive)return;if(!current)return go("/login");if(current.accountType==="teacher")return;setUser(current);const kids=await listChildren(current);const selected=kids.find(k=>k.id===getActiveChildId())||kids[0]||null;if(!alive)return;setChild(selected);if(selected)setRewards(await listRewardsToday(selected.id));}catch(e){if(alive)setErr(e.message||"تعذر تحميل مهمات اليوم.");}})();return()=>{alive=false;};},[]);
  const done=useMemo(()=>defs.filter(d=>d.done(rewards)).length,[rewards]);
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز مهمات اليوم...</p></div>;
  const childMode=isChildModeActive(),progress=Math.round(done/defs.length*100);
  return <AppShell mode={childMode?"child":"family"} subtitle="مهمات اليوم" nav={childMode?CHILD_NAV:FAMILY_NAV} footer="أبو العزايم • نشاط بسيط ومستمر أفضل من حمل كبير.">
    <Hero eyebrow="مهمة اليوم" title={done===3?"برافو! خلصت كل حاجة":"ثلاث خطوات صغيرة بس"} description={child?`تقدم ${child.display_name} بيتحسب تلقائيًا من النشاط الحقيقي.`:"اختار طفلًا من حساب الأسرة."} icon="target" tone="pink" aside={<Ring value={progress} label={`${done}/3`}/>}/>
    {err&&<div className="msg error">{err}</div>}
    <Section eyebrow="من غير ضغط" title="اختار الخطوة اللي بعدها">
      <div className="aa-world-grid">{defs.map(def=>{const finished=def.done(rewards);return <Card key={def.id} className="aa-world-card" icon={finished?"circleCheck":def.icon} title={def.title} text={finished?"خلصتها النهارده، وتقدر تعمل جولة إضافية لو حابب.":def.text} tone={finished?"mint":def.tone} badge={finished?"اتعملت":"متبقية"} action={finished?"تدريب إضافي":"ابدأ"} onClick={()=>go(def.route)}/>;})}</div>
    </Section>
    <Section eyebrow="الفكرة" title="الثبات أهم من الكثرة"><Card icon="sparkle" title="جلسة قصيرة تكفي" text="حفظ بسيط + مراجعة بسيطة + لعبة قصيرة؛ كده الطفل يفضل مستمر من غير ملل." tone="gold"/></Section>
  </AppShell>;
}
