import React,{useEffect,useMemo,useState} from "react";
import {getStudentWallet,listGameStoreItems,listGameUnlocks,purchaseGameUnlock,signOut} from "./api.js";
import {isChildModeActive} from "./ChildHub.jsx";
import {loadLearningViewer,learningActorReady} from "./learningViewer.js";
import {GameEngine} from "./gameEngine.js";
import {liveGamesByPack,PLANNED_GAME_DEFINITIONS,BLOCKED_CONTENT_GAME_DEFINITIONS} from "./gameRegistry.js";
import {AppShell,Button,Card,CHILD_NAV,FAMILY_NAV,Hero,Metric,Section,TEACHER_NAV,go} from "./ui-v4.jsx";

const coreGames=liveGamesByPack("quran-core").filter(g=>g.engineIntegrated);
const expansionGames=liveGamesByPack("quran-expansion").filter(g=>g.engineIntegrated);
const classicGames=liveGamesByPack("classic").filter(g=>g.engineIntegrated);
const toneByCategory={memorization:"sky",review:"mint",tajweed:"mint",understanding:"gold",classic:"sky"};

function GameGrid({games,progress,viewer,childMode,storeMap,unlocked,onPurchase}){
  const teacher=Boolean(viewer?.teacherPreview);
  return <div className="aa-game-grid">{games.map(game=>{
    const p=progress.find(x=>x.game_id===game.id);
    const item=storeMap.get(game.id);
    const owned=unlocked.has(game.id);
    const locked=Boolean(item&&!owned&&!teacher);
    const ready=learningActorReady(viewer);
    const action=locked
      ? childMode?`افتح بـ ${item.wallet_price} نقطة`:"افتح من وضع الطفل"
      : ready?"العب الآن":"غير متاحة";
    const click=locked
      ? childMode?()=>onPurchase(game,item):()=>go("/child")
      : ready?()=>go(game.route):undefined;
    const badge=teacher?"معاينة":owned?"مملوكة":locked?"مقفلة":p?.best_stars?`${p.best_stars}/3 نجوم`:childMode?"جاهزة":"ابدأ";
    return <Card key={game.id} className="aa-game-card" icon={locked?"lock":game.icon||"game"} title={game.title}
      text={locked?(childMode?"افتح اللعبة مرة واحدة وتفضل ملكك دائمًا.":"شراء اللعبة يتم من وضع الطفل."):childMode?"جولة قصيرة. جرّب، العب، واجمع نجومك.":game.description}
      tone={toneByCategory[game.category]||"sky"} badge={badge} action={action} onClick={click}>
      <div className="aa-game-meta"><span>{game.educationalGoal||"تعلم باللعب"}</span><span>{locked?`${item.wallet_price} نقطة`:p?.plays?`${p.plays} جولات`:"جولة جديدة"}</span></div>
    </Card>;
  })}</div>;
}

