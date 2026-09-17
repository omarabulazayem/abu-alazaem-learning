import React, { useMemo, useState } from "react";
import { SURAHS } from "./quranData.js";
import { selectSurah } from "./QuranPage.jsx";

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}
function navigate(path) {
  if (routePath() !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export default function TeacherQuranPreview() {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().replace(/^سورة\s+/i, "");
    return SURAHS.filter(s => !q || s.name.includes(q) || String(s.number) === q);
  }, [query]);

  function open(surah) {
    selectSurah(surah.number);
    navigate("/memorize");
  }

  return (
    <main className="wrap page teacherPreviewPage" dir="rtl">
      <div className="title"><span>١١٤ سورة • معاينة المعلم</span><h1>القرآن الكريم</h1><p>تصفح كل السور وافتح أي سورة مباشرة في محاكاة جلسة الحفظ.</p></div>
      <div className="msg ok teacherPreviewNotice">👨‍🏫 التصفح والمعاينة لا يغيران تقدم أي طالب. التعديل الحقيقي يتم فقط من ملف طالب مرتبط.</div>
      <section className="panel" style={{marginBottom:22}}><input type="search" placeholder="ابحث باسم السورة أو رقمها..." value={query} onChange={e => setQuery(e.target.value)} style={{margin:0}} /><small className="muted">يظهر الآن {visible.length} من ١١٤ سورة.</small></section>
      <div className="surahs">{visible.map(surah => <article key={surah.number}><div className="num">{surah.number}</div><h3>سورة {surah.name}</h3><p>{surah.ayahs} آية</p><button className="primary full" onClick={() => open(surah)}>معاينة الحفظ</button></article>)}</div>
      {!visible.length && <section className="panel focus"><p>لا توجد سورة مطابقة للبحث.</p></section>}
    </main>
  );
}
