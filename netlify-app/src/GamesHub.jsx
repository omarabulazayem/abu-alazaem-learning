import React, { useEffect, useState } from "react";
import { signOut } from "./api.js";
import { isChildModeActive } from "./ChildHub.jsx";
import { loadLearningViewer, learningActorReady } from "./learningViewer.js";
import { GameEngine } from "./gameEngine.js";
import Icon from "./Icon.jsx";

function routePath(){return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;}
function navigate(path){if(routePath()!==path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}}

const quranWorld=[
  {id:"quran-wheel",icon:"target",title:"ساحة العجلة",subtitle:"العجلة الدوارة",description:"العجلة تختار سورة وتحديًا من الحفظ الحقيقي.",route:"/games/quran-wheel",tone:"sky"},
  {id:"ayah-order",icon:"order",title:"مكتبة الترتيب",subtitle:"ترتيب الآيات",description:"اسحب الآيات باللمس حتى تعود إلى ترتيبها في QuranData.",route:"/games/ayah-order",tone:"mint"},
  {id:"complete-ayah",icon:"edit",title:"ورشة الآيات",subtitle:"إكمال الآية",description:"استرجع الكلمة الناقصة من النص القرآني المرجعي.",route:"/games/complete-ayah",tone:"rose"},
  {id:"quick-memory",icon:"memory",title:"غرفة الذاكرة",subtitle:"الذاكرة السريعة",description:"شاهد الآية لثوانٍ ثم استرجع الكلمة المفقودة.",route:"/games/quick-memory",tone:"lavender"},
];

const classicGames=[
  {id:"classic-memory",icon:"brain",title:"لعبة الذاكرة",description:"طابق البطاقات المتشابهة بأقل عدد من المحاولات.",route:"/games/memory"},
  {id:"classic-surah-order",icon:"puzzle",title:"رتّب السور",description:"اختبر معرفتك بترتيب السور في المصحف.",route:"/games/order"},
  {id:"classic-surah-quiz",icon:"bolt",title:"اختبار السور",description:"خمسة أسئلة سريعة عن السور وأرقامها.",route:"/games/quiz"},
];

