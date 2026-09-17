import React, { useEffect, useState } from "react";
import {
  getActiveChildId,
  getCurrentUser,
  listChildren,
  setActiveChildId,
  signIn,
} from "./api.js";

export const CHILD_MODE_KEY = "abu-alazaem-child-mode";

function navigate(path) {
  if (window.location.pathname !== path) {
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

export default function ChildHub() {
  const [user, setUser] = useState(undefined);
  const [child, setChild] = useState(null);
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
        if (!selected) setError("لا يوجد ملف طفل بعد. اطلب من ولي الأمر إضافة طفل أولًا.");
      } catch (e) {
        if (alive) setError(e.message || "تعذر فتح وضع الطفل.");
      }
    })();
    return () => { alive = false; };
  }, []);

  async function verifyParent(e) {
    e.preventDefault();
    if (!user?.email) return;
    setBusy(true);
    setError("");
    try {
      const verified = await signIn(user.email, password);
      if (verified.accountType !== "parent" && verified.accountType !== "admin") {
        throw new Error("هذا الحساب ليس حساب ولي أمر.");
      }
      exitChildMode();
      setPassword("");
      navigate("/family");
    } catch {
      setError("كلمة المرور غير صحيحة. لا يمكن الخروج من وضع الطفل.");
    } finally {
      setBusy(false);
    }
  }

  if (user === undefined) {
    return <div className="center"><i className="spinner" /><p>جارٍ تجهيز وضع الطفل...</p></div>;
  }

  const actions = [
    ["📖", "الحفظ", "أكمل جلسة قصيرة واحفظ تقدمك", "/memorize"],
    ["🔁", "المراجعة", "راجع ما حفظته وثبّته", "/review"],
    ["🧠", "لعبة الذاكرة", "طابق البطاقات واكسب نقاط اليوم", "/games"],
    ["🏆", "إنجازاتي", "شاهد الميداليات التي فتحتها", "/achievements"],
    ["🔥", "تحديات اليوم", "اعرف ما أكملته اليوم", "/challenges"],
    ["⭐", "غرفتي", "شاهد نقاطك ونجومك وتقدمك", "/room"],
  ];

  return (
    <div className="app" dir="rtl">
      <header>
        <div className="wrap nav">
          <button className="brand" onClick={() => navigate("/child")}>
            <span className="logo">ع</span>
            <span><b>أبو العزايم</b><small>وضع الطفل</small></span>
          </button>
          <div className="actions">
            <span className="pill">{child?.points || 0} نقطة • {child?.stars || 0} ⭐</span>
            <button className="secondary" onClick={() => { setShowExit(true); setError(""); }}>خروج ولي الأمر</button>
          </div>
        </div>
      </header>

      <main className="wrap page">
        <div className="childHero">
          <div className="avatar big">{child?.avatar || "🧒🏻"}</div>
          <div>
            <span>رحلتي اليوم</span>
            <h1>أهلًا {child?.display_name || "بطلنا الصغير"}!</h1>
            <p>اختر نشاطًا، وأنجز خطوة صغيرة جديدة.</p>
          </div>
        </div>

        {error && <div className="msg error">{error}</div>}

        {!showExit && (
          <div className="kidgrid">
            {actions.map(([icon, title, description, path]) => (
              <button key={path} onClick={() => child && navigate(path)} disabled={!child}>
                <span>{icon}</span>
                <b>{title}</b>
                <small>{description}</small>
              </button>
            ))}
          </div>
        )}

        {showExit && (
          <section className="panel authbox" style={{ margin: "28px auto 0" }}>
            <h2>خروج من وضع الطفل</h2>
            <p>أدخل كلمة مرور ولي الأمر للعودة إلى إدارة الأسرة.</p>
            <form onSubmit={verifyParent}>
              <input
                type="password"
                minLength="6"
                autoFocus
                autoComplete="current-password"
                placeholder="كلمة مرور ولي الأمر"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button className="primary full" disabled={busy}>{busy ? "جارٍ التحقق..." : "التحقق والخروج"}</button>
            </form>
            <button className="link" onClick={() => { setShowExit(false); setPassword(""); setError(""); }}>العودة للأنشطة</button>
          </section>
        )}
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • وضع الطفل يحمي إعدادات الأسرة من التغيير بالخطأ.</div></footer>
    </div>
  );
}
