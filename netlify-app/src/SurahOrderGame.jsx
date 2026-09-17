import React, { useEffect, useMemo, useState } from "react";
import {
  claimReward,
  dayKey,
  getActiveChildId,
  getCurrentUser,
  listChildren,
  setActiveChildId,
} from "./api.js";
import { SURAHS } from "./quranData.js";

function navigate(path) {
  if (window.location.pathname !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function makeRound() {
  const start = 78 + Math.floor(Math.random() * 33);
  const correct = SURAHS.slice(start - 1, start + 3);
  return { correct, cards: shuffle(correct) };
}

export default function SurahOrderGame() {
  const [user, setUser] = useState(undefined);
  const [child, setChild] = useState(null);
  const [roundData, setRoundData] = useState(() => makeRound());
  const [round, setRound] = useState(1);
  const [picked, setPicked] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const current = await getCurrentUser();
        if (!alive) return;
        if (!current) return navigate("/login");
        if (current.accountType === "teacher") return navigate("/teacher");
        setUser(current);
        const kids = await listChildren(current);
        if (!alive) return;
        let activeId = getActiveChildId();
        const selected = kids.find(k => k.id === activeId) || kids[0] || null;
        if (selected && selected.id !== activeId) {
          activeId = selected.id;
          setActiveChildId(activeId);
        }
        setChild(selected);
        if (!selected) setError("أضف طفلًا أولًا من حساب الأسرة.");
      } catch (e) {
        if (alive) setError(e.message || "تعذر تجهيز اللعبة.");
      }
    })();
    return () => { alive = false; };
  }, []);

  const expected = useMemo(() => roundData.correct[picked.length], [roundData, picked.length]);

  async function reward() {
    if (!child?.id) return;
    setBusy(true);
    try {
      const result = await claimReward(child.id, "surah_order_game", dayKey("order"));
      const value = Array.isArray(result) ? result[0] : result;
      setMessage(value?.awarded === false
        ? "أحسنت! أكملت اللعبة. مكافأة ترتيب السور لليوم حصلت عليها مسبقًا."
        : "رائع! أكملت ٣ جولات وحصلت على ٣٠ نقطة ونجمة.");
    } catch (e) {
      setError(e.message || "تم إكمال اللعبة لكن تعذر تسجيل المكافأة.");
    } finally {
      setBusy(false);
    }
  }

  function choose(card) {
    if (solved || busy || picked.some(x => x.number === card.number)) return;
    if (card.number !== expected?.number) {
      setMistakes(m => m + 1);
      setError(`قريب! سورة ${card.name} ليست التالية الآن. ابدأ ترتيب الجولة من جديد.`);
      setPicked([]);
      return;
    }
    setError("");
    const next = [...picked, card];
    setPicked(next);
    if (next.length === roundData.correct.length) {
      setSolved(true);
      if (round === 3) reward();
      else setMessage("ترتيب صحيح! انتقل للجولة التالية.");
    }
  }

  function nextRound() {
    setRound(r => r + 1);
    setRoundData(makeRound());
    setPicked([]);
    setSolved(false);
    setMessage("");
    setError("");
  }

  function restart() {
    setRound(1);
    setRoundData(makeRound());
    setPicked([]);
    setMistakes(0);
    setSolved(false);
    setMessage("");
    setError("");
  }

  if (user === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز اللعبة...</p></div>;

  return (
    <div className="app game-shell" dir="rtl">
      <header><div className="wrap nav"><button className="brand" onClick={() => navigate("/games")}><span className="logo">ع</span><span><b>رتّب السور</b><small>لعبة ترتيب المصحف</small></span></button><div className="actions"><span className="reward-chip">الجولة {round}/٣</span><button className="secondary" onClick={() => navigate("/games")}>كل الألعاب</button></div></div></header>

      <main className="wrap page narrow game-page">
        <div className="game-title-block"><span>🧩 تحدي الترتيب</span><h1>أي سورة تأتي أولًا؟</h1><p>اضغط أسماء السور بالترتيب الصحيح كما تظهر في المصحف. أكمل ٣ جولات لتحصل على مكافأة اليوم.</p></div>

        <div className="game-round-dots">{[1,2,3].map(n => <i key={n} className={n < round || (n === round && solved) ? "done" : n === round ? "active" : ""}>{n}</i>)}</div>
        {error && <div className="msg error">{error}</div>}
        {message && <div className="msg ok">{message}</div>}

        <section className="game-stage order-stage">
          <div className="picked-order">
            {roundData.correct.map((_, index) => <div className={picked[index] ? "picked-slot filled" : "picked-slot"} key={index}>{picked[index] ? <><b>{picked[index].name}</b><small>رقم {picked[index].number}</small></> : <span>{index + 1}</span>}</div>)}
          </div>

          <div className="order-options">
            {roundData.cards.map(card => {
              const used = picked.some(x => x.number === card.number);
              return <button key={card.number} className={used ? "order-option used" : "order-option"} disabled={used || solved || !child || busy} onClick={() => choose(card)}><span>سورة</span><b>{card.name}</b></button>;
            })}
          </div>

          <div className="game-meta"><span>❌ أخطاء: <b>{mistakes}</b></span><span>✅ صحيح: <b>{picked.length}/٤</b></span></div>

          {solved && round < 3 && <button className="primary game-cta" onClick={nextRound}>الجولة التالية ←</button>}
          {solved && round === 3 && <div className="celebration"><span>🎉</span><b>بطل ترتيب السور!</b><small>{busy ? "جارٍ تسجيل المكافأة..." : "أكملت التحدي بنجاح."}</small></div>}
          {solved && round === 3 && <button className="secondary game-cta" onClick={restart}>العب من جديد</button>}
        </section>
      </main>
      <footer><div className="wrap">أبو العزايم للحفظ الممتع • تعلّم ترتيب السور خطوة بخطوة.</div></footer>
    </div>
  );
}
