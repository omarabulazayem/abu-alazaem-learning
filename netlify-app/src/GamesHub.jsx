import React, { useEffect, useMemo, useState } from "react";
import { listRewardsToday, signOut } from "./api.js";
import { isChildModeActive } from "./ChildHub.jsx";
import { loadLearningViewer, learningActorReady } from "./learningViewer.js";

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}
function navigate(path) {
  if (routePath() !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

const games = [
  { key: "memory_game", icon: "🧠", title: "لعبة الذاكرة", description: "طابق البطاقات المتشابهة بأقل عدد من المحاولات.", reward: "٣٥ نقطة + نجمتان", route: "/games/memory", className: "memory", level: "سهل" },
  { key: "surah_order_game", icon: "🧩", title: "رتّب السور", description: "اختر السور بالترتيب الصحيح كما تظهر في المصحف.", reward: "٣٠ نقطة + نجمة", route: "/games/order", className: "order", level: "متوسط" },
  { key: "surah_quiz_game", icon: "⚡", title: "اختبار السور", description: "خمسة أسئلة سريعة عن أسماء السور وأرقامها.", reward: "٢٥ نقطة + نجمة", route: "/games/quiz", className: "quiz", level: "تحدي" },
];

export default function GamesHub() {
  const [viewer, setViewer] = useState(undefined);
  const [rewards, setRewards] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const context = await loadLearningViewer();
        if (!alive) return;
        if (!context.user) return navigate("/login");
        setViewer(context);
        if (context.teacherPreview) return;
        if (!context.child) {
          setError("أضف طفلًا أولًا من حساب الأسرة قبل بدء الألعاب.");
          return;
        }
        const today = await listRewardsToday(context.child.id);
        if (alive) setRewards(today || []);
      } catch (e) {
        if (alive) setError(e.message || "تعذر تحميل الألعاب.");
      }
    })();
    return () => { alive = false; };
  }, []);

  const completed = useMemo(() => new Set(rewards.map(r => r.source_type)), [rewards]);
  const completedGames = games.filter(g => completed.has(g.key)).length;
  const childMode = isChildModeActive();
  const teacherPreview = Boolean(viewer?.teacherPreview);
  const child = viewer?.child || null;

  async function logout() {
    await signOut();
    navigate("/");
  }

  if (viewer === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز الألعاب...</p></div>;

  return (
    <div className="app game-shell" dir="rtl">
      <header>
        <div className="wrap nav">
          <button className="brand" onClick={() => navigate(teacherPreview ? "/teacher" : childMode ? "/child" : "/")}>
            <span className="logo">ع</span><span><b>أبو العزايم</b><small>منطقة الألعاب</small></span>
          </button>
          <div className="actions">
            {teacherPreview ? <span className="reward-chip">👨‍🏫 معاينة المعلم</span> : <><span className="reward-chip">⭐ {child?.stars || 0}</span><span className="reward-chip">🏆 {child?.points || 0}</span></>}
            <button className="secondary" onClick={() => navigate(teacherPreview ? "/teacher" : childMode ? "/child" : "/family")}>{teacherPreview ? "لوحة المعلم" : childMode ? "وضع الطفل" : "حساب الأسرة"}</button>
            {!childMode && <button className="secondary" onClick={logout}>خروج</button>}
          </div>
        </div>
      </header>

      <main className="wrap page">
        <section className="game-hero">
          <div>
            <span className="game-kicker">🎮 منطقة اللعب والتعلّم</span>
            <h1>{teacherPreview ? "جرّب الألعاب كما يراها الطالب" : `اختَر لعبتك يا ${child?.display_name || "بطلنا"}`}</h1>
            <p>{teacherPreview ? "أنت في وضع المعلم. كل الألعاب تعمل بالكامل، لكن بدون تسجيل نقاط أو نجوم أو أي تغيير في بيانات الطلاب." : "كل لعبة هنا تعلّم شيئًا مرتبطًا بالقرآن، والمكافأة اليومية تُسجّل تلقائيًا بعد إكمال اللعبة فعلًا."}</p>
          </div>
          <div className="game-progress-card">
            <span>{teacherPreview ? "وضع المعاينة" : "تحدي اليوم"}</span>
            <strong>{teacherPreview ? "∞" : `${completedGames} / ${games.length}`}</strong>
            <div className="game-progress"><i style={{ width: teacherPreview ? "100%" : `${Math.round((completedGames / games.length) * 100)}%` }} /></div>
            <small>{teacherPreview ? "العب أي لعبة بلا حدود وبدون تأثير على سجلات الطلاب." : completedGames === games.length ? "ممتاز! أكملت كل ألعاب اليوم." : `باقي ${games.length - completedGames} لعبة لإكمال تحدي اليوم.`}</small>
          </div>
        </section>

        {error && <div className="msg error">{error}</div>}

        <section className="game-grid">
          {games.map(game => {
            const done = completed.has(game.key);
            return (
              <article className={`game-card ${game.className}`} key={game.key}>
                <div className="game-card-top"><div className="game-icon">{game.icon}</div><span className="level-chip">{game.level}</span></div>
                <h2>{game.title}</h2><p>{game.description}</p>
                <div className="game-reward"><b>{teacherPreview ? "معاينة كاملة للمعلم" : done ? "✓ مكافأة اليوم مكتملة" : game.reward}</b><small>{teacherPreview ? "بدون نقاط أو تغيير بيانات" : done ? "يمكنك اللعب مرة أخرى للتدريب" : "مرة واحدة يوميًا"}</small></div>
                <button className="game-play" disabled={!learningActorReady(viewer)} onClick={() => navigate(game.route)}>{teacherPreview ? "جرّب اللعبة" : done ? "العب مرة أخرى" : "ابدأ اللعبة"} <span>←</span></button>
              </article>
            );
          })}
        </section>

        <section className="mini-tip"><span>💡</span><div><b>{teacherPreview ? "ميزة المعلم" : "نصيحة اليوم"}</b><p>{teacherPreview ? "استخدم المعاينة لتجربة أي لعبة قبل توجيه الطلاب إليها. لن تؤثر تجربتك على النقاط أو الإنجازات." : "اللعب القصير المتكرر أفضل من جلسة طويلة. لعبة أو اثنتان بعد الحفظ تساعد الطفل على الاستمرار بدون ملل."}</p></div></section>
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • نتعلّم باللعب ونثبت الحفظ بالتكرار.</div></footer>
    </div>
  );
}
