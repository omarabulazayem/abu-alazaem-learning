import React,{useEffect,useState} from "react";
import {claimReward,dayKey,getProgress,getCurrentUser,getActiveChildId,listChildren,recordReview} from "./api.js";
import {getSurah} from "./surahCatalog.js";
import {isChildModeActive} from "./ChildHub.jsx";
import {AppShell,Button,Card,CHILD_NAV,FAMILY_NAV,Empty,Hero,ProgressBar,Section,go} from "./ui-v4.jsx";

export default function ReviewPage(){
  const [user,setUser]=useState(undefined);const [child,setChild]=useState(null);const [progress,setProgress]=useState([]);const [msg,setMsg]=useState("");const [err,setErr]=useState("");const [busy,setBusy]=useState(false);
  async function load(current=user,selected=child){if(!current)return;const kids=await listChildren(current);const active=selected||kids.find(k=>k.id===getActiveChildId())||kids[0]||null;setChild(active);if(active)setProgress(await getProgress(active.id));}
  useEffect(()=>{let alive=true;(async()=>{try{const current=await getCurrentUser();if(!alive)return;if(!current)return go("/login");if(current.accountType==="teacher")return;setUser(current);const kids=await listChildren(current);const selected=kids.find(k=>k.id===getActiveChildId())||kids[0]||null;if(!alive)return;setChild(selected);if(selected)setProgress(await getProgress(selected.id));}catch(e){if(alive)setErr(e.message||"تعذر تحميل المراجعة.");}})();return()=>{alive=false;};},[]);
  async function rate(row,score){if(!user||!child)return;setBusy(true);setErr("");setMsg("");try{await recordReview(user,child.id,row.surah_number,score);await claimReward(child.id,"review_session",dayKey("review",row.surah_number)).catch(()=>{});setMsg(`تم تسجيل مراجعة سورة ${getSurah(row.surah_number)?.name||row.surah_name||row.surah_number}.`);await load(user,child);}catch(e){setErr(e.message||"تعذر تسجيل المراجعة.");}finally{setBusy(false);}}
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز المراجعة...</p></div>;
  const childMode=isChildModeActive();const items=progress.filter(x=>Number(x.memorized_percent||0)>0);
  return <AppShell mode={childMode?"child":"family"} subtitle="المراجعة" nav={childMode?CHILD_NAV:FAMILY_NAV} actions={<Button kind="secondary" icon="quran" onClick={()=>go("/quran")}>القرآن</Button>} footer="أبو العزايم • المراجعة المنتظمة تثبّت الحفظ.">
    <Hero eyebrow="راجع وثبّت" title={`مراجعة ${child?.display_name||"الطفل"}`} description="اختار سورة واحدة، اسمع التسميع، وسجّل المستوى ببساطة." icon="review" tone="mint"/>
    {err&&<div className="msg error">{err}</div>}{msg&&<div className="msg ok">{msg}</div>}
    {items.length?<Section eyebrow={`${items.length} سورة بدأت`} title="اختار سورة للمراجعة" description="التقييم هنا بسيط ويحدث حالة المراجعة مباشرة."><div className="aa-game-grid">{items.map(row=>{const s=getSurah(row.surah_number);const review=Number(row.review_percent||0);return <Card key={row.surah_number} icon="quran" title={`سورة ${s?.name||row.surah_name||row.surah_number}`} text={review>=85?"مراجعة قوية — حافظ على المستوى.":review>0?"تحتاج تثبيتًا إضافيًا.":"لم تُسجل مراجعة بعد."} tone={review>=85?"mint":"sky"}><div style={{marginTop:14}}><ProgressBar value={review} label="المراجعة"/></div><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7,marginTop:14}}>{[[60,"نحتاج تدريب"],[80,"جيد"],[90,"ممتاز جدًا"],[100,"ممتاز"]].map(([score,label])=><Button key={score} kind={review===score?"primary":"soft"} disabled={busy} onClick={()=>rate(row,score)}>{label}</Button>)}</div></Card>})}</div></Section>:<Empty icon="quran" title="ابدأ الحفظ أولًا" text="السور التي يبدأ الطفل حفظها ستظهر هنا تلقائيًا." action={<Button icon="quran" onClick={()=>go("/memorize")}>ابدأ جلسة حفظ</Button>}/>} 
  </AppShell>;
}
