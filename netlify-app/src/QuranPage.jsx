import React, { useEffect, useMemo, useState } from "react";
import {
  getActiveChildId,
  getCurrentUser,
  getProgress,
  listChildren,
  setActiveChildId,
  signOut,
} from "./api.js";
import { isChildModeActive } from "./ChildHub.jsx";
import { SURAHS } from "./surahCatalog.js";

export const SELECTED_SURAH_KEY = "abu-alazaem-selected-surah";

function navigate(path) {
  if (window.location.pathname !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export function selectSurah(number) {
  localStorage.setItem(SELECTED_SURAH_KEY, String(number));
}

export function selectedSurahNumber() {
  const value = Number(localStorage.getItem(SELECTED_SURAH_KEY));
  return Number.isInteger(value) && value >= 1 && value <= 114 ? value : 1;
}

export default function QuranPage() {
  const [user, setUser] = useState(undefined);
  const [child, setChild] = useState(null);
  const [progress, setProgress] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const current = await getCurrentUser();
        if (!alive) return;
        setUser(current);
        if (!current || current.accountType === "teacher") return;
        const kids = await listChildren(current);
        if (!alive) return;
        const activeId = getActiveChildId();
        const selected = kids.find(k => k.id === activeId) || kids[0] || null;
        if (selected && selected.id !== activeId) setActiveChildId(selected.id);
        setChild(selected);
        if (selected) setProgress(await getProgress(selected.id));
      } catch (e) {
        if (alive) setError(e.message || "تعذر تحميل تقدم القرآن.");
      }
    })();
    return () => { alive = false; };
  }, []);

  const progressMap = useMemo(() => new Map(progress.map(row => [Number(row.surah_number), row])), [progress]);

  const visibleSurahs = useMemo(() => {
    const normalized = query.trim().replace(/^سورة\s+/i, "");
    return SURAHS.filter(surah => {
      const row = progressMap.get(surah.number);
      const memorized = Number(row?.memorized_percent || 0);
      const review = Number(row?.review_percent || 0);
      const matchesQuery = !normalized || surah.name.includes(normalized) || String(surah.number) === normalized;
      if (!matchesQuery) return false;
      if (filter === "new") return memorized === 0;
      if (filter === "learning") return memorized > 0 && memorized < 100;
      if (filter === "review") return memorized >= 100 && review < 85;
      if (filter === "mastered") return row?.status === "mastered" || (memorized >= 100 && review >= 85);
      return true;
    });
  }, [query, filter, progressMap]);

  const started = progress.filter(p => Number(p.memorized_percent || 0) > 0).length;
  const memorized = progress.filter(p => Number(p.memorized_percent || 0) >= 100).length;
  const mastered = progress.filter(p => p.status === "mastered" || (Number(p.memorized_percent || 0) >= 100 && Number(p.review_percent || 0) >= 85)).length;

  function openSurah(surah, row) {
    if (!user) return navigate("/login");
    if (user.accountType === "teacher") return;
    if (!child) return navigate("/family");
    selectSurah(surah.number);
    const memorizedPercent = Number(row?.memorized_percent || 0);
    navigate(memorizedPercent >= 100 ? "/review" : "/memorize");
  }

  async function logout() {
    await signOut();
    navigate("/");
  }

  const childMode = isChildModeActive();

  return (
    <div className="app" dir="rtl">
      <header>
        <div className="wrap nav">
          <button className="brand" onClick={() => navigate(childMode ? "/child" : "/")}>
            <span className="logo">ع</span>
            <span><b>أبو العزايم</b><small>القرآن الكريم</small></span>
          </button>
          <div className="actions">
            {user ? (
              <>
                <button className="pill" onClick={() => navigate(childMode ? "/child" : user.accountType === "teacher" ? "/teacher" : "/family")}>
                  {childMode ? "وضع الطفل" : user.accountType === "teacher" ? "لوحة المعلم" : "حساب الأسرة"}
                </button>
                {!childMode && <button className="secondary" onClick={logout}>خروج</button>}
              </>
            ) : <button className="pill" onClick={() => navigate("/login")}>تسجيل الدخول</button>}
          </div>
        </div>
      </header>

      <main className="wrap page">
        <div className="title">
          <span>١١٤ سورة</span>
          <h1>مصحف رحلة الحفظ</h1>
          <p>{child ? `تابع تقدم ${child.display_name} في جميع سور القرآن.` : user?.accountType === "teacher" ? "تصفح كتالوج سور القرآن." : "تصفح جميع السور، وسجّل الدخول لحفظ التقدم."}</p>
        </div>

        {error && <div className="msg error">{error}</div>}

        {child && (
          <div className="stats" style={{ marginBottom: 20 }}>
            <div><b>{started}</b><span>سورة بدأت</span></div>
            <div><b>{memorized}</b><span>محفوظة ١٠٠٪</span></div>
            <div><b>{mastered}</b><span>متقنة</span></div>
          </div>
        )}

        <section className="panel" style={{ marginBottom: 22 }}>
          <div className="row" style={{ alignItems: "stretch", flexWrap: "wrap" }}>
            <input
              type="search"
              placeholder="ابحث باسم السورة أو رقمها..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ flex: "1 1 260px", margin: 0 }}
            />
            {child && (
              <select value={filter} onChange={e => setFilter(e.target.value)} style={{ flex: "0 1 210px", margin: 0 }}>
                <option value="all">كل السور</option>
                <option value="new">لم تبدأ</option>
                <option value="learning">قيد الحفظ</option>
                <option value="review">تحتاج مراجعة</option>
                <option value="mastered">متقنة</option>
              </select>
            )}
          </div>
          <small className="muted">يظهر الآن {visibleSurahs.length} من ١١٤ سورة.</small>
        </section>

        <div className="surahs">
          {visibleSurahs.map(surah => {
            const row = progressMap.get(surah.number);
            const memorizePercent = Number(row?.memorized_percent || 0);
            const reviewPercent = Number(row?.review_percent || 0);
            const isMastered = row?.status === "mastered" || (memorizePercent >= 100 && reviewPercent >= 85);
            return (
              <article key={surah.number}>
                <div className="num">{surah.number}</div>
                <h3>سورة {surah.name}</h3>
                <p>{surah.ayahs} آية</p>
                {child ? (
                  <>
                    <div className="bar"><i style={{ width: `${memorizePercent}%` }} /></div>
                    <small>{memorizePercent}% حفظ • {reviewPercent}% مراجعة {isMastered ? "• متقنة ✓" : ""}</small>
                    <button className="secondary full" onClick={() => openSurah(surah, row)}>
                      {memorizePercent >= 100 ? "مراجعة السورة" : memorizePercent > 0 ? "متابعة الحفظ" : "ابدأ الحفظ"}
                    </button>
                  </>
                ) : (
                  <button className="secondary full" onClick={() => openSurah(surah, row)} disabled={user?.accountType === "teacher"}>
                    {!user ? "سجل الدخول لبدء الحفظ" : user.accountType === "teacher" ? "عرض" : "ابدأ"}
                  </button>
                )}
              </article>
            );
          })}
        </div>

        {!visibleSurahs.length && <section className="panel focus"><p>لا توجد سورة مطابقة للبحث أو الفلتر الحالي.</p></section>}
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • جميع سور القرآن في رحلة واحدة.</div></footer>
    </div>
  );
}
