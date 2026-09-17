import React, { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { useAdaptiveGameSession } from "./adaptiveGameSession.js";

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}

function go(path) {
  if (routePath() === path) return;
  history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

const THEMES = {
  "ayah-hunter": {
    title: "صائد الآية",
    subtitle: "جولة صيد متعددة الأهداف",
    kicker: "غابة النجوم",
    intro: "التقط الآية الصحيحة في عدة نقاط، وليس سؤالًا واحدًا.",
    kinds: ["next_ayah"],
    icon: "target",
    optionIcon: "🍃",
    scene: "hunter",
  },
  "where-start": {
    title: "من أين أبدأ؟",
    subtitle: "اصعد البرج طابقًا بعد طابق",
    kicker: "برج البدايات",
    intro: "كل طابق يعيد اختبار بداية آية مختلفة.",
    kinds: ["ayah_beginning"],
    icon: "quran",
    optionIcon: "🚪",
    scene: "tower",
  },
  "what-next": {
    title: "ماذا يأتي بعد؟",
    subtitle: "اختر الطريق الصحيح",
    kicker: "ثلاثة مسارات",
    intro: "كل اختيار صحيح يحركك خطوة جديدة على الطريق.",
    kinds: ["next_ayah"],
    icon: "order",
    optionIcon: "🛤️",
    scene: "road",
  },
  "build-ayah": {
    title: "ابنِ الآية",
    subtitle: "سحب وإفلات حقيقي",
    kicker: "طاولة التركيب",
    intro: "اسحب القطع باللمس أو الماوس، واستخدم لوحة المفاتيح كبديل.",
    kinds: ["word_order"],
    icon: "puzzle",
    scene: "puzzle",
  },
  "memory-race": {
    title: "سباق الذاكرة",
    subtitle: "5–7 نقاط على الطريق",
    kicker: "طريق المغامرة",
    intro: "تتغير المهمة بين التتابع والكلمة الناقصة حتى تصل للنهاية.",
    kinds: ["next_ayah", "missing_word"],
    icon: "memory",
    optionIcon: "☁️",
    scene: "race",
  },
  "surah-treasure": {
    title: "كنز السورة",
    subtitle: "محطات قبل الكنز",
    kicker: "خريطة الكنز",
    intro: "مر بعدة محطات: تتابع، بداية، وكلمة ناقصة.",
    kinds: ["next_ayah", "ayah_beginning", "missing_word"],
    icon: "gift",
    optionIcon: "🗝️",
    scene: "treasure",
  },
  "where-mentioned": {
    title: "أين وردت؟",
    subtitle: "اختر بوابة السورة",
    kicker: "بوابات السور",
    intro: "اقرأ الآية وافتح بوابة السورة التي وردت فيها.",
    kinds: ["surah_name"],
    icon: "search",
    optionIcon: "🏛️",
    scene: "gates",
  },
  "missing-word-adventure": {
    title: "كلمة ضائعة",
    subtitle: "استعد الكلمات في عدة مراحل",
    kicker: "ممر الكلمات",
    intro: "أعد كل كلمة إلى مكانها وتقدم للمحطة التالية.",
    kinds: ["missing_word"],
    icon: "edit",
    optionIcon: "💎",
    scene: "missing",
  },
  "word-box": {
    title: "صندوق الكلمات",
    subtitle: "افتح الصناديق بالترتيب",
    kicker: "صناديق الكلمات",
    intro: "الجولة تمزج الكلمات الناقصة وترتيب أجزاء الآية.",
    kinds: ["missing_word", "word_order"],
    icon: "gift",
    optionIcon: "🎁",
    scene: "boxes",
  },
};

function Header({ theme, teacherPreview }) {
  return (
    <header className="game-topbar">
      <div className="wrap nav">
        <button className="brand" onClick={() => go("/games")}>
          <span className="logo"><Icon name={theme.icon || "game"} size={22} /></span>
          <span><b>{theme.title}</b><small>{teacherPreview ? "معاينة المعلم — بلا كتابة بيانات" : theme.subtitle}</small></span>
        </button>
        <button className="secondary" onClick={() => go("/games")}><Icon name="arrow" size={17} /> عالم الألعاب</button>
      </div>
    </header>
  );
}

function Stars({ count = 0 }) {
  return <div className="result-stars">{[1, 2, 3].map(n => <span key={n} className={n <= count ? "earned" : ""}>★</span>)}</div>;
}

function difficultyLabel(value) {
  if (value === "easy") return "سهل";
  if (value === "hard") return "متقدم";
  return "متوسط";
}

function DifficultyPicker({ value, onChange, auto }) {
  return (
    <div className="adaptive-difficulty">
      <button className={value === "auto" ? "active" : ""} onClick={() => onChange("auto")}>ذكي <small>{difficultyLabel(auto)}</small></button>
      <button className={value === "easy" ? "active" : ""} onClick={() => onChange("easy")}>سهل</button>
      <button className={value === "medium" ? "active" : ""} onClick={() => onChange("medium")}>متوسط</button>
      <button className={value === "hard" ? "active" : ""} onClick={() => onChange("hard")}>متقدم</button>
    </div>
  );
}

function StartPanel({ session }) {
  return (
    <section className="adaptive-start panel">
      <div>
        <span className="game-kicker"><Icon name="sparkle" size={18} /> مستوى الجولة</span>
        <h2>جولة من 5–7 تحديات</h2>
        <p>الوضع الذكي يختار المستوى حسب العمر وأداء الجولات السابقة، ويمكن تغييره يدويًا قبل البداية.</p>
      </div>
      <DifficultyPicker value={session.manualDifficulty} onChange={session.setManualDifficulty} auto={session.autoDifficulty} />
      {session.resumeCandidate ? (
        <div className="resume-card">
          <b>لديك جولة لم تكتمل</b>
          <p>تقدر تكمل من مكانك أو تبدأ جولة جديدة.</p>
          <div className="row">
            <button className="primary" disabled={session.busy} onClick={session.resume}>تكمل من مكانك؟</button>
            <button className="secondary" disabled={session.busy} onClick={session.startNew}>بدء جولة جديدة</button>
          </div>
        </div>
      ) : (
        <button className="primary adaptive-start-button" disabled={session.busy || !session.actorReady} onClick={session.startNew}>
          {session.busy ? "جارٍ تجهيز الجولة..." : "ابدأ الجولة"}
        </button>
      )}
    </section>
  );
}

function ProgressScene({ theme, index, total }) {
  const progress = total ? Math.round((index / total) * 100) : 0;
  const marker = theme.scene === "race" ? "🏃" : theme.scene === "treasure" ? "🗺️" : theme.scene === "tower" ? "🧒" : "⭐";
  return (
    <div className={`adaptive-scene ${theme.scene}`}>
      <div className="adaptive-scene-copy"><span>{theme.kicker}</span><b>المهمة {Math.min(index + 1, total)} من {total}</b></div>
      <div className="adaptive-track"><i style={{ width: `${progress}%` }} /><span style={{ insetInlineStart: `calc(${progress}% - 16px)` }}>{marker}</span></div>
    </div>
  );
}

function Prompt({ challenge }) {
  if (challenge.kind === "missing_word") {
    return <><span className="question-label">أعد الكلمة الضائعة</span><blockquote className="quran-text">{challenge.promptText}</blockquote></>;
  }
  if (challenge.kind === "ayah_beginning") {
    return <><span className="question-label">أي بداية تكمل هذه الآية؟</span><blockquote className="quran-text">{challenge.promptText}</blockquote></>;
  }
  if (challenge.kind === "surah_name") {
    return <><span className="question-label">في أي سورة وردت هذه الآية؟</span><blockquote className="quran-text">{challenge.promptText}</blockquote></>;
  }
  return <><span className="question-label">ما الآية التالية؟</span><blockquote className="quran-text">{challenge.promptText}</blockquote></>;
}

function WordPuzzle({ challenge, onSubmit, busy, revealed }) {
  const [pieces, setPieces] = useState(challenge.pieces);
  const dragIndex = useRef(null);

  useEffect(() => {
    if (revealed) {
      setPieces(challenge.answerOrder.map(id => challenge.pieces.find(piece => piece.id === id)).filter(Boolean));
    } else {
      setPieces(challenge.pieces);
    }
  }, [challenge.id, challenge.pieces, challenge.answerOrder, revealed]);

  function move(from, to) {
    if (to < 0 || to >= pieces.length || from === to) return;
    setPieces(previous => {
      const next = [...previous];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function pointerDown(event, index) {
    if (busy || revealed) return;
    dragIndex.current = index;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event) {
    if (dragIndex.current == null || busy || revealed) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-piece-index]");
    if (!target) return;
    const to = Number(target.dataset.pieceIndex);
    if (Number.isFinite(to) && to !== dragIndex.current) {
      move(dragIndex.current, to);
      dragIndex.current = to;
    }
  }

  function pointerUp() {
    dragIndex.current = null;
  }

  function keyboardMove(event, index) {
    if (busy || revealed) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(index, index + 1);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(index, index - 1);
    }
  }

  return (
    <div className="adaptive-puzzle">
      <div className="adaptive-pieces">
        {pieces.map((piece, index) => (
          <article
            key={piece.id}
            data-piece-index={index}
            tabIndex="0"
            onPointerDown={event => pointerDown(event, index)}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onKeyDown={event => keyboardMove(event, index)}
          >
            <span className="drag-handle">↕</span><b>{piece.label}</b><small>{index + 1}</small>
          </article>
        ))}
      </div>
      <button className="primary full" disabled={busy || revealed} onClick={() => onSubmit(pieces.map(piece => piece.id))}>تحقق من الترتيب</button>
      <small className="keyboard-note">اسحب باللمس أو الماوس، أو استخدم الأسهم من لوحة المفاتيح.</small>
    </div>
  );
}

function Feedback({ session, challenge }) {
  return (
    <>
      {session.hintVisible && <div className="adaptive-hint"><Icon name="lightbulb" size={18} />{challenge.hint}</div>}
      {session.feedback && <div className={session.revealed ? "msg error" : "msg ok"}>{session.feedback}</div>}
      <div className="attempt-dots"><span className={session.attempt >= 1 ? "used" : ""} /><span className={session.attempt >= 2 ? "used" : ""} /><span className={session.attempt >= 3 ? "used" : ""} /></div>
    </>
  );
}

function ChallengeView({ theme, session }) {
  const challenge = session.challenge;
  if (!challenge) return null;
  if (challenge.kind === "word_order") {
    return (
      <section className="adaptive-challenge puzzle">
        <div className="challenge-heading"><span>رتّب الآية</span><h2>{challenge.promptText}</h2></div>
        <WordPuzzle challenge={challenge} onSubmit={session.submitOrder} busy={session.busy} revealed={session.revealed} />
        <Feedback session={session} challenge={challenge} />
      </section>
    );
  }
  return (
    <section className={`adaptive-challenge ${theme.scene}`}>
      <Prompt challenge={challenge} />
      <div className="adaptive-options">
        {challenge.options.map(option => (
          <button
            key={option.id}
            disabled={session.busy || session.revealed}
            className={session.revealed && String(option.id) === String(challenge.answerId) ? "revealed-correct" : ""}
            onClick={() => session.choose(option)}
          >
            <span>{theme.optionIcon || "✨"}</span><b>{option.label}</b>
          </button>
        ))}
      </div>
      <Feedback session={session} challenge={challenge} />
    </section>
  );
}

function ResultPanel({ theme, session }) {
  const result = session.result;
  const summary = result?.summary;
  if (!result || !summary) return null;
  return (
    <section className="adaptive-result panel">
      <span className="adaptive-trophy"><Icon name="trophy" size={45} /></span>
      <h2>اكتملت رحلة {theme.title}</h2>
      <Stars count={summary.stars} />
      <div className="adaptive-result-grid">
        <div><b>{summary.score}</b><small>Score</small></div>
        <div><b>{summary.accuracy}%</b><small>دقة</small></div>
        <div><b>{summary.correct}</b><small>إجابات صحيحة</small></div>
        <div><b>{summary.wrong}</b><small>محاولات خاطئة</small></div>
        <div><b>{result.reviewKeys.length}</b><small>آيات تحتاج مراجعة</small></div>
        <div><b>{result.bestScore}</b><small>أفضل نتيجة</small></div>
      </div>
      <p>{session.viewer?.teacherPreview ? "هذه معاينة فقط ولم تُكتب جلسة أو مكافآت أو Review Queue." : result.improved ? "نتيجتك تحسنت عن أفضل نتيجة سابقة." : result.previousBest ? "حافظ على الاستمرار لتحسين أفضل نتيجة." : "هذه أول نتيجة محفوظة لهذه اللعبة."}</p>
      {!session.viewer?.teacherPreview && result.reviewKeys.length > 0 && <div className="adaptive-review-list"><b>آيات نرجع لها في المراجعة</b><div>{result.reviewKeys.map(key => { const [surah, ayah] = key.split(":"); return <span key={key}>سورة {surah} • آية {ayah}</span>; })}</div></div>}
      {result.suggestedDifficulty !== session.difficulty && <div className="adaptive-suggestion">الجولة القادمة مناسبة على مستوى <b>{difficultyLabel(result.suggestedDifficulty)}</b>.</div>}
      <div className="row"><button className="secondary" onClick={() => go("/games")}>عالم الألعاب</button><button className="primary" onClick={session.reset}>جولة جديدة</button></div>
    </section>
  );
}

function AdaptiveGame({ gameId }) {
  const theme = THEMES[gameId];
  const session = useAdaptiveGameSession(gameId, theme.kinds);
  if (session.viewer === undefined || session.loading) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز الجولة الذكية...</p></div>;
  return (
    <div className="app adventure-pack adaptive-pack" dir="rtl">
      <Header theme={theme} teacherPreview={Boolean(session.viewer?.teacherPreview)} />
      <main className="wrap page adventure-page">
        <section className="adventure-intro"><span>{theme.kicker}</span><h1>{theme.title}</h1><p>{theme.intro}</p></section>
        {session.error && <div className="msg error">{session.error}</div>}
        {session.result ? (
          <ResultPanel theme={theme} session={session} />
        ) : !session.active ? (
          <StartPanel session={session} />
        ) : (
          <><ProgressScene theme={theme} index={session.index} total={session.total} /><ChallengeView theme={theme} session={session} /></>
        )}
      </main>
      <footer><div className="wrap">أبو العزايم للحفظ الممتع • الجولة تمزج المراجعة المستحقة مع المحتوى الذي درسه الطفل.</div></footer>
    </div>
  );
}

function BlockedGame({ title }) {
  return (
    <div className="app adventure-pack" dir="rtl">
      <main className="wrap page narrow">
        <section className="panel focus">
          <h1>{title}</h1>
          <p>هذه اللعبة لا تصبح live حتى يتوفر Dataset متشابهات قرآنية مُراجع، بدل الاعتماد على تشابه لفظي عشوائي.</p>
          <button className="primary" onClick={() => go("/games")}>العودة للألعاب</button>
        </section>
      </main>
    </div>
  );
}

export const AyahHunterGame = () => <AdaptiveGame gameId="ayah-hunter" />;
export const WhereStartGame = () => <AdaptiveGame gameId="where-start" />;
export const WhatNextGame = () => <AdaptiveGame gameId="what-next" />;
export const BuildAyahGame = () => <AdaptiveGame gameId="build-ayah" />;
export const MemoryRaceGame = () => <AdaptiveGame gameId="memory-race" />;
export const SurahTreasureGame = () => <AdaptiveGame gameId="surah-treasure" />;
export const SimilarityMirrorGame = () => <BlockedGame title="مرآة المتشابهات" />;
export const WhereMentionedGame = () => <AdaptiveGame gameId="where-mentioned" />;
export const SimilarityBoxesGame = () => <BlockedGame title="صندوق المتشابهات" />;
export const MissingWordAdventureGame = () => <AdaptiveGame gameId="missing-word-adventure" />;
export const WordBoxGame = () => <AdaptiveGame gameId="word-box" />;

export const NEW_GAME_ROUTES = {
  "/games/ayah-hunter": AyahHunterGame,
  "/games/where-start": WhereStartGame,
  "/games/what-next": WhatNextGame,
  "/games/build-ayah": BuildAyahGame,
  "/games/memory-race": MemoryRaceGame,
  "/games/surah-treasure": SurahTreasureGame,
  "/games/similarity-mirror": SimilarityMirrorGame,
  "/games/where-mentioned": WhereMentionedGame,
  "/games/similarity-boxes": SimilarityBoxesGame,
  "/games/missing-word-adventure": MissingWordAdventureGame,
  "/games/word-box": WordBoxGame,
};
