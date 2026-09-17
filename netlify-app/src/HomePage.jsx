import React, { useEffect, useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import {
  getActiveChildId,
  getCurrentUser,
  listChildren,
  setActiveChildId,
  signOut,
} from "./api.js";

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}

function navigate(path) {
  if (routePath() !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

const navItems = [
  ["الرئيسية", "/", "home"],
  ["القرآن", "/quran", "quran"],
  ["الحفظ", "/memorize", "star"],
  ["المراجعة", "/review", "review"],
  ["الألعاب", "/games", "game"],
  ["التحديات", "/challenges", "target"],
  ["الإنجازات", "/achievements", "trophy"],
];

const sections = [
  { title: "بوابة البداية", subtitle: "ابدأ رحلتك مع القرآن", route: "/quran", icon: "mosque", tone: "mint" },
  { title: "عالم القرآن", subtitle: "اقرأ وتعرّف على السور", route: "/quran", icon: "quran", tone: "lavender" },
  { title: "مدينة الألعاب", subtitle: "العب وتعلم بدون ملل", route: "/games", icon: "game", tone: "sky" },
  { title: "جلسة الحفظ", subtitle: "خطوات قصيرة وتقدم واضح", route: "/memorize", icon: "star", tone: "green" },
  { title: "غرفة الطفل", subtitle: "مساحته وتقدمه الخاص", route: "/room", icon: "room", tone: "pink" },
  { title: "الجوائز", subtitle: "اكسب نقاطًا وميداليات", route: "/achievements", icon: "gift", tone: "violet" },
  { title: "المراجعة", subtitle: "ثبّت الحفظ باستمرار", route: "/review", icon: "review", tone: "aqua" },
  { title: "التحديات", subtitle: "أكمل مهامك اليومية", route: "/challenges", icon: "target", tone: "peach" },
];

function HeroScene() {
  return (
    <svg className="homeScene" viewBox="0 0 760 410" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9efff" />
          <stop offset="1" stopColor="#f7fdff" />
        </linearGradient>
        <linearGradient id="hill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bdebb4" />
          <stop offset="1" stopColor="#8edba4" />
        </linearGradient>
      </defs>
      <rect width="760" height="410" rx="38" fill="url(#sky)" />
      <circle cx="628" cy="64" r="34" fill="#fff1a8" opacity=".85" />
      <path d="M0 292C98 244 178 260 260 300c92 45 184 24 269-12 89-37 158-23 231 18v104H0Z" fill="#d6f4c9" />
      <path d="M0 331c113-43 205-14 300 25 87 36 166 24 249-11 76-32 145-30 211 3v62H0Z" fill="url(#hill)" />
      <g transform="translate(64 165)">
        <rect x="38" y="76" width="112" height="105" rx="12" fill="#fff7dc" stroke="#8dcfba" strokeWidth="3" />
        <path d="M30 80h128" stroke="#8dcfba" strokeWidth="7" strokeLinecap="round" />
        <path d="M66 76V40c0-20 16-36 36-36s36 16 36 36v36" fill="#e8fff6" stroke="#63be9e" strokeWidth="4" />
        <path d="M102 4V-16" stroke="#63be9e" strokeWidth="4" strokeLinecap="round" />
        <path d="M92-10h20" stroke="#f3b843" strokeWidth="4" strokeLinecap="round" />
        <rect x="74" y="118" width="56" height="63" rx="10" fill="#bfe9dc" />
        <rect x="12" y="45" width="20" height="136" rx="8" fill="#effcf7" stroke="#63be9e" strokeWidth="3" />
        <path d="M22 45V19M15 20h14" stroke="#63be9e" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g transform="translate(545 168)">
        <path d="M84 18c-18 0-33 12-37 29-24-10-46 8-44 31 1 16 14 29 30 31-12 21 3 49 28 50 13 1 25-6 32-16 7 10 19 17 32 16 24-2 38-28 27-49 16-3 28-16 29-32 1-22-20-39-42-30-5-18-20-30-39-30Z" fill="#74cd83" />
        <rect x="85" y="118" width="18" height="81" rx="9" fill="#a86f45" />
      </g>
      <g transform="translate(272 105)">
        <rect x="0" y="56" width="216" height="138" rx="34" fill="#fffdf4" stroke="#f2cf7d" strokeWidth="4" />
        <rect x="24" y="18" width="168" height="74" rx="28" fill="#fff8df" stroke="#f2cf7d" strokeWidth="4" />
        <text x="108" y="58" textAnchor="middle" fontSize="27" fontWeight="800" fill="#245173" fontFamily="Tahoma, Arial">أهلًا بك في</text>
        <text x="108" y="116" textAnchor="middle" fontSize="31" fontWeight="900" fill="#287fc0" fontFamily="Tahoma, Arial">أبو العزايم</text>
        <text x="108" y="154" textAnchor="middle" fontSize="22" fontWeight="800" fill="#c6579d" fontFamily="Tahoma, Arial">للحفظ الممتع</text>
        <text x="108" y="181" textAnchor="middle" fontSize="13" fontWeight="700" fill="#56798f" fontFamily="Tahoma, Arial">نحفظ • نراجع • نلعب • ننجز</text>
      </g>
      <g fill="#fff" opacity=".9">
        <circle cx="46" cy="72" r="10"/><circle cx="61" cy="72" r="14"/><circle cx="79" cy="72" r="9"/>
        <circle cx="483" cy="78" r="9"/><circle cx="497" cy="78" r="13"/><circle cx="514" cy="78" r="8"/>
      </g>
    </svg>
  );
}

function BrandMark() {
  return (
    <button className="homeBrand" onClick={() => navigate("/")}>
      <span className="homeBrandIcon"><Icon name="mosque" size={42} /></span>
      <span><b>أبو العزايم</b><small>للحفظ الممتع</small></span>
    </button>
  );
}

export default function HomePage() {
  const [user, setUser] = useState(undefined);
  const [child, setChild] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const current = await getCurrentUser().catch(() => null);
      if (!alive) return;
      setUser(current);
      if (!current || current.accountType === "teacher") return;
      const kids = await listChildren(current).catch(() => []);
      if (!alive) return;
      const activeId = getActiveChildId();
      const selected = kids.find(k => k.id === activeId) || kids[0] || null;
      if (selected && selected.id !== activeId) setActiveChildId(selected.id);
      setChild(selected);
    })();
    return () => { alive = false; };
  }, []);

  const accountLabel = useMemo(() => {
    if (!user) return "تسجيل الدخول";
    if (user.accountType === "teacher") return "لوحة المعلم";
    return "حساب الأسرة";
  }, [user]);

  async function logout() {
    await signOut();
    setUser(null);
    setChild(null);
  }

  function openAccount() {
    if (!user) return navigate("/login");
    navigate(user.accountType === "teacher" ? "/teacher" : "/family");
  }

  return (
    <div className="homeV2" dir="rtl">
      <header className="homeHeader">
        <div className="homeHeaderInner">
          <BrandMark />
          <nav className={menuOpen ? "homeNav open" : "homeNav"}>
            {navItems.map(([label, route, icon]) => (
              <button key={route} className={route === "/" ? "active" : ""} onClick={() => { navigate(route); setMenuOpen(false); }}>
                <Icon name={icon} size={23} />
                <span>{label}</span>
              </button>
            ))}
            {user?.accountType === "teacher" && (
              <button onClick={() => { navigate("/teacher"); setMenuOpen(false); }}>
                <Icon name="teacher" size={23} /><span>المعلم</span>
              </button>
            )}
          </nav>
          <div className="homeAccountArea">
            {child && <div className="homeScore"><Icon name="star" size={22} /><b>{child.points || 0}</b><span>نقطة</span></div>}
            <button className="homeAccount" onClick={openAccount}><Icon name={user ? "user" : "login"} size={22} /><span>{accountLabel}</span></button>
            {user && <button className="homeLogout" onClick={logout} aria-label="تسجيل الخروج"><Icon name="logout" size={20} /></button>}
            <button className="homeMenu" onClick={() => setMenuOpen(v => !v)} aria-label="فتح القائمة"><Icon name={menuOpen ? "close" : "menu"} size={24} /></button>
          </div>
        </div>
      </header>

      <main>
        <section className="homeHeroWrap">
          <div className="homeAmbient homeAmbientOne" />
          <div className="homeAmbient homeAmbientTwo" />
          <div className="homeHero">
            <div className="homeHeroCopy">
              <span className="homeEyebrow"><Icon name="sparkle" size={18} /> رحلة يومية بسيطة</span>
              <h1>نحوّل حفظ القرآن إلى <strong>رحلة ممتعة</strong> لطفلك</h1>
              <p>منصة عربية تجمع الحفظ والمراجعة والألعاب والتحديات والإنجازات في تجربة واحدة سهلة للأسرة والمعلم.</p>
              <div className="homeHeroActions">
                <button className="homePrimary" onClick={() => navigate(user ? (user.accountType === "teacher" ? "/teacher" : "/child") : "/login")}>
                  <span>{user ? "ابدأ رحلتك" : "ابدأ الآن"}</span><Icon name="arrow" size={19} />
                </button>
                <button className="homeGhost" onClick={() => navigate("/quran")}><Icon name="quran" size={20} /><span>استكشف القرآن</span></button>
              </div>
              {child && (
                <div className="homeChildStrip">
                  <span className="homeChildAvatar"><Icon name="user" size={24} /></span>
                  <div><small>المستوى الحالي</small><b>{child.display_name}</b></div>
                  <div className="homeChildMetric"><strong>{child.stars || 0}</strong><span>نجمة</span></div>
                  <div className="homeChildMetric"><strong>{child.streak || 0}</strong><span>يوم متواصل</span></div>
                </div>
              )}
            </div>
            <div className="homeHeroVisual"><HeroScene /></div>
          </div>
        </section>

        <section className="homeSections">
          <div className="homeSectionHeading">
            <span>اختَر وجهتك</span>
            <h2>كل ما يحتاجه الطفل في مكان واحد</h2>
            <p>كل قسم مصمم ليكون واضحًا وسهلًا وممتعًا على الكمبيوتر والموبايل.</p>
          </div>
          <div className="homeCardGrid">
            {sections.map(item => (
              <button key={item.title} className={`homeFeatureCard ${item.tone}`} onClick={() => navigate(item.route)}>
                <span className="homeFeatureIcon"><Icon name={item.icon} size={42} /></span>
                <span className="homeFeatureText"><b>{item.title}</b><small>{item.subtitle}</small></span>
                <span className="homeFeatureArrow"><Icon name="arrow" size={18} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="homePromise">
          <div className="homePromiseIcon"><Icon name="quran" size={34} /></div>
          <div><span>رسالتنا</span><h3>كل خطوة صغيرة تقرّب الطفل من القرآن</h3><p>تقدم محفوظ، تجربة واضحة، وتشجيع مستمر بدون ضغط أو تعقيد.</p></div>
          <button onClick={() => navigate("/quran")}>ابدأ من القرآن <Icon name="arrow" size={18} /></button>
        </section>
      </main>

      <footer className="homeFooter"><div><BrandMark /><p>منصة عربية للحفظ الممتع، المراجعة، الألعاب والمتابعة.</p></div><small>أبو العزايم للحفظ الممتع</small></footer>
    </div>
  );
}
