import React, { useEffect, useState } from "react";
import {
  getActiveChildId,
  getCurrentUser,
  listAchievements,
  listChildren,
  signOut,
} from "./api.js";
import Icon from "./Icon.jsx";

const badgeDefinitions = [
  ["first_steps", "sparkle", "البداية الجميلة", "ابدأ أول نشاط في الرحلة", "mint"],
  ["first_memorization", "quran", "أول حفظ", "أكمل أول جلسة حفظ", "sky"],
  ["first_surah", "star", "أول سورة", "أتم حفظ سورة كاملة", "sun"],
  ["five_surahs", "mosque", "خمس سور", "أتم حفظ خمس سور كاملة", "mint"],
  ["first_review", "review", "مراجع صغير", "أكمل أول مراجعة", "sky"],
  ["memory_player", "brain", "بطل الذاكرة", "أكمل لعبة الذاكرة", "lavender"],
  ["surah_order_master", "puzzle", "خبير ترتيب السور", "أكمل لعبة ترتيب السور", "sun"],
  ["surah_quiz_star", "bolt", "نجم اختبار السور", "اجتز اختبار السور بنجاح", "lavender"],
  ["hundred_points", "star", "١٠٠ نقطة", "اجمع ١٠٠ نقطة", "sun"],
  ["five_hundred_points", "medal", "٥٠٠ نقطة", "اجمع ٥٠٠ نقطة", "rose"],
  ["three_day_streak", "flame", "٣ أيام متواصلة", "حافظ على نشاطك ٣ أيام", "rose"],
  ["seven_day_streak", "trophy", "أسبوع كامل", "حافظ على نشاطك ٧ أيام", "sun"],
];

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}
function navigate(path) {
  if (routePath() !== path) {
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
  const completion = badgeDefinitions.length ? Math.round((unlockedCount / badgeDefinitions.length) * 100) : 0;

  return (
    <div className="app achievements-v2" dir="rtl">
      <header className="achievement-topbar">
        <div className="wrap nav">
          <button className="brand" onClick={() => navigate("/")}>
            <span className="logo"><Icon name="trophy" size={24} /></span>
            <span><b>أبو العزايم</b><small>الإنجازات والجوائز</small></span>
          </button>
          <div className="actions">
            <button className="pill" onClick={() => navigate("/child")}><Icon name="child" size={17} /> وضع الطفل</button>
            <button className="secondary" onClick={logout}><Icon name="logout" size={17} /> خروج</button>
          </div>
        </div>
      </header>

      <main className="wrap page">
        <section className="achievement-hero">
          <div>
            <span className="achievement-kicker"><Icon name="medal" size={18} /> سجل الإنجازات</span>
            <h1>ميداليات {child?.display_name || "الرحلة"}</h1>
            <p>كل ميدالية هنا مرتبطة بنشاط حقيقي محفوظ في الحساب، وتفتح تلقائيًا مع التقدم.</p>
          </div>
          <div className="achievement-progress-ring" style={{ "--progress": `${completion * 3.6}deg` }}><div><strong>{completion}%</strong><span>مكتمل</span></div></div>
        </section>

        {error && <div className="msg error">{error}</div>}

        <div className="stats achievement-stats" style={{ marginBottom: 24 }}>
          <div><span className="stat-icon mint"><Icon name="circleCheck" size={24} /></span><b>{unlockedCount}</b><span>ميدالية مفتوحة</span></div>
          <div><span className="stat-icon lavender"><Icon name="lock" size={24} /></span><b>{badgeDefinitions.length - unlockedCount}</b><span>متبقية</span></div>
          <div><span className="stat-icon sun"><Icon name="target" size={24} /></span><b>{completion}%</b><span>اكتمال الإنجازات</span></div>
        </div>

        <div className="badges badges-v2">
          {badgeDefinitions.map(([slug, icon, title, description, tone]) => {
            const unlocked = unlockedSlugs.has(slug);
            const record = items.find(i => i.slug === slug);
            return (
              <article className={`${unlocked ? "won" : "locked"} badge-${tone}`} key={slug}>
                <div className="badge-icon"><Icon name={unlocked ? icon : "lock"} size={34} /></div>
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
          <button className="secondary" onClick={() => navigate("/games")}><Icon name="game" size={18} /> الألعاب</button>
          <button className="primary" onClick={() => navigate("/challenges")}><Icon name="target" size={18} /> تحديات اليوم</button>
        </div>
      </main>

      <footer><div className="wrap">أبو العزايم للحفظ الممتع • كل خطوة صغيرة تستحق الاحتفال.</div></footer>
    </div>
  );
}
