import "./Teacher.css";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BookOpen, CheckCircle2, Copy, GraduationCap, LogOut, Plus, School, Star, Users } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Teacher() {
  const auth = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/teacher" });
  const [, navigate] = useLocation();
  const [className, setClassName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const isTeacher = auth.user?.accountType === "teacher" || auth.user?.accountType === "admin";
  const overview = trpc.teacher.overview.useQuery(undefined, { enabled: isTeacher, retry: false });
  const createClass = trpc.teacher.classes.create.useMutation({
    onSuccess: () => {
      setClassName("");
      setNotice("تم إنشاء الفصل وكود الربط بنجاح.");
      void overview.refetch();
    },
  });

  useEffect(() => {
    if (!auth.loading && auth.user && !isTeacher) navigate("/");
  }, [auth.loading, auth.user, isTeacher, navigate]);

  async function logout() {
    await auth.logout();
    navigate("/");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const name = className.trim();
    if (name.length < 2) return;
    setNotice(null);
    createClass.mutate({ name });
  }

  if (auth.loading || (auth.user && !isTeacher)) {
    return <main className="teacher-page" dir="rtl"><div className="teacher-shell"><div className="loading-note">نجهز لوحة المعلم...</div></div></main>;
  }

  const data = overview.data;
  const classes = (data?.classes ?? []) as Array<Record<string, unknown>>;
  const students = (data?.students ?? []) as Array<{
    id: string; displayName: string; avatar: string; ageBand: string; points: number; stars: number; classes: string[];
    surahCount: number; masteredCount: number; memorizedAverage: number; reviewAverage: number; lastActivityAt: string | null;
  }>;

  return <main className="teacher-page" dir="rtl">
    <div className="teacher-shell">
      <header className="teacher-header">
        <Link href="/" className="brand"><span className="brand-mark" /><span className="brand-copy"><span className="brand-name">أبو العزايم</span><span className="brand-sub">لوحة المعلم</span></span></Link>
        <div className="teacher-header-actions"><span>{auth.user?.name || auth.user?.email}</span><button className="secondary-button" onClick={logout}><LogOut size={15} /> خروج</button></div>
      </header>

      <section className="teacher-hero">
        <div><span className="eyebrow"><GraduationCap size={14} /> مساحة المعلم</span><h1>أهلًا {auth.user?.name || "بالمعلم"}</h1><p>أنشئ فصولك واربط ملفات الأطفال بها لمتابعة الحفظ والمراجعة بدون إنشاء حساب منفصل للطفل.</p></div>
        <div className="teacher-hero-icon"><School size={46} /></div>
      </section>

      <section className="teacher-stats">
        <div className="stat-card"><div className="stat-icon"><School size={18} /></div><div><b>{data?.classCount ?? 0}</b><span>فصل</span></div></div>
        <div className="stat-card"><div className="stat-icon"><Users size={18} /></div><div><b>{data?.studentCount ?? 0}</b><span>طفل مرتبط</span></div></div>
        <div className="stat-card"><div className="stat-icon"><BookOpen size={18} /></div><div><b>{data?.sessionsToday ?? 0}</b><span>مراجعات اليوم</span></div></div>
      </section>

      <section className="teacher-grid">
        <div className="card">
          <div className="card-head"><div><h3>إنشاء فصل جديد</h3><p>سيتم إنشاء كود ربط فريد تشاركه مع ولي الأمر.</p></div><Plus size={19} /></div>
          <form className="teacher-create-form" onSubmit={submit}><input value={className} onChange={event => setClassName(event.target.value)} placeholder="مثال: مجموعة جزء عم" /><button className="primary-button" disabled={createClass.isPending}><Plus size={15} /> {createClass.isPending ? "جارٍ الإنشاء..." : "إنشاء الفصل"}</button></form>
          {createClass.error && <div className="auth-error">{createClass.error.message}</div>}
          {notice && <div className="auth-success">{notice}</div>}
        </div>

        <div className="card">
          <div className="card-head"><div><h3>فصولي</h3><p>الطلاب سيظهرون بعد ربط ولي الأمر للطفل بالفصل.</p></div><Users size={19} /></div>
          {overview.isLoading ? <div className="loading-note">تحميل الفصول...</div> : classes.length ? <div className="teacher-class-list">{classes.map(item => {
            const id = String(item.id ?? "");
            const name = String(item.name ?? "فصل");
            const joinCode = String(item.join_code ?? "");
            return <div className="teacher-class-item" key={id}><div><strong>{name}</strong><span>كود الربط: {joinCode}</span></div><button className="icon-button" title="نسخ الكود" onClick={() => { void navigator.clipboard.writeText(joinCode); setNotice("تم نسخ كود الربط."); }}><Copy size={15} /></button></div>;
          })}</div> : <div className="empty-state teacher-empty"><School size={22} /><strong>لا توجد فصول بعد</strong><span>أنشئ أول فصل من النموذج المجاور.</span></div>}
        </div>
      </section>

      <section className="card teacher-students-card">
        <div className="card-head"><div><h3>تقدم الأطفال المرتبطين</h3><p>ملخص حي للحفظ والمراجعة من Supabase لكل طفل في فصولك.</p></div><Users size={19} /></div>
        {overview.isLoading ? <div className="loading-note">تحميل تقدم الأطفال...</div> : students.length ? <div className="teacher-student-list">{students.map(student => <article className="teacher-student-item" key={student.id}>
          <div className="teacher-student-head"><div className="teacher-student-identity"><span className="teacher-student-avatar">{student.avatar || "🧒🏻"}</span><div><strong>{student.displayName}</strong><span>{student.classes.length ? student.classes.join(" • ") : "بدون فصل"}</span></div></div><div className="teacher-student-points"><Star size={14} /> {student.points} نقطة</div></div>
          <div className="teacher-student-metrics"><span><b>{student.surahCount}</b> سورة مسجلة</span><span><b>{student.masteredCount}</b> متقنة</span><span><b>{student.memorizedAverage}%</b> متوسط الحفظ</span><span><b>{student.reviewAverage}%</b> متوسط المراجعة</span></div>
          <div className="teacher-progress-row"><div><span>الحفظ</span><b>{student.memorizedAverage}%</b></div><div className="mini-track"><i style={{ width: `${student.memorizedAverage}%` }} /></div></div>
          <div className="teacher-progress-row"><div><span>المراجعة</span><b>{student.reviewAverage}%</b></div><div className="mini-track"><i style={{ width: `${student.reviewAverage}%` }} /></div></div>
          <div className="teacher-student-foot"><span>{student.lastActivityAt ? `آخر نشاط ${new Date(student.lastActivityAt).toLocaleDateString("ar-EG")}` : "لا يوجد نشاط بعد"}</span>{student.masteredCount > 0 && <span className="status-pill"><CheckCircle2 size={12} /> بدأ الإتقان</span>}</div>
        </article>)}</div> : <div className="empty-state teacher-empty"><Users size={22} /><strong>لا يوجد أطفال مرتبطون بعد</strong><span>شارك كود الفصل مع ولي الأمر، وسيظهر الطفل هنا بعد الربط.</span></div>}
      </section>
    </div>
  </main>;
}
