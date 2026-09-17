import React,{useEffect,useMemo,useState} from "react";
import {getActiveChildId,getCurrentUser,getProgress,listChildren,setActiveChildId,signOut} from "./api.js";
import {isChildModeActive} from "./ChildHub.jsx";
import {SURAHS} from "./surahCatalog.js";
import {AppShell,Button,CHILD_NAV,FAMILY_NAV,Hero,Metric,ProgressBar,Section,go} from "./ui-v4.jsx";

export const SELECTED_SURAH_KEY="abu-alazaem-selected-surah";
export function selectSurah(number){localStorage.setItem(SELECTED_SURAH_KEY,String(number));}
export function selectedSurahNumber(){const value=Number(localStorage.getItem(SELECTED_SURAH_KEY));return Number.isInteger(value)&&value>=1&&value<=114?value:1;}

export default function QuranPage(){
  const [user,setUser]=useState(undefined);const [child,setChild]=useState(null);const [progress,setProgress]=useState([]);const [query,setQuery]=useState("");const [filter,setFilter]=useState("all");const [error,setError]=useState("");
  useEffect(()=>{let alive=true;(async()=>{try{const current=await getCurrentUser();if(!alive)return;setUser(current);if(!current||current.accountType==="teacher")return;const kids=await listChildren(current);if(!alive)return;const active=getActiveChildId();const selected=kids.find(k=>k.id===active)||kids[0]||null;if(selected&&selected.id!==active)setActiveChildId(selected.id);setChild(selected);if(selected)setProgress(await getProgress(selected.id));}catch(e){if(alive)setError(e.message||"تعذر تحميل تقدم القرآن.");}})();return()=>{alive=false;};},[]);
  const map=useMemo(()=>new Map(progress.map(row=>[Number(row.surah_number),row])),[progress]);
  const visible=useMemo(()=>{const q=query.trim().replace(/^سورة\s+/i,"");return SURAHS.filter(s=>{const row=map.get(s.number);const m=Number(row?.memorized_percent||0),r=Number(row?.review_percent||0);if(q&&!s.name.includes(q)&&String(s.number)!==q)return false;if(filter==="new")return m===0;if(filter==="learning")return m>0&&m<100;if(filter==="review")return m>=100&&r<85;if(filter==="mastered")return row?.status==="mastered"||(m>=100&&r>=85);return true;});},[query,filter,map]);
  const started=progress.filter(p=>Number(p.memorized_percent||0)>0).length,memorized=progress.filter(p=>Number(p.memorized_percent||0)>=100).length,mastered=progress.filter(p=>p.status==="mastered"||(Number(p.memorized_percent||0)>=100&&Number(p.review_percent||0)>=85)).length;
  const childMode=isChildModeActive();
  function open(s,row){if(!user)return go("/login");if(!child)return go("/family");selectSurah(s.number);go(Number(row?.memorized_percent||0)>=100?"/review":"/memorize");}
  async function logout(){await signOut();go("/");}
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز القرآن...</p></div>;
  const actions=user?<>{!childMode&&<Button kind="secondary" icon="user" onClick={()=>go("/family")}>حساب الأسرة</Button>}{!childMode&&<Button kind="ghost" icon="logout" onClick={logout}>خروج</Button>}</>:<Button icon="login" onClick={()=>go("/login")}>تسجيل الدخول</Button>;
  return <AppShell mode={childMode?"child":"family"} subtitle="القرآن الكريم" nav={childMode?CHILD_NAV:FAMILY_NAV} actions={actions} footer="أبو العزايم • ١١٤ سورة في رحلة واحدة.">
    <Hero eyebrow="١١٤ سورة" title="القرآن في مكان واضح وسهل" description={child?`اختار السورة وكمّل رحلة ${child.display_name} من مكانها.`:"تصفح السور، وسجّل الدخول حتى نحفظ تقدم الطفل."} icon="quran" tone="sky"/>
    {error&&<div className="msg error">{error}</div>}
    {child&&<div className="aa-metrics"><Metric icon="quran" label="سورة بدأت" value={started} tone="sky"/><Metric icon="star" label="محفوظة كاملة" value={memorized} tone="gold"/><Metric icon="trophy" label="متقنة" value={mastered} tone="mint"/><Metric icon="review" label="تحتاج متابعة" value={Math.max(0,memorized-mastered)} tone="lavender"/></div>}
    <Section eyebrow="ابحث واختار" title="السور">
      <div className="aa-quran-toolbar"><input type="search" placeholder="ابحث باسم السورة أو رقمها" value={query} onChange={e=>setQuery(e.target.value)}/>{child&&<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">كل السور</option><option value="new">لم تبدأ</option><option value="learning">قيد الحفظ</option><option value="review">تحتاج مراجعة</option><option value="mastered">متقنة</option></select>}</div>
      <div className="aa-surah-grid">{visible.map(s=>{const row=map.get(s.number);const m=Number(row?.memorized_percent||0),r=Number(row?.review_percent||0);return <article className="aa-card aa-surah-card" key={s.number}><span className="aa-surah-num">{s.number}</span><h3>سورة {s.name}</h3><small>{s.ayahs} آية</small>{child&&<ProgressBar value={m} label={m>=100?`مراجعة ${r}%`:"الحفظ"}/>}<Button kind={m>0?"soft":"secondary"} onClick={()=>open(s,row)} disabled={user?.accountType==="teacher"}>{!user?"سجل الدخول":m>=100?"مراجعة السورة":m>0?"متابعة الحفظ":"ابدأ الحفظ"}</Button></article>})}</div>
      {!visible.length&&<div className="aa-empty"><span>لا توجد سورة مطابقة للبحث الحالي.</span></div>}
    </Section>
  </AppShell>;
}
