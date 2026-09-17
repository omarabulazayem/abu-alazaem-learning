import React, { useEffect, useMemo, useRef, useState } from "react";
import { SURAHS } from "./quranData.js";
import { loadLearningViewer, learningActorReady } from "./learningViewer.js";
import { GameEngine, gameResultSummary } from "./gameEngine.js";
import Icon from "./Icon.jsx";

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}
function navigate(path) {
  if (routePath() !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}
function shuffle(list) { return [...list].sort(() => Math.random() - 0.5); }
function makeRound() {
  const start = 78 + Math.floor(Math.random() * 33);
  const correct = SURAHS.slice(start - 1, start + 3);
  return { correct, cards: shuffle(correct) };
}

export default function SurahOrderGame() {
  const [viewer, setViewer] = useState(undefined);
  const [roundData, setRoundData] = useState(() => makeRound());
  const [round, setRound] = useState(1);
  const [picked, setPicked] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
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
        if (!context.teacherPreview && !context.child) setError("أضف طفلًا أولًا من حساب الأسرة.");
      } catch (e) {
        if (alive) setError(e.message || "تعذر تجهيز اللعبة.");
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!viewer || !learningActorReady(viewer)) return;
    let alive = true;
    setBusy(true);
    setEngineReady(false);
    (async () => {
      try {
        const engine = new GameEngine({ childId: viewer.child?.id, gameId: "classic-surah-order", teacherPreview: Boolean(viewer.teacherPreview) });
        await engine.start({ difficulty: "easy" });
        if (!alive) return;
        engineRef.current = engine;
        startedAt.current = performance.now();
        completedRef.current = false;
        setEngineReady(true);
      } catch (e) {
        if (alive) setError(e.message || "تعذر بدء جلسة ترتيب السور.");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [viewer, sessionKey]);

  const expected = useMemo(() => roundData.correct[picked.length], [roundData, picked.length]);
  const teacherPreview = Boolean(viewer?.teacherPreview);
  const child = viewer?.child || null;

  async function finishSession() {
    if (completedRef.current || !engineRef.current) return;
    completedRef.current = true;
    setBusy(true);
    try {
      const elapsedSeconds = Math.max(1, Math.round((performance.now() - startedAt.current) / 1000));
      await engineRef.current.save({ round, mistakes, solved: true }, elapsedSeconds);
      const session = await engineRef.current.complete({ elapsedSeconds, resumeState: { round: 3, mistakes, solved: true } });
      const result = gameResultSummary(session);
      setMessage(teacherPreview
        ? `اكتملت الجولات الثلاث في معاينة المعلم بدقة ${result?.accuracy || 0}%. لم تُكتب بيانات طالب.`
        : result?.rewardAwarded === false
          ? `أحسنت! اكتمل التحدي بدقة ${result?.accuracy || 0}%. مكافأة اليوم لهذه اللعبة حصلت عليها مسبقًا.`
          : `رائع! اكتمل التحدي بدقة ${result?.accuracy || 0}% وحصلت على ${Number(session?.earned_rewards?.points || 0)} نقطة و${Number(session?.earned_rewards?.stars || 0)} نجمة.`);
    } catch (e) {
      completedRef.current = false;
      setError(e.message || "اكتملت اللعبة لكن تعذر حفظ الجلسة.");
    } finally {
      setBusy(false);
    }
  }

  async function choose(card) {
    if (solved || busy || !engineReady || picked.some(x => x.number === card.number)) return;
    const correct = card.number === expected?.number;
    try {
      await engineRef.current.recordAnswer({
        surahNumber: card.number,
        questionType: "surah_order",
        correct,
        metadata: { round, position: picked.length + 1, expectedSurah: expected?.number || null, selectedSurah: card.number },
      });
    } catch (e) {
      setError(e.message || "تعذر تسجيل الإجابة.");
      return;
    }
    if (!correct) {
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
      if (round === 3) await finishSession(); else setMessage("ترتيب صحيح! انتقل للجولة التالية.");
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
    engineRef.current = null;
    completedRef.current = false;
    setEngineReady(false);
    setRound(1);
    setRoundData(makeRound());
    setPicked([]);
    setMistakes(0);
    setSolved(false);
    setMessage("");
    setError("");
    setSessionKey(key => key + 1);
  }

  if (viewer === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز اللعبة...</p></div>;

  return (
    <div className="app game-shell game-shell-v2" dir="rtl">
      <header className="game-topbar"><div className="wrap nav"><button className="brand" onClick={() => navigate("/games")}><span className="logo"><Icon name="puzzle" size={24} /></span><span><b>رتّب السور</b><small>{teacherPreview ? "معاينة المعلم" : "GameEngine • ترتيب المصحف"}</small></span></button><div className="actions"><span className="reward-chip">{teacherPreview ? <><Icon name="teacher" size={17} /> معاينة بلا نقاط</> : <>الجولة {round}/٣</>}</span>{!teacherPreview && child && <span className="reward-chip"><Icon name="star" size={17}/>{child.stars || 0}</span>}<button className="secondary" onClick={() => navigate("/games")}>كل الألعاب</button></div></div></header>
      <main className="wrap page narrow game-page">
        <div className="game-title-block"><span><Icon name="puzzle" size={18} /> تحدي الترتيب</span><h1>أي سورة تأتي أولًا؟</h1><p>{teacherPreview ? "جرّب التحدي كما يراه الطالب. كل إجابة تمر بالمحرك لكن المعاينة لا تكتب بيانات." : "اضغط أسماء السور بالترتيب الصحيح. كل اختيار أصبح مسجلًا داخل نفس GameEngine المستخدم في ألعاب القرآن."}</p></div>
        <div className="game-round-dots">{[1,2,3].map(n => <i key={n} className={n < round || (n === round && solved) ? "done" : n === round ? "active" : ""}>{n}</i>)}</div>
        {error && <div className="msg error">{error}</div>}{message && <div className="msg ok">{message}</div>}
        <section className="game-stage order-stage">
          <div className="picked-order">{roundData.correct.map((_, index) => <div className={picked[index] ? "picked-slot filled" : "picked-slot"} key={index}>{picked[index] ? <><b>{picked[index].name}</b><small>رقم {picked[index].number}</small></> : <span>{index + 1}</span>}</div>)}</div>
          <div className="order-options">{roundData.cards.map(card => { const used = picked.some(x => x.number === card.number); return <button key={card.number} className={used ? "order-option used" : "order-option"} disabled={used || solved || !learningActorReady(viewer) || !engineReady || busy} onClick={() => choose(card)}><span>سورة</span><b>{card.name}</b></button>; })}</div>
          <div className="game-meta"><span><Icon name="close" size={15} /> أخطاء: <b>{mistakes}</b></span><span><Icon name="check" size={15} /> صحيح: <b>{picked.length}/٤</b></span></div>
          {solved && round < 3 && <button className="primary game-cta" onClick={nextRound}>الجولة التالية <Icon name="arrow" size={18} /></button>}
          {solved && round === 3 && <div className="celebration"><span className="celebration-icon"><Icon name="trophy" size={46} /></span><b>بطل ترتيب السور</b><small>{busy ? "جارٍ حفظ جلسة GameEngine..." : "اكتمل التحدي وتم حفظ نتيجته."}</small></div>}
          {solved && round === 3 && <button className="secondary game-cta" onClick={restart}>العب من جديد</button>}
        </section>
      </main>
      <footer><div className="wrap">أبو العزايم للحفظ الممتع • لعبة واحدة ومحرك تقدم واحد.</div></footer>
    </div>
  );
}
