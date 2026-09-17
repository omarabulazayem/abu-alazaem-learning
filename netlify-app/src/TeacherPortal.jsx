import React, { useEffect, useMemo, useState } from "react";
import {
  claimReward,
  createTeacherClass,
  dayKey,
  getCurrentUser,
  getProgress,
  recordReview,
  rest,
  signOut,
  teacherOverview,
} from "./api.js";
import { getSurah } from "./quranData.js";

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}

function navigate(path) {
  if (routePath() !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function formatDate(value) {
  if (!value) return "لا يوجد نشاط بعد";
  try {
    return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function TeacherHeader({ user }) {
  const [open, setOpen] = useState(false);
  async function logout() {
    await signOut();
    navigate("/");
  }
  const links = [
    ["لوحة المعلم", "/teacher"],
    ["الفصول", "/teacher/classes"],
    ["الطلاب", "/teacher/students"],
  ];
  return (
    <header className="teacherHeader">
      <div className="wrap nav">
        <button className="brand" onClick={() => navigate("/teacher")}>
          <span className="logo">ع</span>
          <span><b>أبو العزايم</b><small>بوابة المعلم</small></span>
        </button>
        <nav className={open ? "links open" : "links"}>
          {links.map(([label, path]) => <button key={path} onClick={() => { navigate(path); setOpen(false); }}>{label}</button>)}
        </nav>
        <div className="actions">
          <span className="teacherName">👨‍🏫 {user?.name || "المعلم"}</span>
          <button className="secondary" onClick={logout}>خروج</button>
          <button className="menu" onClick={() => setOpen(v => !v)}>☰</button>
        </div>
      </div>
    </header>
  );
}

function TeacherShell({ user, children }) {
  return (
    <div className="app teacherApp" dir="rtl">
      <TeacherHeader user={user} />
      {children}
      <footer><div className="wrap">أبو العزايم للحفظ الممتع • بوابة المعلم لمتابعة الحفظ والمراجعة.</div></footer>
    </div>
  );
}

function TeacherLoading() {
  return <div className="center"><i className="spinner" /><p>جارٍ تجهيز بوابة المعلم...</p></div>;
}

function ErrorBox({ text }) {
  return text ? <div className="msg error teacherMsg">{text}</div> : null;
}

function EmptyState({ icon, title, text, action, onAction }) {
  return (
    <div className="teacherEmpty">
      <span>{icon}</span><h3>{title}</h3><p>{text}</p>
      {action && <button className="primary" onClick={onAction}>{action}</button>}
    </div>
  );
}

function Dashboard({ data }) {
  const recent = [...data.students].sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0)).slice(0, 5);
  return (
    <main className="wrap page teacherPage">
      <section className="teacherHero">
        <div><span className="kicker">لوحة المعلم</span><h1>متابعة واضحة لكل فصل وطالب</h1><p>أنشئ الفصول، شارك كود الربط، تابع الحفظ والمراجعة، وسجل التسميع من مكان واحد.</p></div>
        <div className="teacherHeroMark">👨‍🏫</div>
      </section>
      <section className="teacherStats">
        <button onClick={() => navigate("/teacher/classes")}><span>📚</span><b>{data.classes.length}</b><small>الفصول</small></button>
        <button onClick={() => navigate("/teacher/students")}><span>🧒</span><b>{data.students.length}</b><small>الطلاب</small></button>
        <div><span>🔁</span><b>{data.sessionsToday}</b><small>مراجعات اليوم</small></div>
        <div><span>✅</span><b>{data.students.reduce((sum, s) => sum + Number(s.masteredCount || 0), 0)}</b><small>سور متقنة</small></div>
      </section>
      <section className="teacherSectionHead"><div><span>آخر النشاط</span><h2>الطلاب الأحدث نشاطًا</h2></div><button className="secondary" onClick={() => navigate("/teacher/students")}>كل الطلاب</button></section>
      {recent.length ? <div className="teacherStudentGrid">{recent.map(student => <StudentCard key={student.id} student={student} />)}</div> : <EmptyState icon="🧒" title="لا يوجد طلاب مرتبطون بعد" text="أنشئ فصلًا وشارك كود الربط مع ولي الأمر، وبعد الربط سيظهر الطالب هنا." action="إدارة الفصول" onAction={() => navigate("/teacher/classes")} />}
    </main>
  );
}

function Classes({ user, data, reload }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await createTeacherClass(user.id, name.trim());
      setName("");
      setMessage("تم إنشاء الفصل بنجاح. شارك كود الربط مع ولي الأمر.");
      await reload();
    } catch (e) { setError(e.message || "تعذر إنشاء الفصل."); }
    finally { setBusy(false); }
  }
  async function copy(code) {
    try { await navigator.clipboard.writeText(code); setMessage(`تم نسخ الكود ${code}`); }
    catch { setMessage(`كود الفصل: ${code}`); }
  }
  return (
    <main className="wrap page teacherPage">
      <div className="title"><span>إدارة الفصول</span><h1>فصولي</h1><p>أنشئ فصلًا لكل مجموعة وشارك كود الربط مع أولياء الأمور.</p></div>
      <div className="teacherSplit">
        <section className="panel teacherCreateClass"><h3>فصل جديد</h3><form onSubmit={create}><label>اسم الفصل<input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: حلقة جزء عمّ" maxLength="80" required /></label><button className="primary full" disabled={busy}>{busy ? "جارٍ الإنشاء..." : "إنشاء الفصل"}</button></form>{message && <div className="msg ok">{message}</div>}<ErrorBox text={error} /></section>
        <section><div className="teacherSectionHead"><div><span>{data.classes.length} فصل</span><h2>الفصول الحالية</h2></div></div>{data.classes.length ? <div className="teacherClassGrid">{data.classes.map(c => { const count = data.students.filter(s => s.classes.includes(c.name)).length; return <article className="teacherClassCard" key={c.id}><div className="teacherClassIcon">📚</div><div className="grow"><h3>{c.name}</h3><p>{count} طالب مرتبط</p></div><div className="joinCode"><small>كود الربط</small><b>{c.join_code}</b><button className="link" onClick={() => copy(c.join_code)}>نسخ</button></div></article>; })}</div> : <EmptyState icon="📚" title="أنشئ أول فصل" text="بعد إنشاء الفصل سيظهر كود ربط يمكن لولي الأمر استخدامه لإضافة طفله." />}</section>
      </div>
    </main>
  );
}

