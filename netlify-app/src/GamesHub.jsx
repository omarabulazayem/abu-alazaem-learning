import React,{useEffect,useState} from "react";
import {signOut} from "./api.js";
import {isChildModeActive} from "./ChildHub.jsx";
import {loadLearningViewer,learningActorReady} from "./learningViewer.js";
import {GameEngine} from "./gameEngine.js";
import {liveGamesByPack,PLANNED_GAME_DEFINITIONS,BLOCKED_CONTENT_GAME_DEFINITIONS} from "./gameRegistry.js";
import {AppShell,Button,Card,CHILD_NAV,FAMILY_NAV,Hero,Metric,Section,TEACHER_NAV,go} from "./ui-v4.jsx";

const coreGames=liveGamesByPack("quran-core").filter(g=>g.engineIntegrated);
const expansionGames=liveGamesByPack("quran-expansion").filter(g=>g.engineIntegrated);
const classicGames=liveGamesByPack("classic").filter(g=>g.engineIntegrated);
const toneByCategory={memorization:"sky",review:"mint",tajweed:"lavender",understanding:"gold",classic:"pink"};

function GameGrid({games,progress,viewer,childMode}){
  const teacher=Boolean(viewer?.teacherPreview);
  return <div className="aa-game-grid">{games.map(game=>{const p=progress.find(x=>x.game_id===game.id);return <Card key={game.id} className="aa-game-card" icon={game.icon||"game"} title={game.title} text={childMode?"جولة قصيرة. جرّب، العب، واجمع نجومك.":game.description} tone={toneByCategory[game.category]||"sky"} badge={teacher?"معاينة":p?.best_stars?`${p.best_stars}/3 نجوم`:childMode?"جاهزة":"ابدأ"} action={learningActorReady(viewer)?"العب الآن":"غير متاحة"} onClick={learningActorReady(viewer)?()=>go(game.route):undefined}><div className="aa-game-meta"><span>{game.educationalGoal||"تعلم باللعب"}</span><span>{p?.plays?`${p.plays} جولات`:"جولة جديدة"}</span></div></Card>})}</div>;
}

export default function GamesHub(){
  const [viewer,setViewer]=useState(undefined);const [progress,setProgress]=useState([]);const [error,setError]=useState("");
  useEffect(()=>{let alive=true;(async()=>{try{const context=await loadLearningViewer();if(!alive)return;if(!context.user)return go("/login");setViewer(context);if(!context.teacherPreview&&!context.child){setError("أضف طفلًا أولًا من حساب الأسرة قبل بدء الألعاب.");return;}if(context.child?.id){const rows=await GameEngine.progress(context.child.id);if(alive)setProgress(rows||[]);}}catch(e){if(alive)setError(e.message||"تعذر تحميل عالم الألعاب.");}})();return()=>{alive=false;};},[]);
  const childMode=isChildModeActive(),teacher=Boolean(viewer?.teacherPreview),child=viewer?.child||null;
  if(viewer===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز الألعاب...</p></div>;
  const mastered=progress.filter(p=>Number(p.best_stars||0)>=3).length,total=[...coreGames,...expansionGames,...classicGames].length;
  async function logout(){await signOut();go("/");}
  const mode=teacher?"teacher":childMode?"child":"family";const nav=teacher?TEACHER_NAV:childMode?CHILD_NAV:FAMILY_NAV;
  const actions=teacher?<Button kind="secondary" icon="teacher" onClick={()=>go("/teacher")}>لوحة المعلم</Button>:<>{!childMode&&<Button kind="secondary" icon="users" onClick={()=>go("/family")}>الأسرة</Button>}{!childMode&&<Button kind="ghost" icon="logout" onClick={logout}>خروج</Button>}</>;
  return <AppShell mode={mode} subtitle="عالم الألعاب" nav={nav} actions={actions} footer="أبو العزايم • اللعب هنا جزء من رحلة التعلم، مش مجرد زينة.">
    <Hero eyebrow={teacher?"معاينة المعلم":childMode?"اختار مغامرتك":"ألعاب مرتبطة بالتقدم"} title={teacher?"استكشف الألعاب قبل الطلاب":childMode?`جاهز نلعب يا ${child?.display_name||"بطلنا"}؟`:`أهلًا ${child?.display_name||"بطلنا"} في عالم الألعاب`} description={teacher?"راجع شكل ومسار الألعاب بدون تسجيل تقدم للطالب.":childMode?"اختار لعبة واحدة. كل جولة قصيرة وواضحة ومش محتاجة زحمة اختيارات.":"كل لعبة تحفظ الجلسة والنتيجة وتساعد في بناء مراجعة أذكى."} icon="game" tone="lavender"/>
    {error&&<div className="msg error">{error}</div>}
    <div className="aa-metrics"><Metric icon="game" label="ألعاب متاحة" value={total} tone="lavender"/><Metric icon="star" label="ألعاب متقنة" value={mastered} tone="gold"/><Metric icon="review" label="جولات محفوظة" value={progress.reduce((s,p)=>s+Number(p.plays||0),0)} tone="mint"/>{!childMode&&<Metric icon="lock" label="غير متاحة حاليًا" value={PLANNED_GAME_DEFINITIONS.length+BLOCKED_CONTENT_GAME_DEFINITIONS.length} tone="sky"/>}</div>
    <Section eyebrow={childMode?"ابدأ من هنا":"الأساس"} title={childMode?"مغامرات سهلة وممتعة":"الألعاب الأساسية"} description={childMode?"اختار لعبة واحدة فقط وابدأ.":"ألعاب live ومربوطة فعليًا بالمحرك."}><GameGrid games={coreGames} progress={progress} viewer={viewer} childMode={childMode}/></Section>
    {expansionGames.length>0&&<Section eyebrow="مغامرات إضافية" title={childMode?"جرّب حاجة مختلفة":"توسعة الألعاب"}><GameGrid games={expansionGames} progress={progress} viewer={viewer} childMode={childMode}/></Section>}
    {classicGames.length>0&&<Section eyebrow="جولات خفيفة" title={childMode?"للعب السريع":"ألعاب إضافية"}><GameGrid games={classicGames} progress={progress} viewer={viewer} childMode={childMode}/></Section>}
    {!childMode&&!teacher&&<Section eyebrow="الفهم" title="عالم فهم القرآن" description="المحتوى لا يظهر للطفل إلا بعد المراجعة والاعتماد."><Button kind="secondary" icon="quran" onClick={()=>go("/games/tafsir")}>دخول عالم الفهم</Button></Section>}
  </AppShell>;
}
