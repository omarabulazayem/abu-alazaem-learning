import React, { useEffect, useMemo, useState } from "react";
import {
  getActiveChildId,
  getCurrentUser,
  listChildren,
  listRewardsToday,
  setActiveChildId,
  signIn,
} from "./api.js";
import Icon from "./Icon.jsx";

export const CHILD_MODE_KEY = "abu-alazaem-child-mode";

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}
function navigate(path) {
  if (routePath() !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export function enterChildMode() {
  localStorage.setItem(CHILD_MODE_KEY, "1");
  window.dispatchEvent(new Event("abu-child-mode"));
}
export function exitChildMode() {
  localStorage.removeItem(CHILD_MODE_KEY);
  window.dispatchEvent(new Event("abu-child-mode"));
}
export function isChildModeActive() {
  return localStorage.getItem(CHILD_MODE_KEY) === "1";
}

const actions = [
  ["quran", "الحفظ", "أكمل جلسة قصيرة واحفظ تقدمك", "/memorize", "mint"],
  ["review", "المراجعة", "راجع ما حفظته وثبّته", "/review", "sky"],
  ["game", "الألعاب", "تدريب ممتع ومسجل في GameEngine", "/games", "featured"],
  ["trophy", "إنجازاتي", "شاهد الميداليات التي فتحتها", "/achievements", "lavender"],
  ["target", "تحديات اليوم", "اعرف ما أكملته اليوم", "/challenges", "sun"],
  ["room", "غرفتي", "شاهد نقاطك ونجومك وتقدمك", "/room", "rose"],
];

export default function ChildHub() {
  const [user, setUser] = useState(undefined);
  const [child, setChild] = useState(null);
  const [todayRewards, setTodayRewards] = useState([]);
  const [password, setPassword] = useState("");
  const [showExit, setShowExit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    enterChildMode();
    let alive = true;
    (async () => {
      try {
        const current = await getCurrentUser();
        if (!alive) return;
        if (!current) {
          exitChildMode();
          navigate("/login");
          return;
        }
        if (current.accountType === "teacher") {
          exitChildMode();
          navigate("/teacher");
          return;
        }
        setUser(current);
        const kids = await listChildren(current);
        if (!alive) return;
        const activeId = getActiveChildId();
        const selected = kids.find(k => k.id === activeId) || kids[0] || null;
        if (selected && selected.id !== activeId) setActiveChildId(selected.id);
        setChild(selected);
        if (!selected) {
          setError("لا يوجد ملف طفل بعد. اطلب من ولي الأمر إضافة طفل أولًا.");
          return;
        }
        const rewards = await listRewardsToday(selected.id);
        if (alive) setTodayRewards(rewards || []);
      } catch (e) {
        if (alive) setError(e.message || "تعذر فتح وضع الطفل.");
      }
    })();
    return () => { alive = false; };
  }, []);

  const gameEvents = useMemo(() => {
    const keys = new Set();
    for (const reward of todayRewards) {
      if (reward.source_type === "game_session") keys.add(reward.source_key || `game-${keys.size}`);
      else if (["memory_game","surah_order_game","surah_quiz_game"].includes(reward.source_type)) keys.add(reward.source_type);
    }
    return keys;
  }, [todayRewards]);
  const gameProgress = Math.min(3, gameEvents.size);

  async function verifyParent(e) {
    e.preventDefault();
    if (!user?.email) return;
    setBusy(true);
    setError("");
    try {
      const verified = await signIn(user.email, password);
      if (verified.accountType !== "parent" && verified.accountType !== "admin") throw new Error("هذا الحساب ليس حساب ولي أمر.");
      exitChildMode();
      setPassword("");
      navigate("/family");
    } catch {
      setError("كلمة المرور غير صحيحة. لا يمكن الخروج من وضع الطفل.");
    } finally {
      setBusy(false);
    }
  }

  if (user === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز وضع الطفل...</p></div>;

  return (
    <div className="app child-dashboard child-dashboard-v2" dir="rtl">
      <header className="child-topbar">
        <div className="wrap nav">
          <button className="brand" onClick={() => navigate("/child")}>
            <span className="logo"><Icon name="mosque" size={24} /></span>
            <span><b>أبو العزايم</b><small>وضع الطفل</small></span>
          </button>
          <div className="actions child-rewards">
            <span className="reward-chip"><Icon name="trophy" size={17} /> {child?.points || 0} نقطة</span>
            <span className="reward-chip"><Icon name="star" size={17} /> {child?.stars || 0} نجمة</span>
            <button className="secondary" onClick={() => { setShowExit(true); setError(""); }}><Icon name="lock" size={17} /> خروج ولي الأمر</button>
          </div>
        </div>
      </header>

      <main className="wrap page">
        <section className="childHero childHeroPlus childHeroIllustrated">
          <div className="child-avatar-art"><Icon name="child" size={58} /></div>
          <div className="grow"><span>رحلتي اليوم</span><h1>أهلًا {child?.display_name || "بطلنا الصغير"}</h1><p>اختر نشاطًا صغيرًا، واجمع نقاطك ونجومك خطوة بخطوة.</p></div>
          <div className="child-level"><span><Icon name="flame" size={16} /> سلسلة النشاط</span><b>{child?.streak || 0}</b><small>يوم متواصل</small></div>
        </section>

        {!showExit && child && (
          <div className="child-summary">
            <div className="child-stat"><span className="stat-icon gold"><Icon name="trophy" size={25} /></span><div><b>{child.points || 0}</b><small>نقطة</small></div></div>
            <div className="child-stat"><span className="stat-icon sun"><Icon name="star" size={25} /></span><div><b>{child.stars || 0}</b><small>نجمة</small></div></div>
            <div className="child-stat"><span className="stat-icon sky"><Icon name="game" size={25} /></span><div><b>{gameProgress}/٣</b><small>ألعاب اليوم</small></div></div>
            <button className="daily-game-cta" onClick={() => navigate("/games")}>
              <span className="daily-game-icon"><Icon name={gameProgress === 3 ? "circleCheck" : "rocket"} size={30} /></span>
              <div><b>{gameProgress === 3 ? "أكملت ألعاب اليوم" : "كمّل تحدي الألعاب"}</b><small>{gameProgress === 3 ? "يمكنك اللعب مرة أخرى للتدريب" : `باقي ${3 - gameProgress} لعبة`}</small></div>
              <Icon name="arrow" size={22} />
            </button>
          </div>
        )}

        {error && <div className="msg error">{error}</div>}

        {!showExit && (
          <div className="kidgrid kidgrid-v2">
            {actions.map(([icon, title, description, path, className]) => (
              <button className={`kid-action ${className}`} key={path} onClick={() => child && navigate(path)} disabled={!child}>
                <span className="kid-action-icon"><Icon name={icon} size={42} /></span>
                <b>{title}</b>
                <small>{path === "/games" ? `${gameProgress}/٣ ألعاب اليوم • ${description}` : description}</small>
                <span className="kid-action-arrow"><Icon name="arrow" size={18} /></span>
              </button>
            ))}
          </div>
        )}

        {showExit && (
          <section className="panel authbox child-exit-card" style={{ margin: "28px auto 0" }}>
            <div className="child-exit-icon"><Icon name="shield" size={42} /></div>
            <h2>خروج من وضع الطفل</h2>
            <p>أدخل كلمة مرور ولي الأمر للعودة إلى إدارة الأسرة.</p>
            <form onSubmit={verifyParent}><input type="password" minLength="6" autoFocus autoComplete="current-password" placeholder="كلمة مرور ولي الأمر" value={password} onChange={e => setPassword(e.target.value)} required /><button className="primary full" disabled={busy}>{busy ? "جارٍ التحقق..." : "التحقق والخروج"}</button></form>
            <button className="link" onClick={() => { setShowExit(false); setPassword(""); setError(""); }}>العودة للأنشطة</button>
          </section>
        )}
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • وضع الطفل يحمي إعدادات الأسرة من التغيير بالخطأ.</div></footer>
    </div>
  );
}
