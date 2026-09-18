import React,{useEffect,useMemo,useState} from "react";
import {
  claimReward,createEnrollmentInvite,dayKey,enrollmentInviteUrl,getCurrentUser,getProgress,
  recordReview,rest,signOut,teacherEnrollmentOverview
} from "./api.js";
import {getSurah} from "./surahCatalog.js";
import Icon from "./Icon.jsx";
import {AppShell,Button,Empty,Hero,Metric,ProgressBar,Section,TEACHER_NAV,go,routePath} from "./ui-v4.jsx";

function formatDate(value){if(!value)return "لا يوجد نشاط بعد";try{return new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch{return value;}}
function money(v){return new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(v||0));}
function Loading(){return <div className="center"><i className="spinner"/><p>جارٍ تجهيز بوابة المعلم...</p></div>;}
function ErrorBox({text}){return text?<div className="msg error">{text}</div>:null;}

function StudentRow({student}){
  return <button className="aa-table-row" style={{width:"100%",textAlign:"right",cursor:"pointer"}} onClick={()=>go(`/teacher/student/${student.id}`)}>
    <span><Icon name="child" size={22}/></span>
    <div><b>{student.display_name}</b><small>Enrollment {student.enrollmentStatus==="active"?"نشط":student.enrollmentStatus} • سعر الحصة {money(student.sessionRate)} • آخر نشاط: {formatDate(student.lastActivityAt)}</small></div>
    <strong>{student.memorizedAverage}%</strong>
  </button>;
}

function Dashboard({data}){
  const recent=[...data.students].sort((a,b)=>new Date(b.lastActivityAt||0)-new Date(a.lastActivityAt||0)).slice(0,5);
  const pending=data.invites.filter(i=>i.status==="pending").length;
  return <>
    <Hero eyebrow="Teacher Workspace" title={data.workspace?.display_name||"مساحة المعلم"} description="الطلاب الآن مرتبطون بالمعلم عبر Enrollment مستقل، وليس ملكية مباشرة أو كود فصل." icon="teacher" tone="sky"/>
    <div className="aa-teacher-layout">
      <Metric icon="users" label="طلاب مرتبطون" value={data.students.length} tone="mint"/>
      <Metric icon="mail" label="دعوات معلقة" value={pending} tone="sky"/>
      <Metric icon="review" label="مراجعات اليوم" value={data.reviewsToday} tone="sky"/>
      <Metric icon="clock" label="المنطقة الزمنية" value={data.workspace?.timezone||"—"} tone="gold"/>
    </div>
    <Section eyebrow="الأولوية" title="آخر الطلاب نشاطًا" action={<Button kind="secondary" icon="users" onClick={()=>go("/teacher/students")}>كل الطلاب</Button>}>
      {recent.length?<div className="aa-table-list">{recent.map(s=><StudentRow key={s.enrollmentId} student={s}/>)}</div>:
        <Empty icon="users" title="لا يوجد طلاب مرتبطون بعد" text="أرسل دعوة إلى بريد ولي الأمر، وبعد قبولها يظهر الطفل هنا." action={<Button onClick={()=>go("/teacher/invites")}>إرسال دعوة</Button>}/>}
    </Section>
  </>;
}

function Invites({data,reload}){
  const [email,setEmail]=useState(""),[rate,setRate]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(""),[lastLink,setLastLink]=useState("");
  async function create(e){e.preventDefault();setBusy(true);setMessage("");setError("");
    try{
      const invite=await createEnrollmentInvite(email,Number(rate)||0);
      const link=enrollmentInviteUrl(invite?.invite_token);
      setLastLink(link||"");setEmail("");setMessage("تم إنشاء الدعوة. الرابط صالح لمدة 7 أيام.");
      await reload();
    }catch(e){setError(e.message||"تعذر إنشاء الدعوة.");}finally{setBusy(false);}
  }
  async function copy(){if(!lastLink)return;try{await navigator.clipboard.writeText(lastLink);setMessage("تم نسخ رابط الدعوة.");}catch{setMessage(lastLink);}}
  return <>
    <Hero eyebrow="Enrollment" title="دعوة ولي أمر" description="أرسل الدعوة إلى بريد ولي الأمر. عند القبول يختار طفلًا موجودًا أو ينشئ طفلًا جديدًا، ولا يتكرر ملف الطفل." icon="mail" tone="mint"/>
    {message&&<div className="msg ok">{message}</div>}<ErrorBox text={error}/>
    <div className="aa-dashboard-grid">
      <aside className="aa-form-card"><h3 style={{marginTop:0}}>دعوة جديدة</h3>
        <form className="aa-form" onSubmit={create}>
          <label>بريد ولي الأمر<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="parent@example.com"/></label>
          <label>سعر الحصة<input type="number" min="0" step="0.01" value={rate} onChange={e=>setRate(e.target.value)} placeholder="0"/></label>
          <Button type="submit" disabled={busy}>{busy?"جارٍ الإنشاء...":"إنشاء الدعوة"}</Button>
          {lastLink&&<Button kind="secondary" icon="copy" onClick={copy}>نسخ رابط الدعوة</Button>}
        </form>
        <p style={{fontSize:11,color:"var(--aa-muted)",lineHeight:1.7}}>إرسال البريد الآلي نفسه سيتم ربطه بقناة Email في مرحلة Notifications. حاليًا الرابط الآمن جاهز للنسخ والمشاركة.</p>
      </aside>
      <section>{data.invites.length?<div className="aa-table-list">{data.invites.map(i=><article className="aa-table-row" key={i.id}>
        <span><Icon name="mail" size={21}/></span><div><b>{i.invited_email}</b><small>سعر الحصة {money(i.session_rate)} • {formatDate(i.created_at)}</small></div><strong>{i.status==="pending"?"معلقة":i.status==="accepted"?"مقبولة":i.status}</strong>
      </article>)}</div>:<Empty icon="mail" title="لا توجد دعوات بعد"/>}</section>
    </div>
  </>;
}

