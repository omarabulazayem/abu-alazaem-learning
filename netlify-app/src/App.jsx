import React, { useEffect, useState } from "react";
import {
  claimReward,
  createChild,
  createTeacherClass,
  dayKey,
  getActiveChildId,
  getCurrentUser,
  getProgress,
  joinChildToClass,
  listAchievements,
  listChildren,
  listRewardsToday,
  recordReview,
  requestPasswordReset,
  saveProgress,
  setActiveChildId,
  signIn,
  signOut,
  signUp,
  teacherOverview,
  updatePassword,
} from "./api.js";

const S = [
  { number: 1, name: "الفاتحة", ayat: 7 },
  { number: 112, name: "الإخلاص", ayat: 4 },
  { number: 113, name: "الفلق", ayat: 5 },
  { number: 114, name: "الناس", ayat: 6 },
  { number: 107, name: "الماعون", ayat: 7 },
  { number: 108, name: "الكوثر", ayat: 3 },
];

const badges = {
  first_steps: ["البداية الجميلة", "أكمل أول نشاط"],
  first_memorization: ["أول حفظ", "أكمل أول جلسة حفظ"],
  first_review: ["مراجع صغير", "أكمل أول مراجعة"],
  memory_player: ["بطل الذاكرة", "أكمل لعبة الذاكرة"],
  hundred_points: ["١٠٠ نقطة", "اجمع ١٠٠ نقطة"],
  five_hundred_points: ["٥٠٠ نقطة", "اجمع ٥٠٠ نقطة"],
  three_day_streak: ["٣ أيام متواصلة", "حافظ على نشاطك ٣ أيام"],
  seven_day_streak: ["أسبوع كامل", "حافظ على نشاطك ٧ أيام"],
};

const go = p => {
  if (location.pathname !== p) {
    history.pushState({}, "", p);
    dispatchEvent(new PopStateEvent("popstate"));
  }
};

function usePath() {
  const [p, setP] = useState(location.pathname);
  useEffect(() => {
    const f = () => setP(location.pathname);
    addEventListener("popstate", f);
    return () => removeEventListener("popstate", f);
  }, []);
  return p;
}

function useUser() {
  const [u, setU] = useState(undefined);
  const refresh = async () => setU(await getCurrentUser().catch(() => null));
  useEffect(() => {
    refresh();
    const f = () => refresh();
    addEventListener("abu-auth", f);
    return () => removeEventListener("abu-auth", f);
  }, []);
  return { user: u, refresh };
}

function useChildId() {
  const [id, setId] = useState(getActiveChildId());
  useEffect(() => {
    const f = () => setId(getActiveChildId());
    addEventListener("abu-child", f);
    return () => removeEventListener("abu-child", f);
  }, []);
  return id;
}

function Header({ user }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["الرئيسية", "/"],
    ["القرآن", "/quran"],
    ["الحفظ", "/memorize"],
    ["المراجعة", "/review"],
    ["الألعاب", "/games"],
    ["الإنجازات", "/achievements"],
    ["التحديات", "/challenges"],
  ];

  async function logout() {
    await signOut();
    go("/");
  }

  return (
    <header>
      <div className="wrap nav">
        <button className="brand" onClick={() => go("/")}>
          <span className="logo">ع</span>
          <span><b>أبو العزايم</b><small>للحفظ الممتع</small></span>
        </button>
        <nav className={open ? "links open" : "links"}>
          {links.map(x => (
            <button key={x[1]} onClick={() => { go(x[1]); setOpen(false); }}>{x[0]}</button>
          ))}
        </nav>
        <div className="actions">
          {user ? (
            <>
              <button className="pill" onClick={() => go(user.accountType === "teacher" ? "/teacher" : "/family")}>
                {user.accountType === "teacher" ? "لوحة المعلم" : "حساب الأسرة"}
              </button>
              <button className="secondary" onClick={logout}>خروج</button>
            </>
          ) : (
            <button className="pill" onClick={() => go("/login")}>تسجيل الدخول</button>
          )}
          <button className="menu" onClick={() => setOpen(!open)}>☰</button>
        </div>
      </div>
    </header>
  );
}

