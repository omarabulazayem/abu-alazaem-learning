import React, { useEffect, useRef, useState } from "react";
import {
  claimReward,
  dayKey,
  getActiveChildId,
  getCurrentUser,
  listChildren,
  signOut,
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
        if (!current) {
          navigate("/login");
          return;
        }
        if (current.accountType === "teacher") {
          navigate("/teacher");
          return;
        }
        setUser(current);
        const kids = await listChildren(current);
        if (!alive) return;
        let childId = getActiveChildId();
        if (!childId || !kids.some(k => k.id === childId)) childId = kids[0]?.id || null;
        setChild(kids.find(k => k.id === childId) || null);
        if (!childId) setError("أضف طفلًا أولًا من حساب الأسرة قبل بدء اللعبة.");
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
        if (value?.awarded === false) {
          setMessage("أحسنت! أكملت اللعبة. مكافأة اليوم تم الحصول عليها مسبقًا، ويمكنك اللعب مرة أخرى للتدريب.");
        } else {
          setMessage("ممتاز! أكملت لعبة الذاكرة وحصلت على مكافأة اليوم: ٣٥ نقطة ونجمتين.");
        }
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

  async function logout() {
    await signOut();
    navigate("/");
  }

  if (user === undefined) {
    return <div className="center"><i className="spinner" /><p>جارٍ تجهيز اللعبة...</p></div>;
  }

  const complete = matched.length === deck.length && deck.length > 0;

  return (
    <div className="app" dir="rtl">
      <header>
        <div className="wrap nav">
          <button className="brand" onClick={() => navigate("/")}>
            <span className="logo">ع</span>
            <span><b>أبو العزايم</b><small>للحفظ الممتع</small></span>
          </button>
          <div className="actions">
            <button className="pill" onClick={() => navigate("/child")}>وضع الطفل</button>
            <button className="secondary" onClick={logout}>خروج</button>
          </div>
        </div>
      </header>

      <main className="wrap page narrow">
        <div className="title">
          <span>الألعاب</span>
          <h1>لعبة الذاكرة اليومية</h1>
          <p>{child ? `طابق البطاقات المتشابهة يا ${child.display_name}. المكافأة تُسجل بعد إكمال اللعبة فعلًا.` : "اختر طفلًا من حساب الأسرة أولًا."}</p>
        </div>

        {error && <div className="msg error">{error}</div>}
        {message && <div className="msg ok">{message}</div>}

        <section className="panel focus">
          <div className="stats" style={{ marginBottom: 18 }}>
            <div><b>{moves}</b><span>محاولة</span></div>
            <div><b>{matched.length / 2}</b><span>زوج مكتمل</span></div>
            <div><b>{complete ? "✓" : `${6 - matched.length / 2}`}</b><span>{complete ? "اكتملت" : "متبقي"}</span></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(72px, 1fr))", gap: 12, width: "100%", maxWidth: 520, margin: "0 auto 20px" }}>
            {deck.map((card, index) => {
              const visible = open.includes(index) || matched.includes(index);
              const done = matched.includes(index);
              return (
                <button
                  key={card.id}
                  type="button"
                  aria-label={visible ? `بطاقة ${card.symbol}` : "بطاقة مخفية"}
                  onClick={() => flip(index)}
                  disabled={!child || done || busy}
                  style={{
                    minHeight: 88,
                    borderRadius: 18,
                    border: done ? "2px solid currentColor" : "1px solid rgba(0,0,0,.12)",
                    fontSize: visible ? 34 : 26,
                    fontWeight: 800,
                    cursor: done ? "default" : "pointer",
                    transform: visible ? "scale(1)" : "scale(.98)",
                    opacity: done ? .72 : 1,
                  }}
                >
                  {visible ? card.symbol : "؟"}
                </button>
              );
            })}
          </div>

          <div className="row" style={{ justifyContent: "center" }}>
            <button className="secondary" onClick={() => navigate("/child")}>العودة لوضع الطفل</button>
            <button className="primary" onClick={reset}>لعبة جديدة</button>
          </div>
        </section>
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • تعلم، العب، وتقدم كل يوم.</div></footer>
    </div>
  );
}
