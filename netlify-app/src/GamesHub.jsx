import React, { useEffect, useState } from "react";
import { signOut } from "./api.js";
import { isChildModeActive } from "./ChildHub.jsx";
import { loadLearningViewer, learningActorReady } from "./learningViewer.js";
import { GameEngine } from "./gameEngine.js";
import { liveGamesByPack, PLANNED_GAME_DEFINITIONS, BLOCKED_CONTENT_GAME_DEFINITIONS } from "./gameRegistry.js";
import Icon from "./Icon.jsx";

function routePath(){return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;}
function navigate(path){if(routePath()!==path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}}

const toneByScene={
  wheel:"sky",bridge:"sky",kitchen:"rose",station:"sun",lab:"lavender",vault:"lavender",cards:"mint",
  "word-field":"mint",matching:"sky",library:"mint","memory-room":"lavender",workshop:"rose","exam-hall":"rose",
  "star-forest":"sky","lavender-tower":"lavender","three-roads":"mint","puzzle-table":"rose","memory-race":"sky",
  "treasure-map":"sun","mirror-room":"lavender","surah-gates":"sky","mystery-boxes":"rose","word-box":"sun",classic:"sky"
};
const coreGames=liveGamesByPack("quran-core").filter(game=>game.engineIntegrated);
const expansionGames=liveGamesByPack("quran-expansion").filter(game=>game.engineIntegrated);
const classicGames=liveGamesByPack("classic").filter(game=>game.engineIntegrated);

function ZoneGrid({games,progress,viewer}){
  const teacherPreview=Boolean(viewer?.teacherPreview);
  return <div className="world-map-grid">{games.map((game,index)=>{const p=progress.find(x=>x.game_id===game.id);return <button key={game.id} className={`world-zone ${toneByScene[game.scene]||"sky"}`} disabled={!learningActorReady(viewer)} onClick={()=>navigate(game.route)}><span className="zone-number">{String(index+1).padStart(2,"0")}</span><span className="zone-icon"><Icon name={game.icon||"game"} size={42}/></span><span className="zone-copy"><small>{game.educationalGoal||"لعبة تعليمية"}</small><b>{game.title}</b><p>{game.description}</p></span><span className="zone-progress">{teacherPreview?"معاينة":p?.best_stars?`${p.best_stars}/3 نجوم`:"ابدأ أول جولة"}<Icon name="arrow" size={18}/></span></button>})}</div>;
}