function StudentCard({ student }) {
  return (
    <button className="teacherStudentCard" onClick={() => navigate(`/teacher/student/${student.id}`)}>
      <div className="avatar">{student.avatar || "🧒🏻"}</div>
      <div className="grow"><b>{student.display_name}</b><small>{student.classes.join(" • ") || "بدون فصل"}</small></div>
      <div className="teacherMiniProgress"><span><b>{student.memorizedAverage}%</b> حفظ</span><span><b>{student.reviewAverage}%</b> مراجعة</span></div>
      <span className="teacherArrow">←</span>
    </button>
  );
}

function Students({ data }) {
  const [search, setSearch] = useState("");
  const [className, setClassName] = useState("all");
  const filtered = useMemo(() => data.students.filter(student => {
    const q = search.trim().toLowerCase();
    const searchOk = !q || student.display_name.toLowerCase().includes(q) || student.classes.join(" ").toLowerCase().includes(q);
    const classOk = className === "all" || student.classes.includes(className);
    return searchOk && classOk;
  }), [data.students, search, className]);
  return (
    <main className="wrap page teacherPage">
      <div className="title"><span>الطلاب</span><h1>متابعة الطلاب</h1><p>افتح ملف أي طالب لمشاهدة تفاصيل السور وتسجيل مراجعة جديدة.</p></div>
      <section className="teacherFilters"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم الطالب أو الفصل" /><select value={className} onChange={e => setClassName(e.target.value)}><option value="all">كل الفصول</option>{data.classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select><span>{filtered.length} طالب</span></section>
      {filtered.length ? <div className="teacherStudentGrid">{filtered.map(student => <StudentCard key={student.id} student={student} />)}</div> : <EmptyState icon="🔎" title="لا توجد نتائج" text={data.students.length ? "غيّر البحث أو الفلتر لعرض طلاب آخرين." : "لا يوجد طلاب مرتبطون بفصولك حتى الآن."} />}
    </main>
  );
}

