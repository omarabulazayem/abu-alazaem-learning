import React, { useEffect, useRef, useState } from "react";
import { loadLearningViewer, learningActorReady } from "./learningViewer.js";
import { GameEngine, gameResultSummary } from "./gameEngine.js";
import Icon from "./Icon.jsx";

const symbols = [
  { name: "quran", label: "مصحف" },
  { name: "star", label: "نجمة" },
  { name: "mosque", label: "مسجد" },
  { name: "gift", label: "هدية" },
  { name: "target", label: "هدف" },
  { name: "trophy", label: "كأس" },
];

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}
function navigate(path) {
  if (routePath() !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function shuffledDeck() {
  return [...symbols, ...symbols]
    .map((symbol, index) => ({ id: `${symbol.name}-${index}-${Math.random()}`, symbol, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ id, symbol }) => ({ id, symbol }));
}

export default function MemoryGame() {
  const [viewer, setViewer] = useState(undefined);
  const [deck, setDeck] = useState(() => shuffledDeck());
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [roundKey, setRoundKey] = useState(0);
  const engineRef = useRef(null);
  const startedAt = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const context = await loadLearningViewer();
        if (!alive) return;
        if (!context.user) return navigate("/login");
        setViewer(context);
        if (!context.teacherPreview && !context.child) setError("أضف طفلًا أولًا من حساب الأسرة قبل بدء اللعبة.");
      } catch (e) {
        if (alive) setError(e.message || "تعذر تجهيز اللعبة.");
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!viewer || !learningActorReady(viewer)) return;
    let alive = true;
    setEngineReady(false);
    setBusy(true);
    (async () => {
      try {
        const engine = new GameEngine({ childId: viewer.child?.id, gameId: "classic-memory", teacherPreview: Boolean(viewer.teacherPreview) });
        await engine.start({ difficulty: "easy" });
        if (!alive) return;
        engineRef.current = engine;
        startedAt.current = performance.now();
        completedRef.current = false;
        setEngineReady(true);
      } catch (e) {
        if (alive) setError(e.message || "تعذر بدء جلسة اللعبة.");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [viewer, roundKey]);

  useEffect(() => {
    if (open.length !== 2) return;
    const [first, second] = open;
    const same = deck[first]?.symbol.name === deck[second]?.symbol.name;
    engineRef.current?.recordAnswer({
      questionType: "matching",
      correct: same,
      metadata: {
        firstSymbol: deck[first]?.symbol.name || null,
        secondSymbol: deck[second]?.symbol.name || null,
        move: moves,
      },
    }).catch(e => setError(e.message || "تعذر تسجيل المحاولة."));
    const timer = window.setTimeout(() => {
      if (same) setMatched(prev => [...new Set([...prev, first, second])]);
      setOpen([]);
    }, same ? 420 : 720);
    return () => window.clearTimeout(timer);
  }, [open, deck, moves]);

  useEffect(() => {
    if (!viewer || !engineReady || matched.length !== deck.length || !deck.length || completedRef.current) return;
    completedRef.current = true;
    setBusy(true);
    (async () => {
      try {
        const elapsedSeconds = Math.max(1, Math.round((performance.now() - startedAt.current) / 1000));
        await engineRef.current?.save({ moves, matchedPairs: matched.length / 2 }, elapsedSeconds);
        const session = await engineRef.current?.complete({ elapsedSeconds, resumeState: { moves, matchedPairs: matched.length / 2 } });
        const result = gameResultSummary(session);
        setMessage(viewer.teacherPreview
          ? `اكتملت اللعبة في وضع معاينة المعلم في ${moves} محاولة. لم يتم تسجيل مكافآت.`
          : result?.rewardAwarded === false
            ? `أحسنت! اكتملت الجولة بدقة ${result?.accuracy || 0}%. مكافأة هذه اللعبة لليوم حصلت عليها مسبقًا.`
            : `ممتاز! اكتملت الجولة بدقة ${result?.accuracy || 0}% وحصلت على ${Number(session?.earned_rewards?.points || 0)} نقطة و${Number(session?.earned_rewards?.stars || 0)} نجمة.`);
      } catch (e) {
        completedRef.current = false;
        setError(e.message || "اكتملت اللعبة لكن تعذر حفظ الجلسة.");
      } finally {
        setBusy(false);
      }
    })();
  }, [matched, deck.length, viewer, engineReady, moves]);

  function flip(index) {
    if (busy || !engineReady || open.length >= 2 || open.includes(index) || matched.includes(index)) return;
    setOpen(prev => {
      const next = [...prev, index];
      if (next.length === 2) setMoves(m => m + 1);
      return next;
    });
  }

  function reset() {
    engineRef.current = null;
    completedRef.current = false;
    setEngineReady(false);
    setDeck(shuffledDeck());
    setOpen([]);
    setMatched([]);
    setMoves(0);
    setMessage("");
    setError("");
    setRoundKey(key => key + 1);
  }

  if (viewer === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز اللعبة...</p></div>;

  const complete = matched.length === deck.length && deck.length > 0;
  const progress = Math.round((matched.length / deck.length) * 100);
  const teacherPreview = Boolean(viewer?.teacherPreview);
  const child = viewer?.child || null;

  return (
    <div className="app game-shell game-shell-v2" dir="rtl">
      <header className="game-topbar"><div className="wrap nav"><button className="brand" onClick={() => navigate("/games")}><span className="logo"><Icon name="brain" size={24} /></span><span><b>لعبة الذاكرة</b><small>{teacherPreview ? "معاينة المعلم" : "طابق البطاقات"}</small></span></button><div className="actions">{teacherPreview ? <span className="reward-chip"><Icon name="teacher" size={17} /> معاينة بلا نقاط</span> : <span className="reward-chip"><Icon name="star" size={17} /> {child?.stars || 0}</span>}<button className="secondary" onClick={() => navigate("/games")}>كل الألعاب</button></div></div></header>

      <main className="wrap page narrow game-page">
        <div className="game-title-block"><span><Icon name="brain" size={18} /> تركيز وذاكرة</span><h1>اكتشف الأزواج المتشابهة</h1><p>{teacherPreview ? "جرّب اللعبة بالكامل كما يراها الطالب. هذه الجولة لا تكتب بيانات طالب." : child ? `افتح بطاقتين في كل مرة يا ${child.display_name}. كل محاولة أصبحت جزءًا من Game Session موحد.` : "اختر طفلًا من حساب الأسرة أولًا."}</p></div>

        {error && <div className="msg error">{error}</div>}
        {message && <div className="msg ok">{message}</div>}

        <section className="game-stage memory-stage">
          <div className="stats" style={{ marginBottom: 14 }}><div><b>{moves}</b><span>محاولة</span></div><div><b>{matched.length / 2}</b><span>زوج مكتمل</span></div><div><b>{Math.max(0,6 - matched.length / 2)}</b><span>متبقي</span></div></div>
          <div className="game-progress" style={{ marginBottom: 20 }}><i style={{ width: `${progress}%` }} /></div>
          <div className="memory-grid">
            {deck.map((card, index) => {
              const visible = open.includes(index) || matched.includes(index);
              const done = matched.includes(index);
              return <button key={card.id} type="button" className={`memory-card ${visible ? "visible" : ""} ${done ? "matched" : ""}`} aria-label={visible ? `بطاقة ${card.symbol.label}` : "بطاقة مخفية"} onClick={() => flip(index)} disabled={!learningActorReady(viewer) || !engineReady || done || busy}><span>{visible ? <Icon name={card.symbol.name} size={34} /> : <span className="card-back-mark">ع</span>}</span></button>;
            })}
          </div>
          {complete && <div className="celebration"><span className="celebration-icon"><Icon name="trophy" size={46} /></span><b>ذاكرة ممتازة</b><small>{busy ? "جارٍ حفظ جلسة GameEngine..." : `أنهيت اللعبة في ${moves} محاولة.`}</small></div>}
          <div className="row" style={{ justifyContent: "center", marginTop: 20 }}><button className="secondary" onClick={() => navigate("/games")}>كل الألعاب</button><button className="primary" onClick={reset}>لعبة جديدة</button></div>
        </section>
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • جلسات الألعاب تُحفظ من محرك واحد.</div></footer>
    </div>
  );
}