export default function GamesHub(){
  const [viewer,setViewer]=useState(undefined);const [progress,setProgress]=useState([]);const [error,setError]=useState("");
  useEffect(()=>{let alive=true;(async()=>{try{const context=await loadLearningViewer();if(!alive)return;if(!context.user)return navigate("/login");setViewer(context);if(!context.teacherPreview&&!context.child){setError("أضف طفلًا أولًا من حساب الأسرة قبل بدء الألعاب.");return;}if(context.child?.id){const rows=await GameEngine.progress(context.child.id);if(alive)setProgress(rows||[]);}}catch(e){if(alive)setError(e.message||"تعذر تحميل عالم الألعاب.");}})();return()=>{alive=false;};},[]);
  const childMode=isChildModeActive();const teacherPreview=Boolean(viewer?.teacherPreview);const child=viewer?.child||null;
  async function logout(){await signOut();navigate("/");}
  if(viewer===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز عالم الألعاب...</p></div>;
  const mastered=progress.filter(p=>Number(p.best_stars||0)>=3).length;
  const engineGames=[...coreGames,...expansionGames,...classicGames];
  return <div className="app game-shell game-shell-v2 game-world" dir="rtl">
    <header className="game-topbar"><div className="wrap nav"><button className="brand" onClick={()=>navigate(teacherPreview?"/teacher":childMode?"/child":"/")}><span className="logo"><Icon name="game" size={24}/></span><span><b>أبو العزايم</b><small>عالم ألعاب القرآن</small></span></button><div className="actions">{teacherPreview?<span className="reward-chip"><Icon name="teacher" size={17}/> معاينة المعلم</span>:<><span className="reward-chip"><Icon name="star" size={17}/> {child?.stars||0}</span><span className="reward-chip"><Icon name="trophy" size={17}/> {child?.points||0}</span></>}<button className="secondary" onClick={()=>navigate(teacherPreview?"/teacher":childMode?"/child":"/family")}>{teacherPreview?"لوحة المعلم":childMode?"وضع الطفل":"حساب الأسرة"}</button>{!childMode&&<button className="secondary" onClick={logout}><Icon name="logout" size={16}/> خروج</button>}</div></div></header>
    <main className="wrap page">
      <section className="game-world-hero"><div><span className="game-kicker"><Icon name="quran" size={18}/> منظومة ألعاب مرتبطة بالحفظ</span><h1>{teacherPreview?"استكشف عالم الألعاب قبل الطلاب":`أهلًا ${child?.display_name||"بطلنا"} في عالم القرآن`}</h1><p>{teacherPreview?"كل لعبة مرتبطة بالمحرك تعمل في وضع معاينة بلا كتابة بيانات. ألعاب الطالب تسجل الجلسات والإجابات والأخطاء والآيات التي تحتاج مراجعة.":"اختَر لعبة وابدأ. GameEngine يحفظ الجلسة والإجابات والتقدم، ويحوّل أخطاء الآيات إلى مراجعة فعلية عندما يكون السؤال مرتبطًا بآية."}</p><div className="game-world-stats"><span><b>{engineGames.length}</b> ألعاب مرتبطة بـGameEngine</span><span><b>{mastered}</b> ألعاب وصلت فيها إلى 3 نجوم</span><span><b>{PLANNED_GAME_DEFINITIONS.length + BLOCKED_CONTENT_GAME_DEFINITIONS.length}</b> ألعاب غير متاحة حاليًا</span></div></div><div className="world-orbit" aria-hidden="true"><span><Icon name="quran" size={38}/></span><span><Icon name="target" size={34}/></span><span><Icon name="memory" size={36}/></span><span><Icon name="star" size={30}/></span></div></section>
      {error&&<div className="msg error">{error}</div>}
      <section className="world-section"><div className="world-heading"><div><span>المنظومة الأساسية</span><h2>ألعاب القرآن المكتملة</h2><p>هذه القائمة تأتي مباشرة من Game Registry؛ ولا تظهر أي لعبة إلا عندما تكون حالتها live.</p></div></div><ZoneGrid games={coreGames} progress={progress} viewer={viewer}/></section>
      {expansionGames.length>0&&<section className="world-section"><div className="world-heading"><div><span>توسعة الألعاب</span><h2>مغامرات إضافية مرتبطة بالمحرك</h2><p>لا تظهر هنا إلا الألعاب التي لديها Route وتعريف وربط فعلي بـGameEngine.</p></div><button className="secondary" onClick={()=>navigate("/games/new-pack")}>عرض الحزمة فقط</button></div><ZoneGrid games={expansionGames} progress={progress} viewer={viewer}/></section>}
      {classicGames.length>0&&<section className="world-section classic-zone"><div className="world-heading"><div><span>ألعاب إضافية</span><h2>الألعاب الكلاسيكية بعد الترحيل</h2><p>الذاكرة وترتيب السور واختبار السور أصبحت تستخدم GameEngine نفسه، بما في ذلك الجلسات والتقدم والمكافآت.</p></div></div><ZoneGrid games={classicGames} progress={progress} viewer={viewer}/></section>}
      <section className="world-section tafsir-entry"><div className="world-heading"><div><span>عالم فهم القرآن</span><h2>من الحفظ إلى الفهم الموثق</h2><p>منطقة مستقلة للتفسير والفهم؛ لا تعرض للطفل إلا أسئلة مرتبطة بمصدر، وتبسيط منفصل، وحالة Approved. أول أربع ميكانيكيات مبنية وتفتح تلقائيًا عندما يصلها محتوى مراجع.</p></div><button className="secondary" onClick={()=>navigate("/games/tafsir")}><Icon name="quran" size={18}/> دخول عالم الفهم</button></div></section>
      <section className="mini-tip"><span className="tip-icon"><Icon name="lightbulb" size={25}/></span><div><b>مصدر واحد لتوفر ألعاب الحفظ</b><p>GamesHub يعتمد على Game Registry الموحد لألعاب الحفظ، بينما عالم الفهم يبقى Content-Gated ولا يتحول إلى محتوى طفل إلا بعد المراجعة والاعتماد.</p></div></section>
    </main><footer><div className="wrap">أبو العزايم للحفظ الممتع • الألعاب المتاحة مرتبطة بتعريف موحد ويمكن تتبع تقدمها بوضوح.</div></footer>
  </div>;
}