function Students({data}){
  const [search,setSearch]=useState("");
  const filtered=useMemo(()=>data.students.filter(s=>!search.trim()||s.display_name.toLowerCase().includes(search.trim().toLowerCase())),[data.students,search]);
  return <><Hero eyebrow="Enrollments" title="طلابي" description="كل صف يمثل علاقة تعليمية مستقلة بين هذا المعلم وملف الطفل المملوك للأسرة." icon="users" tone="sky"/>
    <Section><div className="aa-quran-toolbar" style={{gridTemplateColumns:"1fr"}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم الطالب"/></div>
      {filtered.length?<div className="aa-table-list">{filtered.map(s=><StudentRow key={s.enrollmentId} student={s}/>)}</div>:<Empty icon="search" title="لا توجد نتائج"/>}
    </Section></>;
}

function StudentDetail({user,data,studentId,reloadOverview}){
  const summary=data.students.find(s=>s.id===studentId);
  const [progress,setProgress]=useState([]),[reviews,setReviews]=useState([]),[score,setScore]=useState(100),[surahNumber,setSurahNumber]=useState(""),[notes,setNotes]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  async function load(){if(!summary)return;try{
    const [rows,reviewRows]=await Promise.all([
      getProgress(studentId),
      rest(`/review_events?child_id=eq.${encodeURIComponent(studentId)}&select=id,surah_number,score,notes,reviewed_at,created_by&order=reviewed_at.desc&limit=20`)
    ]);
    setProgress(rows||[]);setReviews(reviewRows||[]);
    const first=(rows||[]).find(r=>Number(r.memorized_percent||0)>0);setSurahNumber(v=>v||(first?String(first.surah_number):""));
  }catch(e){setError(e.message||"تعذر تحميل ملف الطالب.");}}
  useEffect(()=>{load();},[studentId,summary?.id]);
  if(!summary)return <Empty icon="lock" title="الطالب غير متاح" text="لا يوجد Enrollment نشط يسمح لهذا المعلم بالوصول إلى الطفل." action={<Button onClick={()=>go("/teacher/students")}>كل الطلاب</Button>}/>;
  const active=progress.filter(r=>Number(r.memorized_percent||0)>0);
  async function submitReview(e){e.preventDefault();if(!surahNumber)return;setBusy(true);setMessage("");setError("");
    try{
      const n=Number(surahNumber);await recordReview(user,studentId,n,Number(score),notes.trim());
      const reward=await claimReward(studentId,"review_session",dayKey("review",n)).catch(()=>null);
      const r=Array.isArray(reward)?reward[0]:reward;
      setMessage(r?.awarded===false?"تم تسجيل المراجعة. مكافأة اليوم مسجلة سابقًا.":"تم تسجيل المراجعة.");
      setNotes("");await Promise.all([load(),reloadOverview()]);
    }catch(e){setError(e.message||"تعذر تسجيل المراجعة.");}finally{setBusy(false);}
  }
  return <><Button kind="ghost" icon="arrow" onClick={()=>go("/teacher/students")}>العودة للطلاب</Button>
    <Hero eyebrow="Enrollment نشط" title={summary.display_name} description={`سعر الحصة: ${money(summary.sessionRate)} • آخر نشاط: ${formatDate(summary.lastActivityAt)}`} icon="child" tone="sky"/>
    <div className="aa-teacher-layout">
      <Metric icon="quran" label="متوسط الحفظ" value={`${summary.memorizedAverage}%`} tone="sky"/>
      <Metric icon="review" label="متوسط المراجعة" value={`${summary.reviewAverage}%`} tone="mint"/>
      <Metric icon="circleCheck" label="سور متقنة" value={summary.masteredCount} tone="gold"/>
      <Metric icon="books" label="سور بدأت" value={active.length} tone="sky"/>
    </div>
    <div className="aa-dashboard-grid" style={{marginTop:24}}>
      <section><Section eyebrow="التقدم" title="السور التي بدأها">{active.length?<div className="aa-person-list">{active.map(row=>{const s=getSurah(row.surah_number);return <article className="aa-person-card" key={row.surah_number}><b>سورة {s?.name||row.surah_name||row.surah_number}</b><ProgressBar value={Number(row.memorized_percent||0)} label={`مراجعة ${Number(row.review_percent||0)}%`}/></article>;})}</div>:<Empty icon="quran" title="لم يبدأ الحفظ بعد"/>}</Section></section>
      <aside className="aa-form-card"><h3 style={{marginTop:0}}>تسجيل مراجعة</h3>
        {active.length?<form className="aa-form" onSubmit={submitReview}>
          <label>السورة<select value={surahNumber} onChange={e=>setSurahNumber(e.target.value)} required>{active.map(row=><option key={row.surah_number} value={row.surah_number}>سورة {getSurah(row.surah_number)?.name||row.surah_name||row.surah_number}</option>)}</select></label>
          <label>التقييم<select value={score} onChange={e=>setScore(Number(e.target.value))}><option value="100">ممتاز — 100%</option><option value="90">ممتاز جدًا — 90%</option><option value="80">جيد — 80%</option><option value="60">يحتاج تدريب — 60%</option></select></label>
          <label>ملاحظات<input value={notes} onChange={e=>setNotes(e.target.value)} maxLength="300"/></label>
          <Button type="submit" disabled={busy}>{busy?"جارٍ التسجيل...":"حفظ المراجعة"}</Button>
        </form>:<p style={{color:"var(--aa-muted)",fontSize:12}}>لا يمكن تسجيل مراجعة قبل بدء حفظ سورة.</p>}
        {message&&<div className="msg ok">{message}</div>}<ErrorBox text={error}/>
      </aside>
    </div>
    <Section eyebrow="السجل" title="آخر المراجعات">{reviews.length?<div className="aa-table-list">{reviews.map(r=><article className="aa-table-row" key={r.id}><span><Icon name="review" size={21}/></span><div><b>سورة {getSurah(r.surah_number)?.name||r.surah_number}</b><small>{formatDate(r.reviewed_at)}{r.notes?` • ${r.notes}`:""}</small></div><strong>{r.score}%</strong></article>)}</div>:<Empty icon="review" title="لا توجد مراجعات بعد"/>}</Section>
  </>;
}

export default function TeacherPortal(){
  const [user,setUser]=useState(undefined),[data,setData]=useState({workspace:null,settings:null,enrollments:[],invites:[],students:[],reviewsToday:0}),[loading,setLoading]=useState(true),[error,setError]=useState(""),[path,setPath]=useState(routePath());
  async function reload(){if(!user?.id)return;setLoading(true);try{setData(await teacherEnrollmentOverview(user.id));setError("");}catch(e){setError(e.message||"تعذر تحميل بيانات المعلم.");}finally{setLoading(false);}}
  useEffect(()=>{const sync=()=>setPath(routePath());window.addEventListener("popstate",sync);return()=>window.removeEventListener("popstate",sync);},[]);
  useEffect(()=>{let alive=true;(async()=>{try{const current=await getCurrentUser();if(!alive)return;if(!current)return go("/login");if(!["teacher","admin"].includes(current.accountType))return go("/family");setUser(current);}catch(e){if(alive)setError(e.message||"تعذر التحقق من حساب المعلم.");}})();return()=>{alive=false;};},[]);
  useEffect(()=>{if(user?.id)reload();},[user?.id]);
  if(user===undefined)return <Loading/>;
  async function logout(){await signOut();go("/");}
  let page;
  if(loading&&!data.workspace)page=<Loading/>;
  else{
    const match=path.match(/^\/teacher\/student\/([0-9a-f-]+)$/i);
    if(path==="/teacher"||path==="/teacher/")page=<Dashboard data={data}/>;
    else if(path==="/teacher/invites"||path==="/teacher/classes")page=<Invites data={data} reload={reload}/>;
    else if(path==="/teacher/students")page=<Students data={data}/>;
    else if(match)page=<StudentDetail user={user} data={data} studentId={match[1]} reloadOverview={reload}/>;
    else page=<Empty icon="target" title="الصفحة غير موجودة" action={<Button onClick={()=>go("/teacher")}>لوحة المعلم</Button>}/>;
  }
  return <AppShell mode="teacher" subtitle="بوابة المعلم" nav={TEACHER_NAV} actions={<><span style={{fontSize:12,fontWeight:900}}>{user?.name||"المعلم"}</span><Button kind="ghost" icon="logout" onClick={logout}>خروج</Button></>} footer="أبو العزايم • Teacher Workspace وEnrollment هما أساس إدارة الطلاب.">
    {error&&<ErrorBox text={error}/>} {page}
  </AppShell>;
}
