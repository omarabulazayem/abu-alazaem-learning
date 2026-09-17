import React, { useMemo, useState } from "react";
import { getSurah, SURAHS } from "./surahCatalog.js";
import { selectedSurahNumber, selectSurah } from "./QuranPage.jsx";
import Icon from "./Icon.jsx";

const badgeDefinitions = [
  ["sparkle", "البداية الجميلة", "ابدأ أول نشاط في الرحلة"],
  ["quran", "أول حفظ", "أكمل أول جلسة حفظ"],
  ["star", "أول سورة", "أتم حفظ سورة كاملة"],
  ["mosque", "خمس سور", "أتم حفظ خمس سور كاملة"],
  ["review", "مراجع صغير", "أكمل أول مراجعة"],
  ["brain", "بطل الذاكرة", "أكمل لعبة الذاكرة"],
  ["puzzle", "خبير ترتيب السور", "أكمل لعبة ترتيب السور"],
  ["bolt", "نجم اختبار السور", "اجتز اختبار السور بنجاح"],
  ["star", "١٠٠ نقطة", "اجمع ١٠٠ نقطة"],
  ["medal", "٥٠٠ نقطة", "اجمع ٥٠٠ نقطة"],
  ["flame", "٣ أيام متواصلة", "حافظ على نشاطك ٣ أيام"],
  ["trophy", "أسبوع كامل", "حافظ على نشاطك ٧ أيام"],
];

function routePath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}
function navigate(path) {
  if (routePath() !== path) {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}
function sessionAyahCount(total) {
  if (total <= 7) return 1;
  if (total <= 15) return 2;
  if (total <= 40) return 3;
  if (total <= 100) return 5;
  return 7;
}

function PreviewShell({ label, title, text, children }) {
  return <main className="wrap page teacherPreviewPage"><div className="title"><span>{label} • معاينة المعلم</span><h1>{title}</h1><p>{text}</p></div><div className="msg ok teacherPreviewNotice"><Icon name="teacher" size={18} /> هذه معاينة آمنة للمعلم — لا يتم تعديل نقاط أو تقدم أي طالب.</div>{children}</main>;
}

function MemorizePreview() {
  const [number, setNumber] = useState(selectedSurahNumber());
  const [completed, setCompleted] = useState(0);
  const surah = getSurah(number) || SURAHS[0];
  const batch = sessionAyahCount(surah.ayahs);
  const start = Math.min(surah.ayahs, completed + 1);
  const end = Math.min(surah.ayahs, completed + batch);
  const percent = Math.round((Math.min(completed, surah.ayahs) / surah.ayahs) * 100);
  function change(value) { const n = Number(value); setNumber(n); selectSurah(n); setCompleted(0); }
  function simulate() { setCompleted(v => Math.min(surah.ayahs, v + batch)); }
  return <PreviewShell label="الحفظ" title={`سورة ${surah.name}`} text="اختبر تجربة جلسة الحفظ كما ستظهر للطالب قبل استخدامها معه.">
    <section className="panel focus"><label style={{width:"100%",textAlign:"right"}}><b>اختر السورة</b><select value={surah.number} onChange={e => change(e.target.value)} style={{marginTop:8}}>{SURAHS.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name} — {s.ayahs} آية</option>)}</select></label><b className="percent">{percent}%</b><div className="bar big"><i style={{width:`${percent}%`}} /></div><div className="stats" style={{width:"100%",margin:"18px 0"}}><div><b>{completed}</b><span>آية في المعاينة</span></div><div><b>{surah.ayahs}</b><span>إجمالي الآيات</span></div><div><b>{Math.max(0,surah.ayahs-completed)}</b><span>متبقية</span></div></div>{completed < surah.ayahs ? <><p>دفعة الجلسة المقترحة: من الآية <b>{start}</b> إلى <b>{end}</b>.</p><button className="primary full" onClick={simulate}>محاكاة إكمال هذه الدفعة</button></> : <><p>اكتملت محاكاة حفظ السورة.</p><button className="primary full" onClick={() => navigate("/review")}>معاينة المراجعة</button></>}</section>
  </PreviewShell>;
}

function ReviewPreview() {
  const [number, setNumber] = useState(selectedSurahNumber());
  const [score, setScore] = useState(null);
  const surah = getSurah(number) || SURAHS[0];
  return <PreviewShell label="المراجعة" title="تجربة شاشة المراجعة" text="اختر سورة وجرّب تقييم التسميع بدون إنشاء Review Event حقيقي.">
    <section className="panel focus"><label style={{width:"100%",textAlign:"right"}}><b>السورة</b><select value={surah.number} onChange={e => { const n=Number(e.target.value); setNumber(n); selectSurah(n); setScore(null); }} style={{marginTop:8}}>{SURAHS.map(s => <option key={s.number} value={s.number}>سورة {s.name}</option>)}</select></label><h2>سورة {surah.name}</h2><p>كيف كان أداء الطالب في التسميع؟</p><div className="row" style={{justifyContent:"center",flexWrap:"wrap"}}>{[[60,"يحتاج تدريب"],[80,"جيد"],[90,"ممتاز جدًا"],[100,"ممتاز"]].map(([value,label]) => <button key={value} className={score===value?"primary":"secondary"} onClick={() => setScore(value)}>{label} — {value}%</button>)}</div>{score && <div className="msg ok"><Icon name="circleCheck" size={18} /> نتيجة المعاينة: {score}% — لم يتم حفظها على أي طالب.</div>}</section>
  </PreviewShell>;
}

function AchievementsPreview() {
  return <PreviewShell label="الإنجازات" title="كتالوج الميداليات" text="شاهد كل الإنجازات التي يمكن للطلاب فتحها من النشاط الحقيقي."><div className="badges badges-v2">{badgeDefinitions.map(([icon,title,description]) => <article className="won teacherBadgePreview" key={title}><div className="badge-icon"><Icon name={icon} size={34} /></div><h3>{title}</h3><p>{description}</p><small>معاينة المعلم</small></article>)}</div></PreviewShell>;
}

function ChallengesPreview() {
  const rows = [["quran","جلسة حفظ","يكمل الطفل دفعة حفظ يومية"],["review","جلسة مراجعة","يسجل تقييم مراجعة حقيقي"],["game","لعبة تعليمية","يكمل لعبة من منطقة الألعاب"]];
  return <PreviewShell label="تحديات اليوم" title="كيف يرى الطالب تحدياته؟" text="هذه معاينة للتحديات اليومية. حالة الإنجاز الحقيقية تُحسب من سجل نشاط الطفل."><div className="challenges">{rows.map(([icon,title,text]) => <article key={title}><b className="challenge-svg-icon"><Icon name={icon} size={28} /></b><span><strong>{title}</strong><small style={{display:"block"}}>{text}</small></span></article>)}</div><div className="row" style={{justifyContent:"center",marginTop:24}}><button className="primary" onClick={() => navigate("/games")}><Icon name="game" size={18} /> معاينة الألعاب</button><button className="secondary" onClick={() => navigate("/memorize")}><Icon name="quran" size={18} /> معاينة الحفظ</button></div></PreviewShell>;
}

export default function TeacherLearningPreview({ type }) {
  const component = useMemo(() => type, [type]);
  if (component === "memorize") return <MemorizePreview />;
  if (component === "review") return <ReviewPreview />;
  if (component === "achievements") return <AchievementsPreview />;
  if (component === "challenges") return <ChallengesPreview />;
  return <PreviewShell label="معاينة" title="المحتوى متاح للمعلم" text="اختر قسمًا من قائمة المعلم للبدء." />;
}
