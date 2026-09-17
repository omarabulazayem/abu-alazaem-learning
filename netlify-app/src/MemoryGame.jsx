import React, { useEffect, useRef, useState } from "react";
import {
  claimReward,
  dayKey,
  getActiveChildId,
  getCurrentUser,
  listChildren,
  setActiveChildId,
} from "./api.js";

const symbols = ["🌙", "📖", "⭐", "🕌", "🤲", "💚"];

function navigate(path) {
  if (window.location.pathname !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function shuffledDeck() {
  return [...symbols, ...symbols]
    .map((symbol, index) => ({ id: `${symbol}-${index}-${Math.random()}`, symbol, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ id, symbol }) => ({ id, symbol }));
}

export default function MemoryGame() {
  const [user, setUser] = useState(undefined);
  const [child, setChild] = useState(null);
  const [deck, setDeck] = useState(() => shuffledDeck());
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rewarded = useRef(false);

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
        let childId = getActiveChildId();
        const selected = kids.find(k => k.id === childId) || kids[0] || null;
        if (selected && selected.id !== childId) {
          childId = selected.id;
          setActiveChildId(childId);
        }
        setChild(selected);
        if (!selected) setError("أضف طفلًا أولًا من حساب الأسرة قبل بدء اللعبة.");
      } catch (e) {
        if (alive) setError(e.message || "تعذر تجهيز اللعبة.");
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (open.length !== 2) return;
    const [first, second] = open;
    const same = deck[first]?.symbol === deck[second]?.symbol;
    const timer = window.setTimeout(() => {
      if (same) setMatched(prev => [...new Set([...prev, first, second])]);
      setOpen([]);
    }, same ? 420 : 720);
    return () => window.clearTimeout(timer);
  }, [open, deck]);

  useEffect(() => {
    if (!child?.id || matched.length !== deck.length || !deck.length || rewarded.current) return;
    rewarded.current = true;
    setBusy(true);
    (async () => {
      try {
        const result = await claimReward(child.id, "memory_game", dayKey("memory"));
        const value = Array.isArray(result) ? result[0] : result;
        setMessage(value?.awarded === false
          ? "أحسنت! أكملت اللعبة. مكافأة اليوم حصلت عليها مسبقًا، ويمكنك اللعب مرة أخرى للتدريب."
          : "ممتاز! أكملت لعبة الذاكرة وحصلت على ٣٥ نقطة ونجمتين.");
      } catch (e) {
        setMessage("أحسنت! أكملت اللعبة، لكن تعذر تسجيل المكافأة الآن.");
        setError(e.message || "تعذر تسجيل المكافأة.");
      } finally {
        setBusy(false);
      }
    })();
  }, [matched, deck.length, child?.id]);

  function flip(index) {
    if (busy || open.length >= 2 || open.includes(index) || matched.includes(index)) return;
    setOpen(prev => {
      const next = [...prev, index];
      if (next.length === 2) setMoves(m => m + 1);
      return next;
    });
  }

  function reset() {
    rewarded.current = false;
    setDeck(shuffledDeck());
    setOpen([]);
    setMatched([]);
    setMoves(0);
    setMessage("");
    setError("");
  }

  if (user === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز اللعبة...</p></div>;

  const complete = matched.length === deck.length && deck.length > 0;
  const progress = Math.round((matched.length / deck.length) * 100);

  return (
    <div className="app game-shell" dir="rtl">
      <header><div className="wrap nav"><button className="brand" onClick={() => navigate("/games")}><span className="logo">ع</span><span><b>لعبة الذاكرة</b><small>طابق البطاقات</small></span></button><div className="actions"><span className="reward-chip">⭐ {child?.stars || 0}</span><button className="secondary" onClick={() => navigate("/games")}>كل الألعاب</button></div></div></header>

      <main className="wrap page narrow game-page">
        <div className="game-title-block"><span>🧠 تركيز وذاكرة</span><h1>اكتشف الأزواج المتشابهة</h1><p>{child ? `افتح بطاقتين في كل مرة يا ${child.display_name}. حاول إنهاء اللوحة بأقل عدد من المحاولات.` : "اختر طفلًا من حساب الأسرة أولًا."}</p></div>

        {error && <div className="msg error">{error}</div>}
        {message && <div className="msg ok">{message}</div>}

        <section className="game-stage memory-stage">
          <div className="stats" style={{ marginBottom: 14 }}><div><b>{moves}</b><span>محاولة</span></div><div><b>{matched.length / 2}</b><span>زوج مكتمل</span></div><div><b>{Math.max(0,6 - matched.length / 2)}</b><span>متبقي</span></div></div>
          <div className="game-progress" style={{ marginBottom: 20 }}><i style={{ width: `${progress}%` }} /></div>

          <div className="memory-grid">
            {deck.map((card, index) => {
              const visible = open.includes(index) || matched.includes(index);
              const done = matched.includes(index);
              return (
                <button key={card.id} type="button" className={`memory-card ${visible ? "visible" : ""} ${done ? "matched" : ""}`} aria-label={visible ? `بطاقة ${card.symbol}` : "بطاقة مخفية"} onClick={() => flip(index)} disabled={!child || done || busy}>
                  <span>{visible ? card.symbol : "؟"}</span>
                </button>
              );
            })}
          </div>

          {complete && <div className="celebration"><span>🎉</span><b>ذاكرة ممتازة!</b><small>{busy ? "جارٍ تسجيل المكافأة..." : `أنهيت اللعبة في ${moves} محاولة.`}</small></div>}
          <div className="row" style={{ justifyContent: "center", marginTop: 20 }}><button className="secondary" onClick={() => navigate("/games")}>كل الألعاب</button><button className="primary" onClick={reset}>لعبة جديدة</button></div>
        </section>
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • درّب ذاكرتك واجمع مكافأة اليوم.</div></footer>
    </div>
  );
}
