import React, { useState } from "react";
import { TEACHER_MANAGE_NAV_ITEMS, TEACHER_PREVIEW_NAV_ITEMS } from "./accessPolicy.js";
import Icon from "./Icon.jsx";

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}

function navigate(path) {
  if (routePath() === path) return;
  history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function NavButtons({ items, onNavigate }) {
  return items.map(([label, path]) => (
    <button key={path} className={routePath() === path ? "active" : ""} onClick={() => onNavigate(path)}>{label}</button>
  ));
}

export default function TeacherAccessBar({ children }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <>
      <div className="teacherAccessBar" dir="rtl">
        <div className="wrap teacherAccessInner">
          <div className="teacherAccessLabel">
            <span className="teacherAccessIcon"><Icon name="teacher" size={22} /></span>
            <span><b>وضع المعلم</b><small>المعاينة لا تغيّر نقاط الطلاب</small></span>
          </div>

          <nav className="teacherManageNav" aria-label="أدوات المعلم">
            <NavButtons items={TEACHER_MANAGE_NAV_ITEMS} onNavigate={navigate} />
          </nav>

          <button className={previewOpen ? "teacherPreviewToggle active" : "teacherPreviewToggle"} onClick={() => setPreviewOpen(v => !v)} aria-expanded={previewOpen}>
            <Icon name="quran" size={18} /><span>معاينة تجربة الطالب</span><Icon name={previewOpen ? "close" : "menu"} size={17} />
          </button>
        </div>

        {previewOpen && (
          <div className="teacherPreviewNavWrap">
            <nav className="wrap teacherPreviewNav" aria-label="معاينة أقسام التعلم">
              <NavButtons items={TEACHER_PREVIEW_NAV_ITEMS} onNavigate={path => { navigate(path); setPreviewOpen(false); }} />
            </nav>
          </div>
        )}
      </div>
      {children}
    </>
  );
}
