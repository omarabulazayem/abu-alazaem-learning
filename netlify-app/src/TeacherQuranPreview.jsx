import React,{useMemo,useState} from "react";
import {SURAHS} from "./surahCatalog.js";
import {selectSurah} from "./QuranPage.jsx";
import {Button,Empty,Hero,Section,go} from "./ui-v4.jsx";

export default function TeacherQuranPreview(){
  const [query,setQuery]=useState("");
  const visible=useMemo(()=>{const q=query.trim().replace(/^سورة\s+/i,"");return SURAHS.filter(s=>!q||s.name.includes(q)||String(s.number)===q);},[query]);
  function open(surah){selectSurah(surah.number);go("/memorize");}
  return <div className="aa-preview-page" dir="rtl"><Hero eyebrow="١١٤ سورة • معاينة آمنة" title="القرآن الكريم" description="تصفح السور وافتح أي سورة في محاكاة جلسة الحفظ، بدون تعديل تقدم طالب." icon="quran" tone="sky"/><div className="msg ok">التصفح والمعاينة لا يغيران تقدم أي طالب.</div><Section eyebrow="ابحث" title="السور"><div className="aa-quran-toolbar"><input type="search" placeholder="ابحث باسم السورة أو رقمها" value={query} onChange={e=>setQuery(e.target.value)}/><span style={{alignSelf:"center",fontSize:11,color:"var(--aa-muted)"}}>{visible.length} من ١١٤ سورة</span></div><div className="aa-surah-grid">{visible.map(s=><article className="aa-card aa-surah-card" key={s.number}><span className="aa-surah-num">{s.number}</span><h3>سورة {s.name}</h3><small>{s.ayahs} آية</small><Button onClick={()=>open(s)}>معاينة الحفظ</Button></article>)}</div>{!visible.length&&<Empty icon="search" title="لا توجد سورة مطابقة"/>}</Section></div>;
}
