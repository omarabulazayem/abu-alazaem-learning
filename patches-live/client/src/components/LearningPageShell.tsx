import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { BookOpen, ChevronLeft, Gamepad2, GraduationCap, Home as HomeIcon, KeyRound, LogOut, Menu, RotateCcw, Trophy, UserRound, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  ["الرئيسية", "/", HomeIcon],
  ["القرآن", "/quran", BookOpen],
  ["الحفظ", "/memorize", GraduationCap],
  ["المراجعة", "/review", RotateCcw],
  ["الألعاب", "/games", Gamepad2],
  ["الإنجازات", "/achievements", Trophy],
  ["غرفتي", "/room", UserRound],
] as const;

function Header() {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const accountPath = auth.user?.accountType === "teacher" ? "/teacher" : "/family";
  const accountLabel = auth.user?.accountType === "teacher" ? "لوحة المعلم" : "حساب الأسرة";
  const logout = async () => { await auth.logout(); navigate("/"); };

  return <header className="topbar"><div className="container-wide nav-inner">
    <Link href="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark" /><span className="brand-copy"><span className="brand-name">أبو العزايم</span><span className="brand-sub">للحفظ الممتع</span></span></Link>
    <nav className="nav-links" aria-label="التنقل الرئيسي">{navItems.map(([label, path, Icon]) => <Link key={path} href={path} className={`nav-link ${location === path ? "active" : ""}`}><Icon size={14} strokeWidth={2.2} /> {label}</Link>)}</nav>
    <div className="nav-actions"><button className="mobile-menu-button icon-button" aria-label={open ? "إغلاق القائمة" : "فتح القائمة"} onClick={() => setOpen(value => !value)}>{open ? <X size={18} /> : <Menu size={18} />}</button>{auth.user ? <><button className="login-button" onClick={() => navigate(accountPath)}><UserRound size={14} /> {accountLabel}</button><button className="icon-button" aria-label="تسجيل الخروج" onClick={logout}><LogOut size={15} /></button></> : <button className="login-button" onClick={startLogin}><KeyRound size={14} /> تسجيل الدخول</button>}</div>
  </div>{open && <nav className="container-wide mobile-nav">{navItems.map(([label, path, Icon]) => <Link key={path} href={path} className={`nav-link ${location === path ? "active" : ""}`} onClick={() => setOpen(false)}><Icon size={15} /> {label}</Link>)}</nav>}</header>;
}

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="page-hero"><div className="breadcrumb"><Link href="/">الرئيسية</Link><ChevronLeft size={12} /> {eyebrow}</div><h1>{title}</h1><p>{description}</p></div>;
}

export default function LearningPageShell({ children }: { children: ReactNode }) {
  return <div className="app-shell" dir="rtl"><Header />{children}<footer className="footer"><div className="container-wide footer-inner"><span className="footer-brand">أبو العزايم للحفظ الممتع</span><span>رحلة صغيرة كل يوم، وأثر كبير بإذن الله.</span><span>نسخة تأسيسية قابلة للنمو • ٢٠٢٦</span></div></footer></div>;
}
