import { useAuth } from "@/_core/hooks/useAuth";
import LearningPageShell, { PageHeading } from "@/components/LearningPageShell";
import { useActiveChildId } from "@/lib/activeChild";
import { trpc } from "@/lib/trpc";
import { Award, BookOpenCheck, Flame, Medal, RotateCcw, Sparkles, Star, Trophy, Users } from "lucide-react";
import { useLocation } from "wouter";

const catalog = [
  { slug: "first_step", title: "أول خطوة", description: "سجّل أول تقدم حقيقي في الحفظ.", icon: Sparkles },
  { slug: "first_session", title: "جلسة مباركة", description: "أكمل أول جلسة تحصل منها على مكافأة.", icon: Star },
  { slug: "first_review", title: "المراجِع الصغير", description: "أكمل أول جلسة مراجعة مسجلة.", icon: RotateCcw },
  { slug: "first_surah", title: "سورة كاملة", description: "أتم حفظ أول سورة بنسبة 100٪.", icon: BookOpenCheck },
  { slug: "points_100", title: "مئة نقطة", description: "اجمع 100 نقطة من أنشطة التعلم.", icon: Medal },
  { slug: "streak_3", title: "ثلاثة أيام", description: "حافظ على نشاط التعلم 3 أيام متتالية.", icon: Flame },
  { slug: "five_surahs", title: "خمس سور", description: "أتم حفظ خمس سور كاملة.", icon: Trophy },
  { slug: "streak_7", title: "أسبوع كامل", description: "حافظ على نشاط التعلم 7 أيام متتالية.", icon: Award },
] as const;

type AchievementRow = { slug: string; unlocked_at: string };

export default function Achievements() {
  const auth = useAuth();
  const activeChildId = useActiveChildId();
  const [, navigate] = useLocation();
  const achievements = trpc.achievements.list.useQuery(activeChildId ? { childId: activeChildId } : undefined, {
    enabled: Boolean(auth.user && activeChildId),
    retry: false,
  });
  const profile = trpc.profile.get.useQuery(activeChildId ? { childId: activeChildId } : undefined, {
    enabled: Boolean(auth.user && activeChildId),
    retry: false,
  });

  const rows = (achievements.data ?? []) as AchievementRow[];
  const unlocked = new Map(rows.map(row => [row.slug, row]));

  function requireChild() {
    if (!auth.user) navigate("/login?next=/achievements");
    else if (auth.user.accountType === "teacher") navigate("/teacher");
    else if (!activeChildId) navigate("/family");
  }

  return <LearningPageShell><main className="container-wide page-content">
    <PageHeading eyebrow="الإنجازات" title="رحلة الإنجازات" description="كل شارة هنا تُفتح من نشاط حقيقي محفوظ في Supabase، وليست رقمًا ثابتًا في الواجهة." />
    {!auth.user || !activeChildId ? <div className="toast-note" onClick={requireChild} style={{ cursor: "pointer" }}><Users size={15} /> سجّل الدخول واختر الطفل النشط لعرض إنجازاته الحقيقية.</div> : null}
    {achievements.error && <div className="auth-error">{achievements.error.message}</div>}

    <div className="page-stat-row">
      <div className="stat-card"><div className="stat-icon"><Trophy size={18} /></div><div><b>{rows.length}</b><span>إنجاز مفتوح</span></div></div>
      <div className="stat-card"><div className="stat-icon"><Star size={18} /></div><div><b>{profile.data?.stars ?? 0}</b><span>نجمة</span></div></div>
      <div className="stat-card"><div className="stat-icon"><Sparkles size={18} /></div><div><b>{profile.data?.points ?? 0}</b><span>نقطة</span></div></div>
      <div className="stat-card"><div className="stat-icon"><Flame size={18} /></div><div><b>{profile.data?.streak ?? 0}</b><span>يوم متواصل</span></div></div>
    </div>

    <section className="section">
      <div className="section-heading"><div><h2 className="section-title">شارات الطفل</h2><p className="section-description">الإنجازات المقفلة توضّح الهدف التالي بدون إعطاء نقاط غير مستحقة.</p></div></div>
      <div className="feature-grid">{catalog.map(item => {
        const row = unlocked.get(item.slug);
        const Icon = item.icon;
        return <article className={`feature-card ${row ? "" : "achievement-locked"}`} key={item.slug}>
          <div className="feature-icon"><Icon size={20} /></div>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <span className={`status-pill ${row ? "" : "purple"}`}>{row ? `فُتح ${new Date(row.unlocked_at).toLocaleDateString("ar-EG")}` : "لم يُفتح بعد"}</span>
        </article>;
      })}</div>
    </section>
  </main></LearningPageShell>;
}