function Shell({ user, children }) {
  return (
    <div className="app" dir="rtl">
      <Header user={user} />
      {children}
      <footer><div className="wrap">أبو العزايم للحفظ الممتع • رحلة صغيرة كل يوم، وأثر كبير بإذن الله.</div></footer>
    </div>
  );
}

const Msg = ({ text, err }) => text ? <div className={err ? "msg error" : "msg ok"}>{text}</div> : null;

function Loading() {
  return <div className="center"><i className="spinner" /><p>جارٍ تجهيز المنصة...</p></div>;
}

function Home({ user }) {
  return (
    <Shell user={user}>
      <main>
        <section className="hero">
          <div className="wrap heroGrid">
            <div>
              <span className="kicker">منصة أسرية لحفظ القرآن</span>
              <h1>نحوّل الحفظ إلى <em>رحلة ممتعة</em> لطفلك</h1>
              <p>حفظ ومراجعة وألعاب ونقاط وإنجازات في حساب عائلي واحد، مع ربط الطفل بالمعلم ومتابعة تقدمه.</p>
              <div className="row">
                <button className="primary" onClick={() => go(user ? (user.accountType === "teacher" ? "/teacher" : "/child") : "/login")}>
                  {user ? "ابدأ الآن" : "أنشئ حسابك مجانًا"}
                </button>
                <button className="secondary" onClick={() => go("/quran")}>استكشف السور</button>
              </div>
            </div>
            <div className="heroCard">☾<strong>خطوة صغيرة كل يوم</strong><span>والإنجازات تتراكم تلقائيًا</span></div>
          </div>
        </section>
        <section className="wrap cards">
          <article>📖<h3>الحفظ</h3><p>تقدم محفوظ لكل طفل وسورة.</p></article>
          <article>🔁<h3>المراجعة</h3><p>نتائج مراجعات حقيقية.</p></article>
          <article>🏆<h3>الإنجازات</h3><p>نقاط ونجوم وسلسلة نشاط.</p></article>
          <article>👨‍🏫<h3>المعلم</h3><p>فصول ومتابعة للطلاب.</p></article>
        </section>
      </main>
    </Shell>
  );
}

