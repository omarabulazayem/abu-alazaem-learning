import { useAuth } from "@/_core/hooks/useAuth";
import LearningPageShell, { PageHeading } from "@/components/LearningPageShell";
import { useActiveChildId } from "@/lib/activeChild";
import { mergedSurahs, type ProgressRow } from "@/lib/learningData";
import { trpc } from "@/lib/trpc";
import { BookOpen, Search, Star, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Quran() {
  const auth = useAuth();
  const activeChildId = useActiveChildId();
  const progressQuery = trpc.progress.list.useQuery(activeChildId ? { childId: activeChildId } : undefined, {
    enabled: Boolean(auth.user && activeChildId),
    retry: false,
  });
  const [filter, setFilter] = useState("الكل");
  const [query, setQuery] = useState("");
  const filters = ["الكل", "جارية", "جديدة", "متقنة"];
  const surahs = mergedSurahs(progressQuery.data as ProgressRow[] | undefined, Boolean(auth.user && activeChildId));
  const shown = surahs.filter(surah => {
    const matchesFilter = filter === "الكل" || (filter === "جارية" && surah.progress > 0 && surah.progress < 100) || (filter === "جديدة" && surah.progress === 0) || (filter === "متقنة" && surah.progress === 100);
    return matchesFilter && (`${surah.name} ${surah.displayNumber}`).includes(query.trim());
  });

  return <LearningPageShell><main className="container-wide page-content">
    <PageHeading eyebrow="القرآن" title="مصحف رحلتك" description={auth.user && activeChildId ? "تصفح السور وتابع تقدم الطفل النشط من قاعدة البيانات." : "تصفح السور، وسجّل الدخول لاختيار طفل وحفظ تقدمه الحقيقي."} />
    {auth.user && !activeChildId && <div className="toast-note"><Users size={15} /> اختر طفلًا من حساب الأسرة حتى نعرض تقدمه الحقيقي.</div>}
    <div className="quran-tools"><label className="search-field"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث عن سورة..." aria-label="ابحث عن سورة" /></label><div className="tabs">{filters.map(item => <button key={item} className={`tab ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
    {progressQuery.error && <div className="auth-error">{progressQuery.error.message}</div>}
    {shown.length ? <div className="surah-grid">{shown.map(surah => <div className="surah-card" key={surah.name}><div className="surah-card-top"><div className="surah-number">{surah.displayNumber}</div><span className={`status-pill ${surah.tone}`}>{surah.statusLabel}</span></div><h3>سورة {surah.name}</h3><p>{surah.progress === 100 ? "أحسنت، هذه السورة متقنة" : "خطوة جميلة في رحلة الحفظ"}</p><div className="meta-row"><span><BookOpen size={12} /> {surah.ayat}</span><span><Star size={12} /> {surah.progress}%</span></div><div className="card-progress"><div className="card-progress-line"><span>نسبة الحفظ</span><b>{surah.progress}%</b></div><div className="mini-track"><i style={{ width: `${surah.progress}%` }} /></div></div><Link href={surah.progress === 100 ? "/review" : "/memorize"} className="play-button">{surah.progress === 100 ? "ابدأ المراجعة ←" : "افتح السورة ←"}</Link></div>)}</div> : <div className="empty-state"><Search size={20} /><strong>لم نجد سورة بهذا الاسم</strong><span>جرّب كتابة اسم أقصر أو أزل الفلتر.</span></div>}
  </main></LearningPageShell>;
}
