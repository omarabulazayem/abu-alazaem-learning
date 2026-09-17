import React, { useEffect, useMemo, useState } from "react";
import {
  getActiveChildId,
  getCurrentUser,
  listChildren,
  listRewardsToday,
  setActiveChildId,
  signOut,
} from "./api.js";
import { isChildModeActive } from "./ChildHub.jsx";

function navigate(path) {
  if (window.location.pathname !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

const games = [
  {
    key: "memory_game",
    icon: "🧠",
    title: "لعبة الذاكرة",
    description: "طابق البطاقات المتشابهة بأقل عدد من المحاولات.",
    reward: "٣٥ نقطة + نجمتان",
    route: "/games/memory",
    className: "memory",
    level: "سهل",
  },
  {
    key: "surah_order_game",
    icon: "🧩",
    title: "رتّب السور",
    description: "اختر السور بالترتيب الصحيح كما تظهر في المصحف.",
    reward: "٣٠ نقطة + نجمة",
    route: "/games/order",
    className: "order",
    level: "متوسط",
  },
  {
    key: "surah_quiz_game",
    icon: "⚡",
    title: "اختبار السور",
    description: "خمسة أسئلة سريعة عن أسماء السور وأرقامها.",
    reward: "٢٥ نقطة + نجمة",
    route: "/games/quiz",
    className: "quiz",
    level: "تحدي",
  },
];

export default function GamesHub() {
  const [user, setUser] = useState(undefined);
  const [child, setChild] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [error, setError] = useState("");

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
        if (!selected) {
          setError("أضف طفلًا أولًا من حساب الأسرة قبل بدء الألعاب.");
          return;
        }
        const today = await listRewardsToday(selected.id);
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

  async function logout() {
    await signOut();
    navigate("/");
  }

  if (user === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز الألعاب...</p></div>;

  return (
    <div className="app game-shell" dir="rtl">
      <header>
        <div className="wrap nav">
          <button className="brand" onClick={() => navigate(childMode ? "/child" : "/")}>
            <span className="logo">ع</span>
            <span><b>أبو العزايم</b><small>منطقة الألعاب</small></span>
          </button>
          <div className="actions">
            <span className="reward-chip">⭐ {child?.stars || 0}</span>
            <span className="reward-chip">🏆 {child?.points || 0}</span>
            <button className="secondary" onClick={() => navigate(childMode ? "/child" : "/family")}>{childMode ? "وضع الطفل" : "حساب الأسرة"}</button>
            {!childMode && <button className="secondary" onClick={logout}>خروج</button>}
          </div>
        </div>
      </header>

      <main className="wrap page">
        <section className="game-hero">
          <div>
            <span className="game-kicker">🎮 منطقة اللعب والتعلّم</span>
            <h1>اختَر لعبتك يا {child?.display_name || "بطلنا"}</h1>
            <p>كل لعبة هنا تعلّم شيئًا مرتبطًا بالقرآن، والمكافأة اليومية تُسجّل تلقائيًا بعد إكمال اللعبة فعلًا.</p>
          </div>
          <div className="game-progress-card">
            <span>تحدي اليوم</span>
            <strong>{completedGames} / {games.length}</strong>
            <div className="game-progress"><i style={{ width: `${Math.round((completedGames / games.length) * 100)}%` }} /></div>
            <small>{completedGames === games.length ? "ممتاز! أكملت كل ألعاب اليوم." : `باقي ${games.length - completedGames} لعبة لإكمال تحدي اليوم.`}</small>
          </div>
        </section>

        {error && <div className="msg error">{error}</div>}

        <section className="game-grid">
          {games.map(game => {
            const done = completed.has(game.key);
            return (
              <article className={`game-card ${game.className}`} key={game.key}>
                <div className="game-card-top">
                  <div className="game-icon">{game.icon}</div>
                  <span className="level-chip">{game.level}</span>
                </div>
                <h2>{game.title}</h2>
                <p>{game.description}</p>
                <div className="game-reward"><b>{done ? "✓ مكافأة اليوم مكتملة" : game.reward}</b><small>{done ? "يمكنك اللعب مرة أخرى للتدريب" : "مرة واحدة يوميًا"}</small></div>
                <button className="game-play" disabled={!child} onClick={() => navigate(game.route)}>{done ? "العب مرة أخرى" : "ابدأ اللعبة"} <span>←</span></button>
              </article>
            );
          })}
        </section>

        <section className="mini-tip">
          <span>💡</span>
          <div><b>نصيحة اليوم</b><p>اللعب القصير المتكرر أفضل من جلسة طويلة. لعبة أو اثنتان بعد الحفظ تساعد الطفل على الاستمرار بدون ملل.</p></div>
        </section>
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • نتعلّم باللعب ونثبت الحفظ بالتكرار.</div></footer>
    </div>
  );
}