function Login({ app }) {
  const [mode, setMode] = useState(app.user ? "update" : "login");
  const [role, setRole] = useState("parent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [child, setChild] = useState("");
  const [age, setAge] = useState("7-9");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      if (mode === "login") {
        const u = await signIn(email, password);
        await app.refresh();
        go(u.accountType === "teacher" ? "/teacher" : "/family");
      } else if (mode === "signup") {
        const r = await signUp({ email, password, displayName: name, accountType: role, childName: child, childAgeBand: age });
        if (r.sessionCreated) {
          await app.refresh();
          go(role === "teacher" ? "/teacher" : "/family");
        } else {
          setMsg("تم إنشاء الحساب. تحقق من بريدك ثم سجل الدخول.");
          setMode("login");
        }
      } else if (mode === "recover") {
        await requestPasswordReset(email);
        setMsg("أرسلنا رابط استعادة كلمة المرور إلى بريدك. افتحه من نفس المتصفح ثم اختر كلمة مرور جديدة.");
      } else if (mode === "update") {
        await updatePassword(password);
        setMsg("تم تغيير كلمة المرور بنجاح.");
        await app.refresh();
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "login" ? "أهلًا بعودتك" : mode === "signup" ? "ابدأ رحلتك" : mode === "recover" ? "استعادة كلمة المرور" : "كلمة مرور جديدة";

  return (
    <Shell user={app.user}>
      <main className="auth">
        <section className="panel authbox">
          {!app.user && mode !== "recover" && (
            <div className="tabs">
              <button className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>دخول</button>
              <button className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>حساب جديد</button>
            </div>
          )}
          <h2>{heading}</h2>
          {mode === "signup" && (
            <div className="tabs">
              <button className={role === "parent" ? "on" : ""} onClick={() => setRole("parent")}>ولي أمر</button>
              <button className={role === "teacher" ? "on" : ""} onClick={() => setRole("teacher")}>معلم</button>
            </div>
          )}
          <form onSubmit={submit}>
            {mode === "signup" && <input placeholder={role === "teacher" ? "اسم المعلم" : "اسم ولي الأمر"} value={name} onChange={e => setName(e.target.value)} required />}
            {mode !== "update" && <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required />}
            {(mode === "login" || mode === "signup" || mode === "update") && <input type="password" minLength="6" placeholder={mode === "update" ? "كلمة المرور الجديدة" : "كلمة المرور"} value={password} onChange={e => setPassword(e.target.value)} required />}
            {mode === "signup" && role === "parent" && (
              <>
                <input placeholder="اسم الطفل الأول" value={child} onChange={e => setChild(e.target.value)} required />
                <select value={age} onChange={e => setAge(e.target.value)}>
                  <option value="3-6">٣–٦ سنوات</option>
                  <option value="7-9">٧–٩ سنوات</option>
                  <option value="10-12">١٠–١٢ سنة</option>
                </select>
              </>
            )}
            <Msg text={err} err />
            <Msg text={msg} />
            <button className="primary full" disabled={busy}>
              {busy ? "جارٍ التنفيذ..." : mode === "login" ? "تسجيل الدخول" : mode === "signup" ? "إنشاء الحساب" : mode === "recover" ? "إرسال رابط الاستعادة" : "حفظ كلمة المرور الجديدة"}
            </button>
          </form>
          {!app.user && mode === "login" && <button className="link" onClick={() => { setMode("recover"); setMsg(""); setErr(""); }}>نسيت كلمة المرور؟</button>}
          {!app.user && mode === "recover" && <button className="link" onClick={() => { setMode("login"); setMsg(""); setErr(""); }}>العودة لتسجيل الدخول</button>}
          {app.user && mode === "update" && <button className="link" onClick={() => go(app.user.accountType === "teacher" ? "/teacher" : "/family")}>العودة إلى حسابي</button>}
        </section>
      </main>
    </Shell>
  );
}

function Family({ user }) {
  const [kids, setKids] = useState([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState("7-9");
  const [codes, setCodes] = useState({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const active = useChildId();

  async function load() {
    try {
      const r = await listChildren(user);
      setKids(r);
      if (r.length && !r.some(x => x.id === getActiveChildId())) setActiveChildId(r[0].id);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    if (user?.accountType === "teacher") go("/teacher");
    else if (user) load();
  }, [user?.id]);

  if (!user) return <Loading />;

  async function add(e) {
    e.preventDefault();
    try {
      const c = await createChild(user, { displayName: name, ageBand: age });
      setName("");
      setActiveChildId(c.id);
      setMsg("تمت إضافة الطفل.");
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function join(id) {
    try {
      await joinChildToClass(id, codes[id] || "");
      setMsg("تم ربط الطفل بالفصل.");
    } catch (e) { setErr(e.message); }
  }

  return (
    <Shell user={user}>
      <main className="wrap page">
        <Title k="حساب الأسرة" h="كل أطفالك في مكان واحد" p="اختر الطفل النشط، أضف طفلًا جديدًا أو اربطه بفصل المعلم." />
        <div className="grid2">
          <section className="panel">
            <h3>إضافة طفل</h3>
            <form onSubmit={add}>
              <input placeholder="اسم الطفل" value={name} onChange={e => setName(e.target.value)} required />
              <select value={age} onChange={e => setAge(e.target.value)}>
                <option value="3-6">٣–٦ سنوات</option>
                <option value="7-9">٧–٩ سنوات</option>
                <option value="10-12">١٠–١٢ سنة</option>
              </select>
              <button className="primary full">إضافة</button>
            </form>
            <Msg text={err} err /><Msg text={msg} />
          </section>
          <section className="panel">
            <h3>ملفات الأطفال</h3>
            <div className="list">
              {kids.map(c => (
                <article className={active === c.id ? "child selected" : "child"} key={c.id}>
                  <div className="avatar">{c.avatar || "🧒🏻"}</div>
                  <div className="grow"><b>{c.display_name}</b><small>{c.points || 0} نقطة • {c.stars || 0} نجمة • {c.streak || 0} يوم</small></div>
                  <button className="secondary" onClick={() => setActiveChildId(c.id)}>{active === c.id ? "نشط" : "اختيار"}</button>
                  <div className="join">
                    <input placeholder="كود الفصل" value={codes[c.id] || ""} onChange={e => setCodes({ ...codes, [c.id]: e.target.value })} />
                    <button className="secondary" onClick={() => join(c.id)}>ربط</button>
                  </div>
                  <button className="link" onClick={() => { setActiveChildId(c.id); go("/child"); }}>فتح وضع الطفل ←</button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </Shell>
  );
}

function Teacher({ user }) {
  const [data, setData] = useState({ classes: [], students: [], sessionsToday: 0 });
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try { setData(await teacherOverview(user.id)); }
    catch (e) { setErr(e.message); }
  }

  useEffect(() => {
    if (user?.accountType !== "teacher" && user?.accountType !== "admin") go("/");
    else if (user) load();
  }, [user?.id]);

  if (!user) return <Loading />;

  async function add(e) {
    e.preventDefault();
    try {
      await createTeacherClass(user.id, name);
      setName("");
      setMsg("تم إنشاء الفصل وكود الربط.");
      await load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <Shell user={user}>
      <main className="wrap page">
        <Title k="لوحة المعلم" h={`أهلًا ${user.name || "بالمعلم"}`} p="أنشئ فصولك وتابع تقدم الأطفال المرتبطين." />
        <div className="stats"><div><b>{data.classes.length}</b><span>فصل</span></div><div><b>{data.students.length}</b><span>طفل</span></div><div><b>{data.sessionsToday}</b><span>مراجعة اليوم</span></div></div>
        <div className="grid2">
          <section className="panel">
            <h3>فصل جديد</h3>
            <form onSubmit={add}><input placeholder="اسم الفصل" value={name} onChange={e => setName(e.target.value)} required /><button className="primary full">إنشاء الفصل</button></form>
            <Msg text={err} err /><Msg text={msg} />
            <div className="list compact">{data.classes.map(c => <div className="rowItem" key={c.id}><b>{c.name}</b><span>{c.join_code}</span></div>)}</div>
          </section>
          <section className="panel">
            <h3>تقدم الطلاب</h3>
            <div className="list compact">
              {data.students.map(s => (
                <article className="student" key={s.id}>
                  <div className="avatar">{s.avatar || "🧒🏻"}</div>
                  <div className="grow"><b>{s.display_name}</b><small>{s.classes.join(" • ") || "بدون فصل"}</small></div>
                  <span><b>{s.memorizedAverage}%</b> حفظ</span><span><b>{s.reviewAverage}%</b> مراجعة</span><span><b>{s.masteredCount}</b> متقنة</span>
                </article>
              ))}
              {!data.students.length && <p className="muted">لم يتم ربط أطفال بعد.</p>}
            </div>
          </section>
        </div>
      </main>
    </Shell>
  );
}

function Title({ k, h, p }) { return <div className="title"><span>{k}</span><h1>{h}</h1><p>{p}</p></div>; }

function useChildData(user) {
  const childId = useChildId();
  const [kids, setKids] = useState([]);
  const [progress, setProgress] = useState([]);
  const [err, setErr] = useState("");
  async function load() {
    if (!user || user.accountType === "teacher") return;
    try {
      const k = await listChildren(user);
      setKids(k);
      let id = childId;
      if (k.length && (!id || !k.some(x => x.id === id))) { id = k[0].id; setActiveChildId(id); }
      setProgress(id ? await getProgress(id) : []);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, [user?.id, childId]);
  return { childId, child: kids.find(x => x.id === childId), progress, err, reload: load };
}

function Quran({ user }) {
  const d = useChildData(user);
  const m = new Map(d.progress.map(x => [x.surah_number, x]));
  return <Shell user={user}><main className="wrap page"><Title k="القرآن" h="مصحف رحلتك" p={d.child ? `التقدم الحالي لـ ${d.child.display_name}` : "سجل الدخول واختر طفلًا لحفظ التقدم."} /><Msg text={d.err} err /><div className="surahs">{S.map(s => { const p = m.get(s.number), n = Number(p?.memorized_percent || 0); return <article key={s.number}><div className="num">{s.number}</div><h3>سورة {s.name}</h3><p>{s.ayat} آيات</p><div className="bar"><i style={{ width: `${n}%` }} /></div><small>{n}% حفظ • {Number(p?.review_percent || 0)}% مراجعة</small><button className="secondary full" onClick={() => go(n >= 100 ? "/review" : "/memorize")}>{n >= 100 ? "مراجعة" : "متابعة الحفظ"}</button></article>; })}</div></main></Shell>;
}

function Memorize({ user }) {
  const d = useChildData(user);
  const m = new Map(d.progress.map(x => [x.surah_number, x]));
  const target = S.find(s => Number(m.get(s.number)?.memorized_percent || 0) < 100) || S[0];
  const current = Number(m.get(target.number)?.memorized_percent || 0);
  const [msg, setMsg] = useState("");
  async function done() {
    if (!d.childId) return go("/family");
    try {
      const next = Math.min(100, current + 25);
      await saveProgress({ child_id: d.childId, surah_number: target.number, surah_name: target.name, memorized_percent: next, review_percent: Number(m.get(target.number)?.review_percent || 0), status: next >= 100 ? "review" : "learning" });
      await claimReward(d.childId, "memorize_session", dayKey("memorize", target.number)).catch(() => {});
      setMsg("تم حفظ تقدم الجلسة.");
      await d.reload();
    } catch (e) { setMsg(e.message); }
  }
  return <Shell user={user}><main className="wrap page narrow"><Title k="جلسة الحفظ" h={`سورة ${target.name}`} p="جلسة قصيرة مركزة للطفل النشط." /><section className="panel focus"><b className="percent">{current}%</b><div className="bar big"><i style={{ width: `${current}%` }} /></div><p>كل جلسة مكتملة تزيد التقدم ٢٥٪.</p><button className="primary full" onClick={done}>أنهيت جلسة الحفظ</button><Msg text={msg} /></section></main></Shell>;
}

function Review({ user }) {
  const d = useChildData(user);
  const [msg, setMsg] = useState("");
  const items = S.filter(s => Number(d.progress.find(x => x.surah_number === s.number)?.memorized_percent || 0) > 0);
  async function rate(s, score) {
    if (!d.childId) return go("/family");
    try {
      await recordReview(user, d.childId, s.number, score);
      await claimReward(d.childId, "review_session", dayKey("review", s.number)).catch(() => {});
      setMsg(`تم تسجيل مراجعة سورة ${s.name}.`);
      await d.reload();
    } catch (e) { setMsg(e.message); }
  }
  return <Shell user={user}><main className="wrap page"><Title k="المراجعة" h="ثبّت الحفظ بالمراجعة" p="قيّم أداء الطفل بعد التسميع." /><Msg text={msg} /><div className="review">{items.map(s => <article key={s.number}><b>سورة {s.name}</b><div className="row"><button onClick={() => rate(s, 60)}>يحتاج تدريب</button><button onClick={() => rate(s, 80)}>جيد</button><button onClick={() => rate(s, 100)}>ممتاز</button></div></article>)}{!items.length && <p>ابدأ جلسة حفظ أولًا.</p>}</div></main></Shell>;
}

function Games({ user }) {
  const d = useChildData(user);
  const [msg, setMsg] = useState("");
  async function done() {
    if (!d.childId) return go("/family");
    try { await claimReward(d.childId, "memory_game", dayKey("memory")); setMsg("رائع! تم تسجيل لعبة اليوم."); await d.reload(); }
    catch { setMsg("تم تسجيل لعبة اليوم مسبقًا."); }
  }
  return <Shell user={user}><main className="wrap page narrow"><Title k="الألعاب" h="لعبة الذاكرة اليومية" p="نشاط بسيط يكافئ الطفل مرة واحدة يوميًا." /><section className="panel focus"><div className="emoji">🧠 ⭐ 📖 🌙</div><button className="primary full" onClick={done}>أكملت لعبة الذاكرة</button><Msg text={msg} /></section></main></Shell>;
}

function Achievements({ user }) {
  const d = useChildData(user);
  const [items, setItems] = useState([]);
  useEffect(() => { if (d.childId) listAchievements(d.childId).then(setItems).catch(() => []); }, [d.childId]);
  return <Shell user={user}><main className="wrap page"><Title k="الإنجازات" h="ميداليات الرحلة" p="تُفتح تلقائيًا من النشاط الحقيقي." /><div className="badges">{Object.entries(badges).map(([slug, [a, b]]) => { const x = items.find(i => i.slug === slug); return <article className={x ? "won" : ""} key={slug}><div>{x ? "🏆" : "🔒"}</div><h3>{a}</h3><p>{b}</p><small>{x ? "تم الفتح" : "لم يُفتح بعد"}</small></article>; })}</div></main></Shell>;
}

function Challenges({ user }) {
  const d = useChildData(user);
  const [r, setR] = useState([]);
  useEffect(() => { if (d.childId) listRewardsToday(d.childId).then(setR).catch(() => []); }, [d.childId]);
  const rows = [["memorize_session", "جلسة حفظ"], ["review_session", "جلسة مراجعة"], ["memory_game", "لعبة الذاكرة"]];
  return <Shell user={user}><main className="wrap page narrow"><Title k="تحديات اليوم" h="ثلاث خطوات صغيرة" p="تُحتسب من سجل النشاط الحقيقي." /><div className="challenges">{rows.map(x => { const done = r.some(y => y.source_type === x[0]); return <article className={done ? "done" : ""} key={x[0]}><b>{done ? "✓" : "○"}</b><span>{x[1]}</span></article>; })}</div></main></Shell>;
}

function Child({ user }) {
  const d = useChildData(user);
  return <Shell user={user}><main className="wrap page"><div className="childHero"><div className="avatar big">{d.child?.avatar || "🧒🏻"}</div><div><span>وضع الطفل</span><h1>أهلًا {d.child?.display_name || "بطلنا الصغير"}!</h1></div></div><div className="kidgrid">{[["📖", "الحفظ", "/memorize"], ["🔁", "المراجعة", "/review"], ["🧠", "الألعاب", "/games"], ["🏆", "إنجازاتي", "/achievements"], ["🔥", "تحديات اليوم", "/challenges"], ["⭐", "غرفتي", "/room"]].map(x => <button key={x[2]} onClick={() => go(x[2])}><span>{x[0]}</span><b>{x[1]}</b></button>)}</div></main></Shell>;
}

function Room({ user }) {
  const d = useChildData(user);
  const avg = d.progress.length ? Math.round(d.progress.reduce((s, x) => s + Number(x.memorized_percent || 0), 0) / d.progress.length) : 0;
  return <Shell user={user}><main className="wrap page narrow"><Title k="غرفتي" h={d.child?.display_name || "ملف الطفل"} p="ملخص التقدم الحالي." /><section className="panel profile"><div className="avatar big">{d.child?.avatar || "🧒🏻"}</div><div className="stats"><div><b>{d.child?.points || 0}</b><span>نقطة</span></div><div><b>{d.child?.stars || 0}</b><span>نجمة</span></div><div><b>{d.child?.streak || 0}</b><span>يوم</span></div><div><b>{avg}%</b><span>متوسط الحفظ</span></div></div></section></main></Shell>;
}

export default function App() {
  const path = usePath();
  const app = useUser();
  const user = app.user;
  if (user === undefined) return <Loading />;
  if (!user && !["/", "/login", "/quran"].includes(path)) {
    setTimeout(() => go("/login"), 0);
    return <Loading />;
  }
  const routes = {
    "/": <Home user={user} />,
    "/login": <Login app={app} />,
    "/family": <Family user={user} />,
    "/teacher": <Teacher user={user} />,
    "/quran": <Quran user={user} />,
    "/memorize": <Memorize user={user} />,
    "/review": <Review user={user} />,
    "/games": <Games user={user} />,
    "/achievements": <Achievements user={user} />,
    "/challenges": <Challenges user={user} />,
    "/child": <Child user={user} />,
    "/room": <Room user={user} />,
  };
  return routes[path] || <Shell user={user}><main className="wrap page"><Title k="٤٠٤" h="الصفحة غير موجودة" p="ارجع للرئيسية." /><button className="primary" onClick={() => go("/")}>الرئيسية</button></main></Shell>;
}