export default function GamesHub(){
  const [viewer,setViewer]=useState(undefined);const [progress,setProgress]=useState([]);const [error,setError]=useState("");
  useEffect(()=>{let alive=true;(async()=>{try{const context=await loadLearningViewer();if(!alive)return;if(!context.user)return navigate("/login");setViewer(context);if(!context.teacherPreview&&!context.child){setError("أضف طفلًا أولًا من حساب الأسرة قبل بدء الألعاب.");return;}if(context.child?.id){const rows=await GameEngine.progress(context.child.id);if(alive)setProgress(rows||[]);}}catch(e){if(alive)setError(e.message||"تعذر تحميل عالم الألعاب.");}})();return()=>{alive=false;};},[]);
  const childMode=isChildModeActive();const teacherPreview=Boolean(viewer?.teacherPreview);const child=viewer?.child||null;
  async function logout(){await signOut();navigate("/");}
  if(viewer===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز عالم الألعاب...</p></div>;
  const mastered=progress.filter(p=>Number(p.best_stars||0)>=3).length;
  return <div className="app game-shell game-shell-v2 game-world" dir="rtl">
    <header className="game-topbar"><div className="wrap nav"><button className="brand" onClick={()=>navigate(teacherPreview?"/teacher":childMode?"/child":"/")}><span className="logo"><Icon name="game" size={24}/></span><span><b>أبو العزايم</b><small>عالم ألعاب القرآن</small></span></button><div className="actions">{teacherPreview?<span className="reward-chip"><Icon name="teacher" size={17}/> معاينة المعلم</span>:<><span className="reward-chip"><Icon name="star" size={17}/> {child?.stars||0}</span><span className="reward-chip"><Icon name="trophy" size={17}/> {child?.points||0}</span></>}<button className="secondary" onClick={()=>navigate(teacherPreview?"/teacher":childMode?"/child":"/family")}>{teacherPreview?"لوحة المعلم":childMode?"وضع الطفل":"حساب الأسرة"}</button>{!childMode&&<button className="secondary" onClick={logout}><Icon name="logout" size={16}/> خروج</button>}</div></div></header>
    <main className="wrap page">
      <section className="game-world-hero"><div><span className="game-kicker"><Icon name="quran" size={18}/> منظومة ألعاب مرتبطة بالحفظ</span><h1>{teacherPreview?"استكشف عالم الألعاب قبل الطلاب":`أهلًا ${child?.display_name||"بطلنا"} في عالم القرآن`}</h1><p>{teacherPreview?"كل لعبة جديدة تعمل في وضع معاينة بلا كتابة بيانات. ألعاب الطالب تسجل الإجابات الصحيحة والأخطاء والآيات التي تحتاج مراجعة.":"اختَر منطقة وابدأ اللعب. النظام يتذكر أين أخطأت وأين أتقنت ليقترح مراجعة أفضل في المرات القادمة."}</p><div className="game-world-stats"><span><b>{quranWorld.length}</b> ألعاب قرآنية بالمحرك الجديد</span><span><b>{mastered}</b> ألعاب وصلت فيها إلى 3 نجوم</span><span><b>{progress.length}</b> ألعاب لها سجل تقدم</span></div></div><div className="world-orbit" aria-hidden="true"><span><Icon name="quran" size={38}/></span><span><Icon name="target" size={34}/></span><span><Icon name="memory" size={36}/></span><span><Icon name="star" size={30}/></span></div></section>
      {error&&<div className="msg error">{error}</div>}
      <section className="world-section"><div className="world-heading"><div><span>المناطق المفتوحة الآن</span><h2>ألعاب تعتمد على QuranData</h2><p>كل منطقة أدناه قابلة للدخول واللعب بالكامل، ولا توجد أزرار لصفحات فارغة.</p></div></div><div className="world-map-grid">{quranWorld.map((game,index)=>{const p=progress.find(x=>x.game_id===game.id);return <button key={game.id} className={`world-zone ${game.tone}`} disabled={!learningActorReady(viewer)} onClick={()=>navigate(game.route)}><span className="zone-number">{String(index+1).padStart(2,"0")}</span><span className="zone-icon"><Icon name={game.icon} size={42}/></span><span className="zone-copy"><small>{game.title}</small><b>{game.subtitle}</b><p>{game.description}</p></span><span className="zone-progress">{teacherPreview?"معاينة":p?.best_stars?`${p.best_stars}/3 نجوم` : "ابدأ أول جولة"}<Icon name="arrow" size={18}/></span></button>;})}</div></section>
      <section className="world-section classic-zone"><div className="world-heading"><div><span>ألعاب إضافية</span><h2>الألعاب الحالية</h2><p>تظل قابلة للعب أثناء نقل نظام المكافآت القديم إلى GameEngine الجديد.</p></div></div><div className="game-grid compact-games">{classicGames.map(game=><article className="game-card" key={game.id}><div className="game-card-top"><div className="game-icon"><Icon name={game.icon} size={38}/></div><span className="level-chip">متاحة</span></div><h2>{game.title}</h2><p>{game.description}</p><button className="game-play" disabled={!learningActorReady(viewer)} onClick={()=>navigate(game.route)}>ابدأ اللعبة <Icon name="arrow" size={18}/></button></article>)}</div></section>
      <section className="mini-tip"><span className="tip-icon"><Icon name="lightbulb" size={25}/></span><div><b>المراجعة الذكية بدأت من الآن</b><p>أي إجابة خاطئة في الألعاب الجديدة تُسجل على مستوى السورة والآية، وتدخل تلقائيًا في طابور المراجعة بدل أن تتحول النتيجة إلى رقم فقط.</p></div></section>
    </main><footer><div className="wrap">أبو العزايم للحفظ الممتع • ألعاب القرآن تتعلم من أداء الطفل وتعيد استخدام نقاط الضعف في المراجعة.</div></footer>
  </div>;
}