export default function GamesHub(){
  const [viewer,setViewer]=useState(undefined),[progress,setProgress]=useState([]),[wallet,setWallet]=useState({wallet_balance:0,lifetime_points:0});
  const [storeItems,setStoreItems]=useState([]),[unlocks,setUnlocks]=useState([]),[busyGame,setBusyGame]=useState("");
  const [error,setError]=useState(""),[message,setMessage]=useState("");

  async function refreshAccess(childId){
    if(!childId)return;
    const [walletState,owned]=await Promise.all([getStudentWallet(childId),listGameUnlocks(childId)]);
    setWallet(walletState||{wallet_balance:0,lifetime_points:0});setUnlocks(owned||[]);
  }

  useEffect(()=>{let alive=true;(async()=>{try{
    const context=await loadLearningViewer();if(!alive)return;
    if(!context.user)return go("/login");
    setViewer(context);
    const store=await listGameStoreItems().catch(()=>[]);
    if(!alive)return;setStoreItems(store||[]);
    if(!context.teacherPreview&&!context.child){setError("أضف طفلًا أولًا من حساب الأسرة قبل بدء الألعاب.");return;}
    if(context.child?.id){
      const [rows,walletState,owned]=await Promise.all([
        GameEngine.progress(context.child.id),getStudentWallet(context.child.id),listGameUnlocks(context.child.id)
      ]);
      if(alive){setProgress(rows||[]);setWallet(walletState||{wallet_balance:0,lifetime_points:0});setUnlocks(owned||[]);}
    }
  }catch(e){if(alive)setError(e.message||"تعذر تحميل عالم الألعاب.");}})();return()=>{alive=false;};},[]);

  const childMode=isChildModeActive(),teacher=Boolean(viewer?.teacherPreview),child=viewer?.child||null;
  const storeMap=useMemo(()=>new Map(storeItems.map(item=>[item.game_id,item])),[storeItems]);
  const unlocked=useMemo(()=>new Set(unlocks.map(item=>item.game_id)),[unlocks]);
  if(viewer===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز الألعاب...</p></div>;

  const all=[...coreGames,...expansionGames,...classicGames];
  const mastered=progress.filter(p=>Number(p.best_stars||0)>=3).length;
  const lockedCount=teacher?0:all.filter(g=>storeMap.has(g.id)&&!unlocked.has(g.id)).length;
  const available=all.length-lockedCount;

  async function logout(){await signOut();go("/");}
  async function buy(game,item){
    if(!child?.id||busyGame)return;
    const balance=Number(wallet.wallet_balance||0);
    if(balance<Number(item.wallet_price||0)){setError(`رصيد الألعاب غير كافٍ. تحتاج ${item.wallet_price} نقطة ورصيدك ${balance}.`);return;}
    const ok=window.confirm(`فتح "${game.title}" مقابل ${item.wallet_price} نقطة؟ اللعبة ستظل مملوكة لك دائمًا.`);
    if(!ok)return;
    setBusyGame(game.id);setError("");setMessage("");
    try{
      const result=await purchaseGameUnlock(child.id,game.id);
      await refreshAccess(child.id);
      setMessage(result?.already_owned?"اللعبة مملوكة بالفعل.":"تم فتح اللعبة وأصبحت ملكك دائمًا.");
    }catch(e){setError(e.message||"تعذر فتح اللعبة.");}finally{setBusyGame("");}
  }

  const mode=teacher?"teacher":childMode?"child":"family";
  const nav=teacher?TEACHER_NAV:childMode?CHILD_NAV:FAMILY_NAV;
  const actions=teacher?<Button kind="secondary" icon="teacher" onClick={()=>go("/teacher")}>لوحة المعلم</Button>:<>
    {!childMode&&<Button kind="secondary" icon="users" onClick={()=>go("/family")}>الأسرة</Button>}
    {!childMode&&<Button kind="ghost" icon="logout" onClick={logout}>خروج</Button>}
  </>;

  const gridProps={progress,viewer,childMode,storeMap,unlocked,onPurchase:buy};
  return <AppShell mode={mode} subtitle="عالم الألعاب" nav={nav} actions={actions} footer="أبو العزايم • الألعاب المشتراة تظل مملوكة لملف الطفل عبر كل المعلمين.">
    <Hero eyebrow={teacher?"معاينة المعلم":childMode?"اختار مغامرتك":"ألعاب مرتبطة بالتقدم"}
      title={teacher?"استكشف الألعاب قبل الطلاب":childMode?`جاهز نلعب يا ${child?.display_name||"بطلنا"}؟`:`أهلًا ${child?.display_name||"بطلنا"} في عالم الألعاب`}
      description={teacher?"المعلم يتجاوز Store Lock أثناء الاستخدام التعليمي؛ المعاينة لا تخصم من رصيد الطفل.":childMode?"الألعاب المجانية تبدأ فورًا، والألعاب المدفوعة تفتحها مرة واحدة من رصيدك وتفضل ملكك.":"تابع الألعاب والتقدم. شراء الألعاب يتم من وضع الطفل."}
      icon="game" tone="mint"/>
    {error&&<div className="msg error">{error}</div>}{message&&<div className="msg ok">{message}</div>}
    <div className="aa-metrics">
      <Metric icon="game" label="ألعاب متاحة" value={available} tone="mint"/>
      <Metric icon="lock" label="تحتاج فتح" value={lockedCount} tone="sky"/>
      <Metric icon="trophy" label="رصيد الألعاب" value={teacher?"—":wallet.wallet_balance||0} tone="gold"/>
      <Metric icon="star" label="إجمالي الإنجاز" value={teacher?"—":wallet.lifetime_points||0} tone="gold"/>
    </div>
    <Section eyebrow={childMode?"ابدأ من هنا":"الأساس"} title={childMode?"مغامرات سهلة وممتعة":"الألعاب الأساسية"} description={childMode?"اختار لعبة واحدة فقط وابدأ.":"ألعاب live ومربوطة فعليًا بالمحرك."}><GameGrid games={coreGames} {...gridProps}/></Section>
    {expansionGames.length>0&&<Section eyebrow="مغامرات إضافية" title={childMode?"جرّب حاجة مختلفة":"توسعة الألعاب"}><GameGrid games={expansionGames} {...gridProps}/></Section>}
    {classicGames.length>0&&<Section eyebrow="جولات خفيفة" title={childMode?"للعب السريع":"ألعاب إضافية"}><GameGrid games={classicGames} {...gridProps}/></Section>}
    {!childMode&&!teacher&&<Section eyebrow="الفهم" title="عالم فهم القرآن" description="المحتوى لا يظهر للطفل إلا بعد المراجعة والاعتماد."><Button kind="secondary" icon="quran" onClick={()=>go("/games/tafsir")}>دخول عالم الفهم</Button></Section>}
    {!teacher&&!storeItems.length&&<Section eyebrow="Store V7" title="الأسعار لم تُفعّل بعد" description="كل الألعاب الحالية تظل متاحة كما هي. عندما تُضاف أسعار server-side تبدأ آلية الشراء الدائم تلقائيًا بدون تغيير GameEngine."/>}
  </AppShell>;
}
