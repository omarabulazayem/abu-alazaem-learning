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

const primaryWorlds = [
  { icon: "quran", title: "نحفظ", description: "آيات صغيرة خطوة خطوة", path: "/memorize", tone: "memorize", companion: "star" },
  { icon: "game", title: "نلعب", description: "مغامرات قصيرة ومكافآت", path: "/games", tone: "play", companion: "gift" },
  { icon: "review", title: "نراجع", description: "نفتكر اللي حفظناه سوا", path: "/review", tone: "review", companion: "sparkle" },
];

const smallWorlds = [
  { icon: "trophy", title: "جوائزي", path: "/achievements", tone: "rewards" },
  { icon: "target", title: "مهمتي", path: "/challenges", tone: "mission" },
  { icon: "room", title: "غرفتي", path: "/room", tone: "room" },
];

function WorldArt({ world }) {
  return (
    <span className={`child-world-art ${world.tone}`} aria-hidden="true">
      <span className="world-sun" />
      <span className="world-cloud one" />
      <span className="world-cloud two" />
      <span className="world-hill back" />
      <span className="world-hill front" />
      <span className="world-path" />
      <span className="world-main-icon"><Icon name={world.icon} size={52} /></span>
      <span className="world-companion"><Icon name={world.companion} size={24} /></span>
      <span className="world-star star-one"><Icon name="star" size={16} /></span>
      <span className="world-star star-two"><Icon name="star" size={13} /></span>
    </span>
  );
}

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
      else if (["memory_game", "surah_order_game", "surah_quiz_game"].includes(reward.source_type)) keys.add(reward.source_type);
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

  if (user === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تجهيز عالمك...</p></div>;

  return (
    <div className="app child-dashboard child-dashboard-v2 child-world-home" dir="rtl">
      <header className="child-topbar">
        <div className="wrap nav">
          <button className="brand" onClick={() => navigate("/child")}>
            <span className="logo"><Icon name="mosque" size={24} /></span>
            <span><b>أبو العزايم</b><small>عالمي الصغير</small></span>
          </button>
          <div className="actions child-rewards">
            <span className="reward-chip"><Icon name="star" size={17} /> {child?.stars || 0}</span>
            <span className="reward-chip"><Icon name="trophy" size={17} /> {child?.points || 0}</span>
            <button className="secondary parent-zone-button" onClick={() => { setShowExit(true); setError(""); }} aria-label="فتح منطقة ولي الأمر"><Icon name="lock" size={18} /><span>ولي الأمر</span></button>
          </div>
        </div>
      </header>

      <main className="wrap page">
        <section className="child-world-welcome">
          <div className="child-guide" aria-hidden="true">
            <span className="guide-head"><Icon name="child" size={54} /></span>
            <span className="guide-bubble"><Icon name="sparkle" size={20} /></span>
          </div>
          <div className="grow"><span>جاهز لمغامرة جديدة؟</span><h1>أهلًا {child?.display_name || "يا بطل"}</h1><p>اختار عالم واحد ونبدأ.</p></div>
          <div className="child-streak-pill"><Icon name="flame" size={19} /><strong>{child?.streak || 0}</strong><span>يوم</span></div>
        </section>

        {!showExit && child && (
          <>
            <section className="child-world-section" aria-labelledby="child-main-worlds">
              <div className="child-world-heading"><span>هنعمل إيه دلوقتي؟</span><h2 id="child-main-worlds">اختار عالمك</h2></div>
              <div className="child-world-grid">
                {primaryWorlds.map(world => (
                  <button key={world.path} className={`child-world-card ${world.tone}`} onClick={() => navigate(world.path)}>
                    <WorldArt world={world} />
                    <span className="child-world-copy"><b>{world.title}</b><small>{world.path === "/games" && gameProgress ? `${gameProgress}/٣ اليوم • ${world.description}` : world.description}</small></span>
                    <span className="child-world-start">يلا <Icon name="arrow" size={18} /></span>
                  </button>
                ))}
              </div>
            </section>

            <section className="child-small-worlds" aria-labelledby="child-more-worlds">
              <div className="child-world-heading compact"><span>أماكن تانية</span><h2 id="child-more-worlds">حاجاتي</h2></div>
              <div className="child-small-grid">
                {smallWorlds.map(item => (
                  <button key={item.path} className={`child-small-card ${item.tone}`} onClick={() => navigate(item.path)}>
                    <span className="child-small-icon"><Icon name={item.icon} size={32} /></span>
                    <b>{item.title}</b>
                  </button>
                ))}
              </div>
            </section>

            <button className="child-daily-quest" onClick={() => navigate("/games")}>
              <span className="daily-game-icon"><Icon name={gameProgress === 3 ? "circleCheck" : "rocket"} size={30} /></span>
              <div><small>مغامرة اليوم</small><b>{gameProgress === 3 ? "برافو! خلصت ألعاب اليوم" : "نكمل لعبة كمان؟"}</b></div>
              <span className="daily-progress-dots" aria-label={`${gameProgress} من 3 ألعاب`}>
                {[0, 1, 2].map(i => <i key={i} className={i < gameProgress ? "done" : ""} />)}
              </span>
            </button>
          </>
        )}

        {error && <div className="msg error">{error}</div>}

        {showExit && (
          <section className="panel authbox child-exit-card" style={{ margin: "28px auto 0" }}>
            <div className="child-exit-icon"><Icon name="shield" size={42} /></div>
            <h2>منطقة ولي الأمر</h2>
            <p>أدخل كلمة المرور للعودة إلى إدارة الأسرة.</p>
            <form onSubmit={verifyParent}><input type="password" minLength="6" autoFocus autoComplete="current-password" placeholder="كلمة مرور ولي الأمر" value={password} onChange={e => setPassword(e.target.value)} required /><button className="primary full" disabled={busy}>{busy ? "جارٍ التحقق..." : "التحقق والخروج"}</button></form>
            <button className="link" onClick={() => { setShowExit(false); setPassword(""); setError(""); }}>ارجع لعالمي</button>
          </section>
        )}
      </main>

      <footer className="child-world-footer"><div className="wrap">أبو العزايم للحفظ الممتع</div></footer>
    </div>
  );
}
