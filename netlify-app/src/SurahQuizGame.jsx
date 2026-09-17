import React, { useEffect, useMemo, useState } from "react";
import { claimReward, dayKey } from "./api.js";
import { SURAHS } from "./quranData.js";
import { loadLearningViewer, learningActorReady } from "./learningViewer.js";
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
function makeQuestions() {
  const pool = SURAHS.filter(s => s.number >= 78);
  const picked = shuffle(pool).slice(0, 5);
  return picked.map((surah, index) => {
    const askAyahs = index % 2 === 1;
    const value = askAyahs ? surah.ayahs : surah.number;
    const wrong = shuffle(pool.filter(s => s.number !== surah.number)).map(s => askAyahs ? s.ayahs : s.number).filter((v, i, arr) => v !== value && arr.indexOf(v) === i).slice(0, 3);
    return { surah, type: askAyahs ? "ayahs" : "number", answer: value, options: shuffle([value, ...wrong]) };
  });
}

export default function SurahQuizGame() {
  const [viewer, setViewer] = useState(undefined);
  const [questions, setQuestions] = useState(() => makeQuestions());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
        if (alive) setError(e.message || "تعذر تجهيز الاختبار.");
      }
    })();
    return () => { alive = false; };
  }, []);

  const question = questions[index];
  const progress = Math.round(((index + (selected !== null ? 1 : 0)) / questions.length) * 100);
  const teacherPreview = Boolean(viewer?.teacherPreview);

  async function finish(nextScore) {
    setFinalScore(nextScore);
    setFinished(true);
    if (teacherPreview) {
      setMessage(`انتهت معاينة المعلم بنتيجة ${nextScore}/5. لم يتم تسجيل نقاط أو إنجازات.`);
      return;
    }
    if (nextScore < 4 || !viewer?.child?.id) {
      setMessage("محاولة جميلة! تحتاج ٤ إجابات صحيحة على الأقل للحصول على مكافأة اليوم.");
      return;
    }
    setBusy(true);
    try {
      const result = await claimReward(viewer.child.id, "surah_quiz_game", dayKey("quiz"));
      const value = Array.isArray(result) ? result[0] : result;
      setMessage(value?.awarded === false ? "ممتاز! اجتزت الاختبار. مكافأة اليوم حصلت عليها مسبقًا." : "أحسنت! اجتزت الاختبار وحصلت على ٢٥ نقطة ونجمة.");
    } catch (e) { setError(e.message || "اجتزت الاختبار لكن تعذر تسجيل المكافأة."); }
    finally { setBusy(false); }
  }

  function answer(value) { if (selected !== null || finished || !question) return; setSelected(value); }
  function next() {
    if (selected === null || !question) return;
    const correct = Number(selected) === Number(question.answer);
    const nextScore = score + (correct ? 1 : 0);
    setScore(nextScore);
    if (index === questions.length - 1) return finish(nextScore);
    setIndex(i => i + 1); setSelected(null); setError("");
  }
  function restart() { setQuestions(makeQuestions()); setIndex(0); setScore(0); setSelected(null); setFinished(false); setFinalScore(0); setMessage(""); setError(""); }

  const answerState = useMemo(() => {
    if (selected === null || !question) return null;
    return Number(selected) === Number(question.answer) ? "correct" : "wrong";
  }, [selected, question]);

  if (viewer === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز الاختبار...</p></div>;

  return (
    <div className="app game-shell game-shell-v2" dir="rtl">
      <header className="game-topbar"><div className="wrap nav"><button className="brand" onClick={() => navigate("/games")}><span className="logo"><Icon name="bolt" size={24} /></span><span><b>اختبار السور</b><small>{teacherPreview ? "معاينة المعلم" : "أسئلة سريعة"}</small></span></button><div className="actions"><span className="reward-chip">{teacherPreview ? <><Icon name="teacher" size={17} /> معاينة بلا نقاط</> : <><Icon name="star" size={17} /> {viewer?.child?.stars || 0}</>}</span><button className="secondary" onClick={() => navigate("/games")}>كل الألعاب</button></div></div></header>
      <main className="wrap page narrow game-page">
        <div className="game-title-block"><span><Icon name="bolt" size={18} /> خمس أسئلة</span><h1>ماذا تعرف عن السور؟</h1><p>{teacherPreview ? "جرّب الاختبار كما يراه الطالب. النتيجة تظهر بالكامل من غير تسجيل مكافأة." : "اختر الإجابة الصحيحة. تحتاج ٤ من ٥ للحصول على مكافأة اليوم."}</p></div>
        {error && <div className="msg error">{error}</div>}{message && <div className="msg ok">{message}</div>}
        {!finished ? (
          <section className="game-stage quiz-stage">
            <div className="quiz-head"><span>السؤال {index + 1} من {questions.length}</span><b>{score} نقطة صحيحة</b></div>
            <div className="game-progress"><i style={{ width: `${progress}%` }} /></div>
            <div className="question-card"><span>سورة {question.surah.name}</span><h2>{question.type === "number" ? "ما رقم هذه السورة في المصحف؟" : "كم عدد آيات هذه السورة؟"}</h2></div>
            <div className="choice-grid">{question.options.map(value => {
              const isSelected = Number(selected) === Number(value);
              const isCorrect = Number(value) === Number(question.answer);
              let state = "";
              if (selected !== null && isCorrect) state = "correct";
              else if (selected !== null && isSelected && !isCorrect) state = "wrong";
              return <button key={value} disabled={selected !== null || !learningActorReady(viewer)} className={`choice ${state}`} onClick={() => answer(value)}>{value}</button>;
            })}</div>
            {selected !== null && <div className={`answer-feedback ${answerState}`}><b>{answerState === "correct" ? <><Icon name="circleCheck" size={17} /> إجابة صحيحة</> : <><Icon name="close" size={17} /> ليست الإجابة الصحيحة</>}</b><span>الإجابة: {question.answer}</span></div>}
            <button className="primary game-cta" disabled={selected === null} onClick={next}>{index === questions.length - 1 ? "اعرض النتيجة" : <>السؤال التالي <Icon name="arrow" size={18} /></>}</button>
          </section>
        ) : (
          <section className="game-stage result-stage">
            <div className="result-ring"><strong>{finalScore}/5</strong><span>{finalScore >= 4 ? "ممتاز" : "جرّب مرة أخرى"}</span></div>
            <div className="result-medal"><Icon name={finalScore >= 4 ? "medal" : "review"} size={38} /></div>
            <h2>{finalScore === 5 ? "إجابات كاملة" : finalScore >= 4 ? "أداء رائع" : "أنت قريب"}</h2>
            <p>{teacherPreview ? "هذه نتيجة المعاينة فقط ولم تُسجل على أي طالب." : finalScore >= 4 ? "أثبت أنك تعرف السور جيدًا." : "أعد المحاولة وستتذكر الأرقام أسرع."}</p>
            <div className="row" style={{ justifyContent: "center" }}><button className="secondary" onClick={() => navigate("/games")}>كل الألعاب</button><button className="primary" disabled={busy} onClick={restart}>اختبار جديد</button></div>
          </section>
        )}
      </main>
      <footer><div className="wrap">أبو العزايم للحفظ الممتع • اختبر نفسك وتعلم من كل محاولة.</div></footer>
    </div>
  );
}
