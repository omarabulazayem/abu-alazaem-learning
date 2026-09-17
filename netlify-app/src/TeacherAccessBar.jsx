import React, { useState } from "react";
import { TEACHER_NAV_ITEMS } from "./accessPolicy.js";

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}

function navigate(path) {
  if (routePath() === path) return;
  history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function TeacherAccessBar({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="teacherAccessBar" dir="rtl">
        <div className="wrap teacherAccessInner">
          <div className="teacherAccessLabel"><span>👨‍🏫</span><b>وضع المعلم</b><small>المحتوى متاح للمعاينة والتجربة بدون التأثير على نقاط الطلاب</small></div>
          <button className="teacherAccessToggle" onClick={() => setOpen(v => !v)}>كل الأقسام ☰</button>
          <nav className={open ? "teacherAccessNav open" : "teacherAccessNav"}>
            {TEACHER_NAV_ITEMS.map(([label, path]) => (
              <button key={path} className={routePath() === path ? "active" : ""} onClick={() => { navigate(path); setOpen(false); }}>{label}</button>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
