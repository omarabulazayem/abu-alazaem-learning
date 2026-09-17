import React, { useEffect, useState } from "react";
import {
  getActiveChildId,
  getCurrentUser,
  listAchievements,
  listChildren,
  signOut,
} from "./api.js";

const badgeDefinitions = [
  ["first_steps", "🌱", "البداية الجميلة", "ابدأ أول نشاط في الرحلة"],
  ["first_memorization", "📖", "أول حفظ", "أكمل أول جلسة حفظ"],
  ["first_surah", "🌙", "أول سورة", "أتم حفظ سورة كاملة"],
  ["five_surahs", "🕌", "خمس سور", "أتم حفظ خمس سور كاملة"],
  ["first_review", "🔁", "مراجع صغير", "أكمل أول مراجعة"],
  ["memory_player", "🧠", "بطل الذاكرة", "أكمل لعبة الذاكرة"],
  ["hundred_points", "⭐", "١٠٠ نقطة", "اجمع ١٠٠ نقطة"],
  ["five_hundred_points", "🏅", "٥٠٠ نقطة", "اجمع ٥٠٠ نقطة"],
  ["three_day_streak", "🔥", "٣ أيام متواصلة", "حافظ على نشاطك ٣ أيام"],
  ["seven_day_streak", "🏆", "أسبوع كامل", "حافظ على نشاطك ٧ أيام"],
];

function navigate(path) {
  if (window.location.pathname !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export default function AchievementsPage() {
  const [user, setUser] = useState(undefined);
  const [child, setChild] = useState(null);
  const [items, setItems] = useState([]);
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
        const activeId = getActiveChildId();
        const selected = kids.find(k => k.id === activeId) || kids[0] || null;
        setChild(selected);
        if (!selected) {
          setError("أضف طفلًا أولًا من حساب الأسرة.");
          return;
        }
        const unlocked = await listAchievements(selected.id);
        if (alive) setItems(unlocked || []);
      } catch (e) {
        if (alive) setError(e.message || "تعذر تحميل الإنجازات.");
      }
    })();
    return () => { alive = false; };
  }, []);

  async function logout() {
    await signOut();
    navigate("/");
  }

  if (user === undefined) return <div className="center"><i className="spinner" /><p>جارٍ تحميل الإنجازات...</p></div>;

  const unlockedSlugs = new Set(items.map(i => i.slug));
  const unlockedCount = badgeDefinitions.filter(([slug]) => unlockedSlugs.has(slug)).length;

  return (
    <div className="app" dir="rtl">
      <header>
        <div className="wrap nav">
          <button className="brand" onClick={() => navigate("/")}>
            <span className="logo">ع</span>
            <span><b>أبو العزايم</b><small>للحفظ الممتع</small></span>
          </button>
          <div className="actions">
            <button className="pill" onClick={() => navigate("/child")}>وضع الطفل</button>
            <button className="secondary" onClick={logout}>خروج</button>
          </div>
        </div>
      </header>

      <main className="wrap page">
        <div className="title">
          <span>الإنجازات</span>
          <h1>ميداليات {child?.display_name || "الرحلة"}</h1>
          <p>كل ميدالية هنا مرتبطة بنشاط حقيقي محفوظ في الحساب.</p>
        </div>

        {error && <div className="msg error">{error}</div>}

        <div className="stats" style={{ marginBottom: 24 }}>
          <div><b>{unlockedCount}</b><span>ميدالية مفتوحة</span></div>
          <div><b>{badgeDefinitions.length - unlockedCount}</b><span>متبقية</span></div>
          <div><b>{badgeDefinitions.length ? Math.round((unlockedCount / badgeDefinitions.length) * 100) : 0}%</b><span>اكتمال الإنجازات</span></div>
        </div>

        <div className="badges">
          {badgeDefinitions.map(([slug, icon, title, description]) => {
            const unlocked = unlockedSlugs.has(slug);
            const record = items.find(i => i.slug === slug);
            return (
              <article className={unlocked ? "won" : ""} key={slug}>
                <div>{unlocked ? icon : "🔒"}</div>
                <h3>{title}</h3>
                <p>{description}</p>
                <small>
                  {unlocked
                    ? record?.unlocked_at
                      ? `تم الفتح ${new Date(record.unlocked_at).toLocaleDateString("ar-EG")}`
                      : "تم الفتح"
                    : "لم يُفتح بعد"}
                </small>
              </article>
            );
          })}
        </div>

        <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
          <button className="secondary" onClick={() => navigate("/child")}>العودة لوضع الطفل</button>
          <button className="primary" onClick={() => navigate("/challenges")}>تحديات اليوم</button>
        </div>
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • كل خطوة صغيرة تستحق الاحتفال.</div></footer>
    </div>
  );
}
