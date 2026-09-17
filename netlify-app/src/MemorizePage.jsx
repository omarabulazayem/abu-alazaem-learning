import React, { useEffect, useMemo, useState } from "react";
import {
  claimReward,
  dayKey,
  getActiveChildId,
  getCurrentUser,
  getProgress,
  listChildren,
  saveProgress,
  setActiveChildId,
} from "./api.js";
import { isChildModeActive } from "./ChildHub.jsx";
import { getSurah, SHORT_SURAH_ORDER, SURAHS } from "./quranData.js";
import { selectSurah, selectedSurahNumber } from "./QuranPage.jsx";

function navigate(path) {
  if (window.location.pathname !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function sessionAyahCount(total) {
  if (total <= 7) return 1;
  if (total <= 15) return 2;
  if (total <= 40) return 3;
  if (total <= 100) return 5;
  return 7;
}

export default function MemorizePage() {
  const [user, setUser] = useState(undefined);
  const [child, setChild] = useState(null);
  const [progress, setProgress] = useState([]);
  const [surahNumber, setSurahNumber] = useState(selectedSurahNumber());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const current = await getCurrentUser();
      if (!current) return navigate("/login");
      if (current.accountType === "teacher") return navigate("/teacher");
      setUser(current);
      const kids = await listChildren(current);
      const activeId = getActiveChildId();
      const selectedChild = kids.find(k => k.id === activeId) || kids[0] || null;
      if (selectedChild && selectedChild.id !== activeId) setActiveChildId(selectedChild.id);
      setChild(selectedChild);
      if (!selectedChild) {
        setError("أضف طفلًا أولًا من حساب الأسرة.");
        return;
      }
      const rows = await getProgress(selectedChild.id);
      setProgress(rows || []);
      const stored = getSurah(selectedSurahNumber());
      if (!stored) {
        const nextNumber = SHORT_SURAH_ORDER.find(n => Number(rows.find(r => Number(r.surah_number) === n)?.memorized_percent || 0) < 100) || 1;
        setSurahNumber(nextNumber);
        selectSurah(nextNumber);
      }
    } catch (e) {
      setError(e.message || "تعذر تجهيز جلسة الحفظ.");
    }
  }

  useEffect(() => { load(); }, []);

  const row = useMemo(() => progress.find(p => Number(p.surah_number) === Number(surahNumber)), [progress, surahNumber]);
  const surah = getSurah(surahNumber) || SURAHS[0];
  const currentPercent = Number(row?.memorized_percent || 0);
  const currentAyahs = currentPercent >= 100 ? surah.ayahs : Math.min(surah.ayahs, Math.floor((currentPercent / 100) * surah.ayahs));
  const batchSize = sessionAyahCount(surah.ayahs);
  const nextAyahs = Math.min(surah.ayahs, currentAyahs + batchSize);
  const nextPercent = nextAyahs >= surah.ayahs ? 100 : Math.max(currentPercent + 1, Math.round((nextAyahs / surah.ayahs) * 100));

  function changeSurah(value) {
    const number = Number(value);
    setSurahNumber(number);
    selectSurah(number);
    setMessage("");
    setError("");
  }

  async function completeSession() {
    if (!child?.id) return navigate("/family");
    if (currentPercent >= 100) return navigate("/review");
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await saveProgress({
        child_id: child.id,
        surah_number: surah.number,
        surah_name: surah.name,
        memorized_percent: nextPercent,
        review_percent: Number(row?.review_percent || 0),
        status: nextPercent >= 100 ? "review" : "learning",
      });
      const reward = await claimReward(child.id, "memorize_session", dayKey("memorize", surah.number)).catch(() => null);
      const value = Array.isArray(reward) ? reward[0] : reward;
      setMessage(nextPercent >= 100
        ? `ما شاء الله! اكتمل حفظ سورة ${surah.name}. انتقل الآن للمراجعة.`
        : value?.awarded === false
          ? `تم حفظ التقدم حتى الآية ${nextAyahs}. مكافأة حفظ هذه السورة لليوم حصلت عليها مسبقًا.`
          : `تم حفظ التقدم حتى الآية ${nextAyahs}. أحسنت!`);
      const rows = await getProgress(child.id);
      setProgress(rows || []);
    } catch (e) {
      setError(e.message || "تعذر حفظ تقدم الجلسة.");
    } finally {
      setBusy(false);
    }
  }

  if (user === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز جلسة الحفظ...</p></div>;

  const childMode = isChildModeActive();

  return (
    <div className="app" dir="rtl">
      <header>
        <div className="wrap nav">
          <button className="brand" onClick={() => navigate(childMode ? "/child" : "/")}>
            <span className="logo">ع</span><span><b>أبو العزايم</b><small>جلسة الحفظ</small></span>
          </button>
          <div className="actions">
            <button className="pill" onClick={() => navigate("/quran")}>كل السور</button>
            <button className="secondary" onClick={() => navigate(childMode ? "/child" : "/family")}>{childMode ? "وضع الطفل" : "حساب الأسرة"}</button>
          </div>
        </div>
      </header>

      <main className="wrap page narrow">
        <div className="title">
          <span>جلسة حفظ</span>
          <h1>سورة {surah.name}</h1>
          <p>{child ? `جلسة قصيرة مناسبة لـ ${child.display_name}.` : "اختر طفلًا لبدء الحفظ."}</p>
        </div>

        {error && <div className="msg error">{error}</div>}
        {message && <div className="msg ok">{message}</div>}

        <section className="panel focus">
          <label style={{ width: "100%", textAlign: "right" }}>
            <b>اختر السورة</b>
            <select value={surah.number} onChange={e => changeSurah(e.target.value)} style={{ marginTop: 8 }}>
              {SURAHS.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name} — {s.ayahs} آية</option>)}
            </select>
          </label>

          <b className="percent">{currentPercent}%</b>
          <div className="bar big"><i style={{ width: `${currentPercent}%` }} /></div>
          <div className="stats" style={{ width: "100%", margin: "18px 0" }}>
            <div><b>{currentAyahs}</b><span>آية محفوظة تقريبًا</span></div>
            <div><b>{surah.ayahs}</b><span>إجمالي الآيات</span></div>
            <div><b>{Math.max(0, surah.ayahs - currentAyahs)}</b><span>متبقية</span></div>
          </div>

          {currentPercent < 100 ? (
            <>
              <p>دفعة الجلسة المقترحة: من الآية <b>{currentAyahs + 1}</b> إلى الآية <b>{nextAyahs}</b>.</p>
              <button className="primary full" disabled={busy || !child} onClick={completeSession}>{busy ? "جارٍ حفظ التقدم..." : `أنهيت الآيات ${currentAyahs + 1}–${nextAyahs}`}</button>
            </>
          ) : (
            <>
              <p>تم حفظ السورة كاملة. المرحلة التالية هي تثبيت الحفظ بالمراجعة.</p>
              <button className="primary full" onClick={() => navigate("/review")}>ابدأ المراجعة</button>
            </>
          )}
        </section>
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • القليل المستمر يصنع حفظًا ثابتًا.</div></footer>
    </div>
  );
}