function StudentDetail({ user, data, studentId, reloadOverview }) {
  const summary = data.students.find(s => s.id === studentId);
  const [progress, setProgress] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [score, setScore] = useState(100);
  const [surahNumber, setSurahNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!summary) return;
    try {
      const [rows, reviewRows] = await Promise.all([
        getProgress(studentId),
        rest(`/review_events?child_id=eq.${encodeURIComponent(studentId)}&select=id,surah_number,score,notes,reviewed_at,created_by&order=reviewed_at.desc&limit=20`),
      ]);
      setProgress(rows || []); setReviews(reviewRows || []);
      const first = (rows || []).find(r => Number(r.memorized_percent || 0) > 0);
      setSurahNumber(current => current || (first ? String(first.surah_number) : ""));
    } catch (e) { setError(e.message || "تعذر تحميل ملف الطالب."); }
  }
  useEffect(() => { load(); }, [studentId, summary?.id]);

  if (!summary) return <main className="wrap page teacherPage"><button className="link" onClick={() => navigate("/teacher/students")}>← كل الطلاب</button><EmptyState icon="🔒" title="الطالب غير متاح" text="هذا الطالب غير مرتبط بفصولك أو تم فك الربط." /></main>;

  const activeProgress = progress.filter(r => Number(r.memorized_percent || 0) > 0);
  async function submitReview(e) {
    e.preventDefault();
    if (!surahNumber) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const n = Number(surahNumber);
      await recordReview(user, studentId, n, Number(score), notes.trim());
      const reward = await claimReward(studentId, "review_session", dayKey("review", n)).catch(() => null);
      const r = Array.isArray(reward) ? reward[0] : reward;
      setMessage(r?.awarded === false ? "تم تسجيل المراجعة. مكافأة هذه السورة لليوم حصل عليها الطالب مسبقًا." : "تم تسجيل المراجعة وتحديث تقدم الطالب بنجاح.");
      setNotes("");
      await Promise.all([load(), reloadOverview()]);
    } catch (e) { setError(e.message || "تعذر تسجيل المراجعة."); }
    finally { setBusy(false); }
  }

  return (
    <main className="wrap page teacherPage">
      <button className="teacherBack" onClick={() => navigate("/teacher/students")}>→ العودة للطلاب</button>
      <section className="teacherStudentHero"><div className="avatar big">{summary.avatar || "🧒🏻"}</div><div className="grow"><span>{summary.classes.join(" • ")}</span><h1>{summary.display_name}</h1><p>آخر نشاط: {formatDate(summary.lastActivityAt)}</p></div><div className="teacherStudentHeroStats"><div><b>{summary.memorizedAverage}%</b><span>متوسط الحفظ</span></div><div><b>{summary.reviewAverage}%</b><span>متوسط المراجعة</span></div><div><b>{summary.masteredCount}</b><span>سور متقنة</span></div></div></section>
      <div className="teacherDetailGrid">
        <section className="panel"><div className="teacherSectionHead"><div><span>{activeProgress.length} سورة بدأها</span><h2>تقدم السور</h2></div></div>{activeProgress.length ? <div className="teacherProgressList">{activeProgress.map(row => { const s = getSurah(row.surah_number); return <article key={row.surah_number}><div className="num">{row.surah_number}</div><div className="grow"><b>سورة {s?.name || row.surah_name || row.surah_number}</b><div className="bar"><i style={{ width: `${Number(row.memorized_percent || 0)}%` }} /></div><small>{Number(row.memorized_percent || 0)}% حفظ • {Number(row.review_percent || 0)}% مراجعة • {row.status === "mastered" ? "متقنة" : row.status === "review" ? "تحتاج مراجعة" : "قيد الحفظ"}</small></div></article>; })}</div> : <EmptyState icon="📖" title="لم يبدأ الحفظ بعد" text="سيظهر تقدم السور هنا بمجرد أن يبدأ الطفل أول جلسة حفظ." />}</section>
        <section className="panel teacherReviewBox"><h2>تسجيل مراجعة</h2><p className="muted">سجّل نتيجة التسميع بعد مراجعة الطفل معك.</p>{activeProgress.length ? <form onSubmit={submitReview}><label>السورة<select value={surahNumber} onChange={e => setSurahNumber(e.target.value)} required>{activeProgress.map(row => { const s = getSurah(row.surah_number); return <option key={row.surah_number} value={row.surah_number}>سورة {s?.name || row.surah_name || row.surah_number}</option>; })}</select></label><label>التقييم<select value={score} onChange={e => setScore(Number(e.target.value))}><option value="100">ممتاز — 100%</option><option value="90">ممتاز جدًا — 90%</option><option value="80">جيد — 80%</option><option value="60">يحتاج تدريب — 60%</option></select></label><label>ملاحظات<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظة اختيارية لولي الأمر" maxLength="300" /></label><button className="primary full" disabled={busy}>{busy ? "جارٍ التسجيل..." : "حفظ نتيجة المراجعة"}</button></form> : <p className="muted">لا يمكن تسجيل مراجعة قبل أن يبدأ الطفل حفظ سورة.</p>}{message && <div className="msg ok">{message}</div>}<ErrorBox text={error} /></section>
      </div>
      <section className="panel teacherHistory"><div className="teacherSectionHead"><div><span>آخر 20 مراجعة</span><h2>سجل المراجعات</h2></div></div>{reviews.length ? <div className="teacherReviewHistory">{reviews.map(review => { const s = getSurah(review.surah_number); return <article key={review.id}><div><b>سورة {s?.name || review.surah_number}</b><small>{formatDate(review.reviewed_at)}</small></div><strong>{review.score}%</strong>{review.notes && <p>{review.notes}</p>}</article>; })}</div> : <p className="muted">لم تُسجل مراجعات لهذا الطالب بعد.</p>}</section>
    </main>
  );
}

