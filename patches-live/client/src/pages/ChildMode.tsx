import { useAuth } from "@/_core/hooks/useAuth";
import { useActiveChildId } from "@/lib/activeChild";
import { trpc } from "@/lib/trpc";
import { BookOpen, Gamepad2, LogOut, RotateCcw, Sparkles, Star, Trophy } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function ChildMode() {
  const auth = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/child" });
  const activeChildId = useActiveChildId();
  const [, navigate] = useLocation();
  const profile = trpc.profile.get.useQuery(activeChildId ? { childId: activeChildId } : undefined, { enabled: Boolean(auth.user && activeChildId), retry: false });
  const challenges = trpc.challenges.today.useQuery(activeChildId ? { childId: activeChildId } : undefined, { enabled: Boolean(auth.user && activeChildId), retry: false });

  useEffect(() => {
    if (!auth.loading && auth.user?.accountType === "teacher") navigate("/teacher");
    else if (!auth.loading && auth.user && !activeChildId) navigate("/family");
  }, [auth.loading, auth.user, activeChildId, navigate]);

  const child = profile.data;
  const challengeData = challenges.data as { completedCount?: number; total?: number } | undefined;
  if (auth.loading || !activeChildId) return <main className="child-mode" dir="rtl"><div className="child-mode-shell"><div className="loading-note">نجهز عالم الطفل...</div></div></main>;

  return <main className="child-mode" dir="rtl"><div className="child-mode-shell">
    <header className="child-mode-header"><div><span className="child-mode-avatar">{child?.avatar ?? "🧒🏻"}</span><div><span>مرحبًا</span><h1>{child?.displayName ?? "الحافظ الصغير"}</h1></div></div><button className="secondary-button" onClick={() => navigate("/family")}><LogOut size={15} /> حساب ولي الأمر</button></header>
    <section className="child-mode-hero"><div><span className="eyebrow"><Sparkles size={13} /> رحلة اليوم</span><h2>ماذا سننجز اليوم؟</h2><p>اختر نشاطًا واحدًا، وخذ خطوة صغيرة نحو هدفك.</p></div><div className="child-mode-score"><span><b>{child?.points ?? 0}</b> نقطة</span><span><Star size={15} /> <b>{child?.stars ?? 0}</b> نجمة</span><span>🔥 <b>{child?.streak ?? 0}</b> يوم</span></div></section>
    <div className="child-mode-challenge"><div><strong>تحديات اليوم</strong><span>{challengeData?.completedCount ?? 0} من {challengeData?.total ?? 3} مكتملة</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${((challengeData?.completedCount ?? 0) / (challengeData?.total ?? 3)) * 100}%` }} /></div><Link href="/challenges" className="text-link">شاهد التحديات ←</Link></div>
    <section className="child-mode-actions"><Link href="/memorize" className="child-action-card"><BookOpen size={30} /><strong>الحفظ</strong><span>أكمل سورة أو تابع من حيث توقفت</span></Link><Link href="/review" className="child-action-card"><RotateCcw size={30} /><strong>المراجعة</strong><span>ثبّت ما حفظته اليوم</span></Link><Link href="/games" className="child-action-card"><Gamepad2 size={30} /><strong>الألعاب</strong><span>تعلم واجمع النجوم</span></Link><Link href="/achievements" className="child-action-card"><Trophy size={30} /><strong>إنجازاتي</strong><span>شاهد الشارات التي فتحتها</span></Link></section>
  </div></main>;
}
