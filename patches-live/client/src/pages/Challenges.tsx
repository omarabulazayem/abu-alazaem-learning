import { useAuth } from "@/_core/hooks/useAuth";
import LearningPageShell, { PageHeading } from "@/components/LearningPageShell";
import { useActiveChildId } from "@/lib/activeChild";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Circle, Flag, Sparkles, Users } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

type Challenge = { id: string; title: string; description: string; href: string; completed: boolean };

export default function Challenges() {
  const auth = useAuth();
  const activeChildId = useActiveChildId();
  const [, navigate] = useLocation();
  const query = trpc.challenges.today.useQuery(activeChildId ? { childId: activeChildId } : undefined, { enabled: Boolean(auth.user && activeChildId), retry: false });
  const data = query.data as { challenges?: Challenge[]; completedCount?: number; total?: number } | undefined;
  const challenges = data?.challenges ?? [];
  const completed = data?.completedCount ?? 0;
  const total = data?.total ?? 3;
  useEffect(() => { if (!auth.loading && auth.user?.accountType === "teacher") navigate("/teacher"); }, [auth.loading, auth.user, navigate]);

  return <LearningPageShell><main className="container-wide page-content">
    <PageHeading eyebrow="التحديات" title="تحديات اليوم" description="ثلاث مهام قصيرة تُحتسب تلقائيًا من النشاط الحقيقي للطفل، بدون زر إكمال يدوي." />
    {!auth.user || !activeChildId ? <div className="toast-note"><Users size={15} /> سجّل الدخول واختر الطفل النشط من حساب الأسرة لعرض تحدياته.</div> : null}
    {query.error && <div className="auth-error">{query.error.message}</div>}
    <div className="progress-banner" style={{ marginBottom: 22 }}><div className="progress-content"><div className="progress-kicker">إنجاز اليوم</div><div className="progress-main"><div><h3>{completed === total ? "أكملت كل تحديات اليوم!" : `${total - completed} تحدٍ متبقٍ`}</h3><p>تتحدث الحالة تلقائيًا بعد الحفظ أو المراجعة أو اللعبة.</p></div><span className="progress-number">{completed}/{total}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${total ? completed / total * 100 : 0}%` }} /></div></div><div className="badge-illustration"><span className="big-crescent">🎯</span></div></div>
    <div className="challenge-live-grid">{challenges.length ? challenges.map(item => <article className={`card challenge-live-card ${item.completed ? "done" : ""}`} key={item.id}><div className="challenge-live-icon">{item.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}</div><div><span className="eyebrow"><Flag size={13} /> تحدٍ يومي</span><h3>{item.title}</h3><p>{item.description}</p></div>{item.completed ? <span className="status-pill">مكتمل ✓</span> : <Link className="play-button" href={item.href}>ابدأ التحدي ←</Link>}</article>) : <div className="empty-state"><Sparkles size={20} /><strong>اختر طفلًا أولًا</strong><span>ستظهر مهام اليوم هنا فور اختيار الطفل النشط.</span></div>}</div>
  </main></LearningPageShell>;
}