export default function TeacherPortal() {
  const [user, setUser] = useState(undefined);
  const [data, setData] = useState({ classes: [], students: [], sessionsToday: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [path, setPath] = useState(routePath());

  async function reload() {
    if (!user?.id) return;
    setLoadingData(true);
    try { setData(await teacherOverview(user.id)); setError(""); }
    catch (e) { setError(e.message || "تعذر تحميل بيانات المعلم."); }
    finally { setLoadingData(false); }
  }

  useEffect(() => {
    const sync = () => setPath(routePath());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const current = await getCurrentUser();
        if (!alive) return;
        if (!current) return navigate("/login");
        if (current.accountType !== "teacher" && current.accountType !== "admin") return navigate("/family");
        setUser(current);
      } catch (e) { if (alive) setError(e.message || "تعذر التحقق من حساب المعلم."); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => { if (user?.id) reload(); }, [user?.id]);

  if (user === undefined) return <TeacherLoading />;
  if (loadingData && !data.classes.length && !data.students.length) return <TeacherShell user={user}><TeacherLoading /></TeacherShell>;

  const match = path.match(/^\/teacher\/student\/([0-9a-f-]+)$/i);
  let page;
  if (path === "/teacher" || path === "/teacher/") page = <Dashboard data={data} />;
  else if (path === "/teacher/classes") page = <Classes user={user} data={data} reload={reload} />;
  else if (path === "/teacher/students") page = <Students data={data} />;
  else if (match) page = <StudentDetail user={user} data={data} studentId={match[1]} reloadOverview={reload} />;
  else page = <main className="wrap page teacherPage"><EmptyState icon="🧭" title="الصفحة غير موجودة" text="ارجع إلى لوحة المعلم واختر القسم المطلوب." action="لوحة المعلم" onAction={() => navigate("/teacher")} /></main>;

  return <TeacherShell user={user}><ErrorBox text={error} />{page}</TeacherShell>;
}
