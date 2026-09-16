import { getCurrentUser, signInWithPassword, signUpWithPassword } from "@/lib/supabaseAuth";
import { BookOpen, GraduationCap, HeartHandshake, KeyRound, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";

type Mode = "login" | "signup";
type AccountType = "parent" | "teacher";

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [accountType, setAccountType] = useState<AccountType>("parent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [childName, setChildName] = useState("");
  const [childAgeBand, setChildAgeBand] = useState<"3-6" | "7-9" | "10-12">("7-9");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      if (mode === "login") {
        await signInWithPassword(email.trim(), password);
        const currentUser = await getCurrentUser();
        navigate(currentUser?.accountType === "teacher" ? "/teacher" : "/family");
      } else {
        const result = await signUpWithPassword({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          accountType,
          childName: accountType === "parent" ? childName.trim() : undefined,
          childAgeBand: accountType === "parent" ? childAgeBand : undefined,
        });
        if (result.session) {
          navigate(accountType === "teacher" ? "/teacher" : "/family");
        } else {
          setMessage("تم إنشاء الحساب. افتح رسالة التأكيد في بريدك الإلكتروني ثم سجّل الدخول.");
          setMode("login");
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع");
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-page" dir="rtl">
    <section className="auth-shell">
      <div className="auth-brand-panel">
        <Link href="/" className="brand auth-brand"><span className="brand-mark" /><span className="brand-copy"><span className="brand-name">أبو العزايم</span><span className="brand-sub">للحفظ الممتع</span></span></Link>
        <h1>حساب واحد، رحلة تعلم كاملة</h1>
        <p>ولي الأمر يدير ملف الطفل وتقدمه من حساب واحد، والمعلم يحصل على حساب مستقل لمتابعة طلابه وفصوله.</p>
        <div className="auth-benefits"><span><ShieldCheck size={17} /> حسابات آمنة عبر Supabase</span><span><HeartHandshake size={17} /> ولي الأمر + الطفل في حساب عائلي واحد</span><span><GraduationCap size={17} /> مساحة مستقلة للمعلم</span></div>
      </div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>تسجيل الدخول</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>إنشاء حساب</button>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && <>
            <label>نوع الحساب</label>
            <div className="account-type-grid">
              <button type="button" className={accountType === "parent" ? "selected" : ""} onClick={() => setAccountType("parent")}><HeartHandshake size={19} /><b>ولي أمر + طفل</b><span>حساب الأسرة الرئيسي</span></button>
              <button type="button" className={accountType === "teacher" ? "selected" : ""} onClick={() => setAccountType("teacher")}><GraduationCap size={19} /><b>معلم</b><span>إدارة الطلاب والفصول</span></button>
            </div>
            <label htmlFor="display-name">الاسم</label>
            <input id="display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} required minLength={2} placeholder={accountType === "teacher" ? "اسم المعلم" : "اسم ولي الأمر"} />
            {accountType === "parent" && <div className="child-signup-box">
              <div className="child-signup-title"><BookOpen size={17} /> ملف الطفل الأول</div>
              <label htmlFor="child-name">اسم الطفل</label>
              <input id="child-name" value={childName} onChange={e => setChildName(e.target.value)} required minLength={2} placeholder="اسم الطفل" />
              <label htmlFor="child-age">الفئة العمرية</label>
              <select id="child-age" value={childAgeBand} onChange={e => setChildAgeBand(e.target.value as typeof childAgeBand)}><option value="3-6">٣–٦ سنوات</option><option value="7-9">٧–٩ سنوات</option><option value="10-12">١٠–١٢ سنة</option></select>
            </div>}
          </>}
          <label htmlFor="email">البريد الإلكتروني</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="name@example.com" />
          <label htmlFor="password">كلمة المرور</label>
          <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="8 أحرف على الأقل" />
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}
          <button className="primary-button auth-submit" disabled={pending} type="submit"><KeyRound size={15} /> {pending ? "جارٍ التنفيذ..." : mode === "login" ? "دخول" : "إنشاء الحساب"}</button>
        </form>
        <p className="auth-footnote">باستخدام المنصة فأنت توافق على استخدام الحساب لإدارة رحلة التعلم فقط. سنضيف سياسات الخصوصية وموافقة ولي الأمر قبل الإطلاق العام.</p>
      </div>
    </section>
  </main>;
}
