import { useEffect, useMemo, useRef, useState } from "react";
import { getProgress } from "./api.js";
import { loadLearningViewer, learningActorReady } from "./learningViewer.js";
import { loadQuranData } from "./quranCorpus.js";
import { GameEngine, gameResultSummary } from "./gameEngine.js";
import { SoundEngine } from "./soundEngine.js";
import {
  adaptiveResumeState,
  createAdaptivePlan,
  hydrateAdaptiveChallenge,
  isAdaptiveResumeState,
  recentAyahKeys,
  recommendDifficulty,
  suggestNextDifficulty,
} from "./adaptiveLearning.js";

const SAFE_SURAHS = [112, 113, 114, 108, 109, 110, 111, 103, 104, 105, 106, 107, 67];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}

function navigate(path) {
  if (routePath() === path) return;
  history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useAdaptiveGameSession(gameId, kinds) {
  const [viewer, setViewer] = useState(undefined);
  const [quran, setQuran] = useState(null);
  const [surahs, setSurahs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [manualDifficulty, setManualDifficulty] = useState("auto");
  const [progressRow, setProgressRow] = useState(null);
  const [dueReview, setDueReview] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [resumeCandidate, setResumeCandidate] = useState(null);
  const [engine, setEngine] = useState(null);
  const [plan, setPlan] = useState([]);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [wrongKeys, setWrongKeys] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const runStartedAt = useRef(0);
  const challengeStartedAt = useRef(0);
  const baseElapsed = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const context = await loadLearningViewer();
        if (!alive) return;
        if (!context.user) return navigate("/login");
        const corpus = await loadQuranData();
        let choices = SAFE_SURAHS;
        let currentProgress = null;
        let review = [];
        let events = [];
        let incomplete = null;

        if (!context.teacherPreview && context.child?.id) {
          const learning = await getProgress(context.child.id);
          const studied = (learning || [])
            .filter(row => Number(row.memorized_percent || 0) > 0)
            .map(row => Number(row.surah_number));
          if (studied.length) choices = [...new Set(studied)];
          const [gameProgress, due, recent, latest] = await Promise.all([
            GameEngine.progress(context.child.id, gameId),
            GameEngine.dueReview(context.child.id, 40),
            GameEngine.recentEvents(context.child.id, gameId, 40),
            GameEngine.latestIncomplete(context.child.id, gameId),
          ]);
          currentProgress = gameProgress?.[0] || null;
          review = due || [];
          events = recent || [];
          incomplete = latest || null;
        }

        if (!alive) return;
        setViewer(context);
        setQuran(corpus);
        setSurahs(choices.filter(number => corpus.surahs.some(surah => Number(surah.number) === Number(number))));
        setProgressRow(currentProgress);
        setDueReview(review);
        setRecentEvents(events);
        setResumeCandidate(incomplete && isAdaptiveResumeState(incomplete.resume_state, gameId) ? incomplete : null);
      } catch (cause) {
        if (alive) setError(cause.message || "تعذر تجهيز الجولة الذكية.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [gameId]);

  const autoDifficulty = useMemo(
    () => recommendDifficulty({ child: viewer?.child, progress: progressRow }),
    [viewer?.child, progressRow],
  );
  const difficulty = manualDifficulty === "auto" ? autoDifficulty : manualDifficulty;
  const challenge = useMemo(
    () => (quran && plan[index] ? hydrateAdaptiveChallenge(quran, plan[index], difficulty) : null),
    [quran, plan, index, difficulty],
  );

  useEffect(() => {
    if (challenge?.id) challengeStartedAt.current = performance.now();
  }, [challenge?.id]);

  function elapsedSeconds() {
    if (!runStartedAt.current) return baseElapsed.current;
    return baseElapsed.current + Math.max(0, Math.round((performance.now() - runStartedAt.current) / 1000));
  }

  function state(nextIndex = index, nextAttempt = attempt, nextWrong = wrongKeys) {
    return adaptiveResumeState({
      gameId,
      difficulty,
      plan,
      index: nextIndex,
      attempt: nextAttempt,
      wrongKeys: nextWrong,
      startedAt: new Date().toISOString(),
    });
  }

  async function startNew() {
    if (!quran || !viewer) return;
    setBusy(true);
    setError("");
    try {
      if (resumeCandidate && !viewer.teacherPreview) await GameEngine.abandonSession(resumeCandidate.id);
      const seed = `${gameId}:${viewer?.child?.id || "preview"}:${Date.now()}`;
      const nextPlan = createAdaptivePlan({
        gameId,
        quran,
        surahNumbers: surahs,
        reviewQueue: dueReview,
        recentKeys: recentAyahKeys(recentEvents),
        difficulty,
        kinds,
        seed,
      });
      const nextEngine = new GameEngine({
        childId: viewer?.child?.id,
        gameId,
        teacherPreview: Boolean(viewer?.teacherPreview),
      });
      const distinctSurahs = [...new Set(nextPlan.map(item => item.surahNumber))];
      await nextEngine.start({
        difficulty,
        surahNumber: distinctSurahs.length === 1 ? distinctSurahs[0] : null,
        ayahNumbers: [...new Set(nextPlan.map(item => item.ayahNumber))],
      });
      setEngine(nextEngine);
      setPlan(nextPlan);
      setIndex(0);
      setAttempt(0);
      setHintVisible(false);
      setRevealed(false);
      setFeedback("");
      setWrongKeys([]);
      setResult(null);
      setResumeCandidate(null);
      baseElapsed.current = 0;
      runStartedAt.current = performance.now();
      if (!viewer.teacherPreview) {
        await nextEngine.save(
          adaptiveResumeState({
            gameId,
            difficulty,
            plan: nextPlan,
            index: 0,
            attempt: 0,
            wrongKeys: [],
            startedAt: new Date().toISOString(),
          }),
          0,
        );
      }
    } catch (cause) {
      setError(cause.message || "تعذر بدء الجولة.");
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    if (!resumeCandidate || !quran || !viewer?.child?.id) return;
    setBusy(true);
    setError("");
    try {
      const saved = resumeCandidate.resume_state;
      const nextEngine = new GameEngine({ childId: viewer.child.id, gameId, teacherPreview: false });
      nextEngine.attach(resumeCandidate);
      setManualDifficulty(resumeCandidate.difficulty || saved.difficulty || "medium");
      setEngine(nextEngine);
      setPlan(saved.plan);
      setIndex(Math.min(Number(saved.index || 0), saved.plan.length - 1));
      setAttempt(Number(saved.attempt || 0));
      setWrongKeys(saved.wrongKeys || []);
      setHintVisible(Number(saved.attempt || 0) >= 1);
      setRevealed(false);
      setFeedback("رجعنا لنفس المكان الذي توقفت عنده.");
      setResult(null);
      baseElapsed.current = Number(resumeCandidate.elapsed_seconds || 0);
      runStartedAt.current = performance.now();
    } catch (cause) {
      setError(cause.message || "تعذر استكمال الجولة السابقة.");
    } finally {
      setBusy(false);
    }
  }

  async function finish(nextEngine, nextWrong) {
    const completed = await nextEngine.complete({ elapsedSeconds: elapsedSeconds(), resumeState: {} });
    const summary = gameResultSummary(completed);
    let currentProgress = progressRow;
    if (!viewer?.teacherPreview && viewer?.child?.id) {
      const rows = await GameEngine.progress(viewer.child.id, gameId);
      currentProgress = rows?.[0] || progressRow;
    }
    const previousBest = Number(progressRow?.best_score || 0);
    setResult({
      session: completed,
      summary,
      previousBest,
      bestScore: Number(currentProgress?.best_score || completed?.score || 0),
      improved: Number(completed?.score || 0) > previousBest,
      reviewKeys: nextWrong,
      suggestedDifficulty: suggestNextDifficulty(difficulty, summary?.accuracy || 0),
    });
    setEngine(null);
    setResumeCandidate(null);
    SoundEngine.win();
  }

  async function advance(nextEngine, nextWrong) {
    const nextIndex = index + 1;
    if (nextIndex >= plan.length) {
      await finish(nextEngine, nextWrong);
      return;
    }
    await nextEngine.save(state(nextIndex, 0, nextWrong), elapsedSeconds());
    setIndex(nextIndex);
    setAttempt(0);
    setHintVisible(false);
    setRevealed(false);
    setFeedback("");
  }

  async function submit(correct, extra = {}) {
    if (!engine || !challenge || busy || revealed) return;
    setBusy(true);
    const nextAttempt = attempt + 1;
    const usedHint = nextAttempt >= 2;
    const key = `${challenge.surahNumber}:${challenge.ayahNumber}`;
    const nextWrong = correct ? wrongKeys : [...new Set([...wrongKeys, key])];
    try {
      await engine.recordAnswer({
        surahNumber: challenge.surahNumber,
        ayahNumber: challenge.ayahNumber,
        questionType: challenge.kind,
        correct,
        usedHint,
        responseTimeMs: Math.max(0, Math.round(performance.now() - challengeStartedAt.current)),
        metadata: {
          difficulty,
          attemptNumber: nextAttempt,
          optionCount: challenge.optionCount || challenge.pieces?.length || 0,
          reviewSource: challenge.source === "review_queue" ? "due_review" : "none",
          questionSource: challenge.source,
          currentStage: index + 1,
          hintType: usedHint ? (challenge.kind === "word_order" ? "first_piece" : "guided_clue") : "none",
          ...extra.metadata,
        },
      });

      if (correct) {
        SoundEngine.correct();
        setFeedback(nextAttempt === 1 ? "ممتاز! من أول محاولة." : "أحسنت، ثبتت الإجابة.");
        setWrongKeys(nextWrong);
        await engine.save(state(index, nextAttempt, nextWrong), elapsedSeconds());
        await pause(450);
        await advance(engine, nextWrong);
        return;
      }

      SoundEngine.wrong();
      setWrongKeys(nextWrong);
      if (nextAttempt === 1) {
        setAttempt(1);
        setHintVisible(true);
        setFeedback("قريب! المحاولة الثانية معها تلميح صغير.");
        await engine.save(state(index, 1, nextWrong), elapsedSeconds());
      } else if (nextAttempt === 2) {
        setAttempt(2);
        setHintVisible(true);
        setFeedback("حاول مرة أخيرة. ركّز في التلميح.");
        await engine.save(state(index, 2, nextWrong), elapsedSeconds());
      } else {
        setAttempt(3);
        setHintVisible(true);
        setRevealed(true);
        setFeedback(`الإجابة الصحيحة: ${challenge.answerLabel}`);
        await engine.save(state(index, 3, nextWrong), elapsedSeconds());
        await pause(900);
        await advance(engine, nextWrong);
      }
    } catch (cause) {
      setError(cause.message || "تعذر تسجيل المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  async function choose(option) {
    return submit(String(option.id) === String(challenge?.answerId), {
      metadata: {
        selectedOption: String(option.id),
        correctOption: String(challenge?.answerId),
      },
    });
  }

  async function submitOrder(order) {
    const correct = Boolean(
      challenge?.answerOrder
      && order.length === challenge.answerOrder.length
      && order.every((id, position) => id === challenge.answerOrder[position]),
    );
    return submit(correct, {
      metadata: { submittedOrder: order, correctOrder: challenge?.answerOrder || [] },
    });
  }

  function reset() {
    setPlan([]);
    setIndex(0);
    setAttempt(0);
    setHintVisible(false);
    setRevealed(false);
    setFeedback("");
    setWrongKeys([]);
    setResult(null);
    setEngine(null);
    setError("");
  }

  return {
    viewer,
    loading,
    error,
    manualDifficulty,
    setManualDifficulty,
    autoDifficulty,
    difficulty,
    resumeCandidate,
    challenge,
    index,
    total: plan.length,
    attempt,
    hintVisible,
    revealed,
    feedback,
    result,
    busy,
    startNew,
    resume,
    choose,
    submitOrder,
    reset,
    active: Boolean(engine && challenge),
    actorReady: learningActorReady(viewer),
  };
}
