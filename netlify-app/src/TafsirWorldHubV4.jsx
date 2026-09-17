import React,{useEffect,useState} from "react";
import {loadLearningViewer} from "./learningViewer.js";
import {getApprovedTafsirQuestions,TAFSIR_GAME_DEFINITIONS,tafsirGamesByWorld} from "./tafsirContent.js";
import {isChildModeActive} from "./ChildHub.jsx";
import {AppShell,Button,Card,CHILD_NAV,FAMILY_NAV,Hero,Metric,Section,go} from "./ui-v4.jsx";

const worlds=[
  {id:"garden",title:"حديقة المعاني",text:"نفهم الكلمات والمعاني من محتوى مراجع.",icon:"sparkle",tone:"mint"},
  {id:"stories",title:"مدينة القصص",text:"السياق والقصص لا تظهر إلا بعد التوثيق والمراجعة.",icon:"books",tone:"sky"},
  {id:"lab",title:"مختبر الفهم",text:"نفهم العلاقات والسياق من المصدر، بدون تخمين.",icon:"brain",tone:"lavender"},
  {id:"treasure",title:"كنز الهدايات",text:"نحوّل الفهم المراجع إلى هداية تعليمية بسيطة.",icon:"gift",tone:"gold"},
];

export default function TafsirWorldHubV4(){
  const [viewer,setViewer]=useState(undefined);const [approved,setApproved]=useState({});
  useEffect(()=>{let alive=true;(async()=>{const context=await loadLearningViewer();if(!alive)return;if(!context.user)return go("/login");setViewer(context);const counts={};for(const game of TAFSIR_GAME_DEFINITIONS.slice(0,4)){try{const rows=await getApprovedTafsirQuestions({gameId:game.id,child:context.child,limit:1});counts[game.id]=rows.length;}catch{counts[game.id]=0;}}if(alive)setApproved(counts);})();return()=>{alive=false;};},[]);
  if(viewer===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز عالم فهم القرآن...</p></div>;
  const childMode=isChildModeActive(),available=TAFSIR_GAME_DEFINITIONS.slice(0,4).filter(g=>approved[g.id]).length;
  return <AppShell mode={childMode?"child":"family"} subtitle="عالم فهم القرآن" nav={childMode?CHILD_NAV:FAMILY_NAV} actions={<Button kind="secondary" icon="game" onClick={()=>go("/games")}>كل الألعاب</Button>} footer="أبو العزايم • الفهم هنا يعتمد على محتوى مراجع ومصدر واضح.">
    <Hero eyebrow="فهم موثق قبل اللعب" title="نفهم المعنى من غير ما نخترع تفسيرًا" description="كل نشاط يعتمد على مصدر ومرجع، ثم تبسيط منفصل للطفل، ثم مراجعة واعتماد قبل النشر." icon="shield" tone="mint"/>
    <div className="aa-metrics"><Metric icon="shield" label="سياسة العرض" value="Approved فقط" tone="mint"/><Metric icon="game" label="ألعاب جاهزة بالمحتوى" value={available} tone="lavender"/><Metric icon="books" label="عوالم الفهم" value={worlds.length} tone="sky"/><Metric icon="lock" label="غير المراجع" value="مخفي" tone="gold"/></div>
    <Section eyebrow="أربعة عوالم" title="اختار طريقة الفهم"><div className="aa-badge-grid">{worlds.map(w=><Card key={w.id} icon={w.icon} title={w.title} text={`${w.text} • ${tafsirGamesByWorld(w.id).length} أفكار ألعاب.`} tone={w.tone}/>)}</div></Section>
    <Section eyebrow="المتاح فعليًا" title="ألعاب الفهم الأولى" description="اللعبة لا تفتح إلا لو عندها سؤال Approved في قاعدة البيانات."><div className="aa-game-grid">{TAFSIR_GAME_DEFINITIONS.slice(0,4).map(game=>{const open=Boolean(approved[game.id]);return <Card key={game.id} className="aa-game-card" icon={open?"unlock":"lock"} title={game.title} text={game.mechanic} tone={open?"mint":"plain"} badge={game.worldLabel} action={open?"ابدأ":"بانتظار محتوى مراجع"} onClick={open?()=>go(game.route):undefined}/>})}</div></Section>
  </AppShell>;
}
