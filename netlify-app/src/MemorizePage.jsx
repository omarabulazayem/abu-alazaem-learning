import React, { useEffect, useMemo, useState } from "react";
import { claimReward,dayKey,getActiveChildId,getCurrentUser,getProgress,listChildren,saveProgress,setActiveChildId } from "./api.js";
import { isChildModeActive } from "./ChildHub.jsx";
import { getSurah,SHORT_SURAH_ORDER,SURAHS } from "./surahCatalog.js";
import { selectSurah,selectedSurahNumber } from "./QuranPage.jsx";
import Icon from "./Icon.jsx";

function navigate(path){const current=typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;if(current!==path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}}
function sessionAyahCount(total){if(total<=7)return 1;if(total<=15)return 2;if(total<=40)return 3;if(total<=100)return 5;return 7;}

export default function MemorizePage(){
  const [user,setUser]=useState(undefined),[child,setChild]=useState(null),[progress,setProgress]=useState([]),[surahNumber,setSurahNumber]=useState(selectedSurahNumber()),[message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);

  useEffect(()=>{let alive=true;(async()=>{try{
    const current=await getCurrentUser();if(!alive)return;if(!current){navigate("/login");return;}if(current.accountType==="teacher"){navigate("/teacher");return;}setUser(current);
    const kids=await listChildren(current);if(!alive)return;const activeId=getActiveChildId();const selected=kids.find(k=>k.id===activeId)||kids[0]||null;if(selected&&selected.id!==activeId)setActiveChildId(selected.id);setChild(selected);
    if(!selected){setError("أضف طفلًا أولًا من حساب الأسرة.");return;}
    const rows=await getProgress(selected.id);if(!alive)return;setProgress(rows||[]);
    if(!getSurah(selectedSurahNumber())){const nextNumber=SHORT_SURAH_ORDER.find(n=>Number(rows.find(r=>Number(r.surah_number)===n)?.memorized_percent||0)<100)||1;setSurahNumber(nextNumber);selectSurah(nextNumber);}
  }catch(e){if(alive)setError(e.message||"تعذر تجهيز جلسة الحفظ.");}})();return()=>{alive=false;};},[]);

  const row=useMemo(()=>progress.find(p=>Number(p.surah_number)===Number(surahNumber)),[progress,surahNumber]);
  const surah=getSurah(surahNumber)||SURAHS[0];
  const currentPercent=Number(row?.memorized_percent||0);
  const currentAyahs=currentPercent>=100?surah.ayahs:Math.min(surah.ayahs,Math.floor((currentPercent/100)*surah.ayahs));
  const batchSize=sessionAyahCount(surah.ayahs);
  const nextAyahs=Math.min(surah.ayahs,currentAyahs+batchSize);
  const nextPercent=nextAyahs>=surah.ayahs?100:Math.max(currentPercent+1,Math.round((nextAyahs/surah.ayahs)*100));
  const childMode=isChildModeActive();

  function changeSurah(value){const number=Number(value);setSurahNumber(number);selectSurah(number);setMessage("");setError("");}
  async function completeSession(){if(!child?.id){navigate("/family");return;}if(currentPercent>=100){navigate("/review");return;}setBusy(true);setMessage("");setError("");try{
    await saveProgress({child_id:child.id,surah_number:surah.number,surah_name:surah.name,memorized_percent:nextPercent,review_percent:Number(row?.review_percent||0),status:nextPercent>=100?"review":"learning"});
    const reward=await claimReward(child.id,"memorize_session",dayKey("memorize",surah.number)).catch(()=>null);const value=Array.isArray(reward)?reward[0]:reward;
    setMessage(nextPercent>=100?`ما شاء الله! اكتمل حفظ سورة ${surah.name}. انتقل الآن للمراجعة.`:value?.awarded===false?`تم حفظ التقدم حتى الآية ${nextAyahs}. مكافأة اليوم حصلت عليها مسبقًا.`:`تم حفظ التقدم حتى الآية ${nextAyahs}. أحسنت!`);
    setProgress(await getProgress(child.id)||[]);
  }catch(e){setError(e.message||"تعذر حفظ تقدم الجلسة.");}finally{setBusy(false);}}

  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز جلسة الحفظ...</p></div>;

  return <div className="app learning-shell" dir="rtl">
    <header><div className="wrap nav"><button className="brand" onClick={()=>navigate(childMode?"/child":"/")}><span className="logo"><Icon name="quran" size={24}/></span><span><b>الحفظ</b><small>خطوة قصيرة كل مرة</small></span></button><div className="actions"><button className="secondary" onClick={()=>navigate("/quran")}><Icon name="quran" size={17}/> السور</button><button className="secondary" onClick={()=>navigate(childMode?"/child":"/family")}><Icon name={childMode?"child":"users"} size={17}/>{childMode?"عالمي":"حساب الأسرة"}</button></div></div></header>

    <main className="wrap page learning-page">
      <section className="learning-hero">
        <div><span className="learning-kicker"><Icon name="sparkle" size={16}/> جلسة اليوم</span><h1>سورة {surah.name}</h1><p>{child?`جلسة خفيفة لـ ${child.display_name}. الهدف اليوم صغير وواضح، وبعدها نحفظ التقدم.`:"اختر طفلًا لبدء الحفظ."}</p></div>
        <div className="learning-progress-ring" style={{"--progress":`${currentPercent*3.6}deg`}}><span><strong>{currentPercent}%</strong><small>محفوظ</small></span></div>
      </section>

      {error&&<div className="msg error">{error}</div>}{message&&<div className="msg ok">{message}</div>}

      <section className="learning-session-grid">
        <article className="learning-picker-card">
          <div className="learning-card-icon"><Icon name="quran" size={28}/></div><div><small>السورة الحالية</small><h2>اختار السورة</h2></div>
          <select value={surah.number} onChange={e=>changeSurah(e.target.value)}>{SURAHS.map(s=><option key={s.number} value={s.number}>{s.number}. {s.name} — {s.ayahs} آية</option>)}</select>
          <div className="learning-mini-stats"><span><b>{currentAyahs}</b><small>محفوظة</small></span><span><b>{surah.ayahs}</b><small>إجمالي</small></span><span><b>{Math.max(0,surah.ayahs-currentAyahs)}</b><small>متبقية</small></span></div>
        </article>

        <article className="learning-task-card">
          <div className="learning-task-head"><span className="learning-card-icon mint"><Icon name={currentPercent>=100?"circleCheck":"target"} size={28}/></span><div><small>{currentPercent>=100?"الخطوة التالية":"هدف الجلسة"}</small><h2>{currentPercent>=100?"ثبّت الحفظ":"آيات قليلة اليوم"}</h2></div></div>
          <div className="learning-task-visual"><Icon name={currentPercent>=100?"review":"quran"} size={54}/></div>
          {currentPercent<100?<><p>من الآية <b>{currentAyahs+1}</b> إلى الآية <b>{nextAyahs}</b>. خذ وقتك، وكرر بهدوء، وبعدها سجّل إنك خلصت.</p><button className="primary full" disabled={busy||!child} onClick={completeSession}>{busy?"جارٍ حفظ التقدم...":`خلصت الآيات ${currentAyahs+1}–${nextAyahs}`}</button></>:<><p>السورة محفوظة كاملة. دلوقتي نثبتها بالمراجعة بدل إضافة حمل جديد.</p><button className="primary full" onClick={()=>navigate("/review")}><Icon name="review" size={18}/> ابدأ المراجعة</button></>}
        </article>
      </section>
    </main>
    <footer><div className="wrap">أبو العزايم للحفظ الممتع • خطوة صغيرة وثابتة أفضل من جلسة طويلة مرهقة.</div></footer>
  </div>;
}
