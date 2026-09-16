import { useAuth } from "@/_core/hooks/useAuth";
import { getActiveChildId, setActiveChildId } from "@/lib/activeChild";
import { trpc } from "@/lib/trpc";
import { Baby, BookOpen, CheckCircle2, Link2, LogOut, Plus, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import "./Family.css";

type AgeBand = "3-6" | "7-9" | "10-12";

type ChildRow = {
  id: string;
  display_name: string;
  avatar: string | null;
  age_band: AgeBand;
  points: number;
  stars: number;
  streak: number;
};

export default function Family() {
  const auth = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/family" });
  const [, navigate] = useLocation();
  const isParent = auth.user?.accountType === "parent" || auth.user?.accountType === "admin";
  const childrenQuery = trpc.family.children.list.useQuery(undefined, { enabled: isParent, retry: false });
  const [displayName, setDisplayName] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("7-9");
  const [joinCodes, setJoinCodes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const createChild = trpc.family.children.create.useMutation({
    onSuccess: async child => {
      setDisplayName("");
      setNotice("تم إنشاء ملف الطفل بنجاح.");
      setActiveChildId(String((child as Record<string, unknown>).id ?? ""));
      await childrenQuery.refetch();
    },
  });

  const joinClass = trpc.family.children.joinClass.useMutation({
    onSuccess: () => setNotice("تم ربط الطفل بفصل المعلم بنجاح."),
  });

  const children = useMemo(() => (childrenQuery.data ?? []) as ChildRow[], [childrenQuery.data]);
  const activeChildId = getActiveChildId();

  useEffect(() => {
    if (!auth.loading && auth.user && !isParent) navigate(auth.user.accountType === "teacher" ? "/teacher" : "/");
  }, [auth.loading, auth.user, isParent, navigate]);

  useEffect(() => {
    if (!children.length) return;
    if (!activeChildId || !children.some(child => child.id === activeChildId)) {
      setActiveChildId(children[0].id);
    }
  }, [children, activeChildId]);

  async function logout() {
    await auth.logout();
    navigate("/");
  }

  function submitChild(event: FormEvent) {
    event.preventDefault();
    const name = displayName.trim();
    if (name.length < 2) return;
    setNotice(null);
    createChild.mutate({ displayName: name, ageBand, avatar: "🧒🏻" });
  }

  function connectChild(childId: string) {
    const joinCode = (joinCodes[childId] || "").trim().toUpperCase();
    if (joinCode.length < 4) return;
    setNotice(null);
    joinClass.mutate({ childId, joinCode });
  }

  if (auth.loading || (auth.user && !isParent)) {
    return <main className="family-page" dir="rtl"><div className="family-shell"><div className="loading-note">نجهز حساب الأسرة...</div></div></main>;
  }

  return <main className="family-page" dir="rtl">
    <div className="family-shell">
      <header className="teacher-header">
        <Link href="/" className="brand"><span className="brand-mark" /><span className="brand-copy"><span className="brand-name">أبو العزايم</span><span className="brand-sub">حساب الأسرة</span></span></Link>
        <div className="teacher-header-actions"><span>{auth.user?.name || auth.user?.email}</span><button className="secondary-button" onClick={logout}><LogOut size={15} /> خروج</button></div>
      </header>

      <section className="family-hero">
        <div><span className="eyebrow"><Users size={14} /> ولي الأمر + الأطفال</span><h1>كل أطفالك في حساب واحد</h1><p>أضف أكثر من طفل، اختر الطفل النشط، وتابع رحلته أو اربطه بفصل المعلم باستخدام كود الربط.</p></div>
        <div className="teacher-hero-icon"><Baby size={44} /></div>
      </section>

      <section className="family-grid">
        <div className="card">
          <div className="card-head"><div><h3>إضافة طفل</h3><p>يمكن إضافة أكثر من طفل داخل نفس حساب ولي الأمر.</p></div><Plus size={19} /></div>
          <form className="family-create-form" onSubmit={submitChild}>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="اسم الطفل" minLength={2} />
            <select value={ageBand} onChange={e => setAgeBand(e.target.value as AgeBand)}><option value="3-6">٣–٦ سنوات</option><option value="7-9">٧–٩ سنوات</option><option value="10-12">١٠–١٢ سنة</option></select>
            <button className="primary-button" disabled={createChild.isPending}><Plus size={15} /> {createChild.isPending ? "جارٍ الإضافة..." : "إضافة الطفل"}</button>
          </form>
          {createChild.error && <div className="auth-error">{createChild.error.message}</div>}
          {joinClass.error && <div className="auth-error">{joinClass.error.message}</div>}
          {notice && <div className="auth-success">{notice}</div>}
        </div>

        <div className="card">
          <div className="card-head"><div><h3>ملفات الأطفال</h3><p>اختر الطفل الذي تريد أن تعمل المنصة على تقدمه الآن.</p></div><BookOpen size={19} /></div>
          {childrenQuery.isLoading ? <div className="loading-note">تحميل ملفات الأطفال...</div> : children.length ? <div className="family-child-list">
            {children.map(child => {
              const selected = getActiveChildId() === child.id;
              return <article key={child.id} className={`family-child-card ${selected ? "selected" : ""}`}>
                <div className="family-child-main">
                  <div className="family-avatar">{child.avatar || "🧒🏻"}</div>
                  <div><strong>{child.display_name}</strong><span>{child.age_band === "3-6" ? "٣–٦ سنوات" : child.age_band === "7-9" ? "٧–٩ سنوات" : "١٠–١٢ سنة"}</span></div>
                  <button className={selected ? "selected-child-button" : "secondary-button"} onClick={() => { setActiveChildId(child.id); setNotice(`تم اختيار ${child.display_name} كطفل نشط.`); }}>{selected ? <><CheckCircle2 size={14} /> الطفل النشط</> : "اختيار"}</button>
                </div>
                <div className="family-child-stats"><span><b>{child.points ?? 0}</b> نقطة</span><span><b>{child.stars ?? 0}</b> نجمة</span><span><b>{child.streak ?? 0}</b> يوم متواصل</span></div>
                <div className="family-link-row"><div className="family-link-label"><Link2 size={14} /> ربط بفصل المعلم</div><input value={joinCodes[child.id] || ""} onChange={e => setJoinCodes(current => ({ ...current, [child.id]: e.target.value }))} placeholder="أدخل كود الفصل" /><button className="secondary-button" disabled={joinClass.isPending} onClick={() => connectChild(child.id)}>ربط</button></div>
                <div className="family-child-actions"><button className="text-link" onClick={() => { setActiveChildId(child.id); navigate("/room"); }}>فتح غرفة الطفل ←</button></div>
              </article>;
            })}
          </div> : <div className="empty-state teacher-empty"><Baby size={22} /><strong>لا يوجد أطفال بعد</strong><span>أضف أول طفل من النموذج المجاور.</span></div>}
        </div>
      </section>
    </div>
  </main>;
}
