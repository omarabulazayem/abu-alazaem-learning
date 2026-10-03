import React,{useEffect,useMemo,useState} from "react";
import {
  claimReward,createEnrollmentInvite,createTaskAssignment,dayKey,enrollmentInviteUrl,getCurrentUser,getProgress,
  grantTeacherBonus,listPointLedger,listTeacherTaskAssignments,listTeacherGameSessions,listTeacherGameEvents,listVisibleSessions,recordReview,rest,reversePointTransaction,reviewTaskAssignment,signOut,teacherEnrollmentOverview
} from "./api.js";
import {getSurah} from "./surahCatalog.js";
import {TeacherBillingPanel,TeacherSchedulePanel} from "./TeacherOperations.jsx";
import {TeacherLeaderboardPanel} from "./LeaderboardPage.jsx";
import Icon from "./Icon.jsx";
import NotificationsPanel from "./NotificationsPanel.jsx";
import {AppShell,Button,Empty,Hero,Metric,ProgressBar,Section,TEACHER_NAV,getLessonContext,saveLessonContext,go,routePath} from "./ui-v4.jsx";

function formatDate(value){if(!value)return "لا يوجد نشاط بعد";try{return new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch{return value;}}
function money(v){return new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(v||0));}
function taskTypeLabel(v){return ({NEW_MEMORIZATION:"حفظ جديد",REVIEW:"مراجعة",RECITATION:"تسميع",BEHAVIOR:"سلوك"}[v]||v||"مهمة");}
function taskStatusLabel(v){return ({assigned:"مطلوبة",pending_teacher_approval:"بانتظار المراجعة",approved:"معتمدة",rejected:"مرفوضة"}[v]||v||"");}
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
    <NotificationsPanel userId={data.workspace?.owner_teacher_user_id} title="تنبيهات الحصة والمتابعة" limit={6} mode="teacher"/>

    <div className="aa-teacher-layout">
      <Metric icon="users" label="طلاب مرتبطون" value={data.students.length} tone="mint"/>
      <Metric icon="mail" label="دعوات معلقة" value={pending} tone="sky"/>
      <Metric icon="review" label="مراجعات اليوم" value={data.reviewsToday} tone="sky"/>
      <Metric icon="clock" label="المنطقة الزمنية" value={data.workspace?.timezone||"—"} tone="gold"/>
    </div>
    <Section eyebrow="غرفة الحصة" title="ابدئي الحصة من مكان واحد" action={<Button kind="secondary" onClick={()=>go("/teacher/whiteboard")}>فتح السبورة</Button>}>
      <div className="aa-lesson-room-grid">
        <button className="aa-lesson-room-card aa-room-board" onClick={()=>go("/teacher/whiteboard")}><span className="aa-room-icon">✎</span><div><b>السبورة</b><small>شرح، تجويد، تمييز، ومشاركة مباشرة</small></div><strong>ابدئي</strong></button>
        <button className="aa-lesson-room-card aa-room-quran" onClick={()=>go("/quran")}><span className="aa-room-icon">۞</span><div><b>المصحف</b><small>افتحي الآيات ومرجع الحصة بسرعة</small></div><strong>فتح</strong></button>
        <button className="aa-lesson-room-card aa-room-games" onClick={()=>go("/games")}><span className="aa-room-icon">★</span><div><b>الألعاب</b><small>انقلي الطالب من الشرح إلى التطبيق</small></div><strong>لعب</strong></button>
      </div>
    </Section>
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

function Tasks({data}){
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState(""),[error,setError]=useState("");
  const [form,setForm]=useState({enrollmentId:"",title:"",type:"NEW_MEMORIZATION",points:10,dueAt:"",teacherNote:""});
  const [decisionNotes,setDecisionNotes]=useState({});

  async function load(){
    setLoading(true);
    try{setRows(await listTeacherTaskAssignments());setError("");}
    catch(e){setError(e.message||"تعذر تحميل المهام.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);

  const students=data.students.filter(s=>s.enrollmentStatus==="active");
  useEffect(()=>{
    if(!form.enrollmentId&&students[0]?.enrollmentId)setForm(v=>({...v,enrollmentId:students[0].enrollmentId}));
  },[students.length,form.enrollmentId]);

  const pending=rows.filter(r=>r.status==="pending_teacher_approval");
  const recent=[...rows].sort((a,b)=>new Date(b.updated_at||b.assigned_at||0)-new Date(a.updated_at||a.assigned_at||0)).slice(0,20);
  const studentName=id=>data.students.find(s=>s.id===id)?.display_name||"طالب";

  async function create(e){
    e.preventDefault();setBusy(true);setMessage("");setError("");
    try{
      await createTaskAssignment({
        enrollmentId:form.enrollmentId,title:form.title,type:form.type,points:Number(form.points)||0,
        dueAt:form.dueAt,teacherNote:form.teacherNote
      });
      setForm(v=>({...v,title:"",teacherNote:""}));
      setMessage("تم إسناد المهمة للطالب.");await load();
    }catch(e){setError(e.message||"تعذر إنشاء المهمة.");}
    finally{setBusy(false);}
  }

  async function decide(row,approve){
    const note=String(decisionNotes[row.id]||"").trim();
    if(!approve&&!note){setError("سبب الرفض إلزامي.");return;}
    setBusy(true);setMessage("");setError("");
    try{
      const result=await reviewTaskAssignment(row.id,approve,note);
      setDecisionNotes(v=>({...v,[row.id]:""}));
      setMessage(approve?`تم اعتماد المهمة وإضافة ${result?.points??row.task?.points_reward??0} نقطة.`:"تم رفض التسليم وإرسال السبب لولي الأمر.");
      await load();
    }catch(e){setError(e.message||"تعذر مراجعة المهمة.");}
    finally{setBusy(false);}
  }

  return <>
    <Hero eyebrow="Tasks V7" title="المهام والمراجعات" description="ولي الأمر يستطيع الإرسال فقط. النقاط لا تُضاف إلا بعد اعتمادك أنت." icon="target" tone="mint"/>
    {message&&<div className="msg ok">{message}</div>}<ErrorBox text={error}/>
    <div className="aa-dashboard-grid">
      <aside className="aa-form-card"><h3 style={{marginTop:0}}>مهمة جديدة</h3>
        {students.length?<form className="aa-form" onSubmit={create}>
          <label>الطالب<select value={form.enrollmentId} onChange={e=>setForm(v=>({...v,enrollmentId:e.target.value}))} required>
            {students.map(s=><option key={s.enrollmentId} value={s.enrollmentId}>{s.display_name}</option>)}
          </select></label>
          <label>عنوان المهمة<input value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))} required maxLength="160" placeholder="مثال: مراجعة سورة الملك"/></label>
          <label>نوع المهمة<select value={form.type} onChange={e=>setForm(v=>({...v,type:e.target.value}))}>
            <option value="NEW_MEMORIZATION">حفظ جديد</option><option value="REVIEW">مراجعة</option><option value="RECITATION">تسميع</option><option value="BEHAVIOR">سلوك</option>
          </select></label>
          <label>نقاط الاعتماد<input type="number" min="0" max="100000" value={form.points} onChange={e=>setForm(v=>({...v,points:e.target.value}))} required/></label>
          <label>موعد التسليم<input type="datetime-local" value={form.dueAt} onChange={e=>setForm(v=>({...v,dueAt:e.target.value}))} required/></label>
          <label>ملاحظة للطالب/الأسرة<textarea value={form.teacherNote} onChange={e=>setForm(v=>({...v,teacherNote:e.target.value}))} rows="3" maxLength="500"/></label>
          <Button type="submit" disabled={busy}>{busy?"جارٍ الحفظ...":"إسناد المهمة"}</Button>
        </form>:<Empty icon="users" title="لا يوجد Enrollment نشط" text="اربط طالبًا أولًا ثم أنشئ المهمة."/>}
      </aside>
      <section>
        <Section eyebrow="تحتاج قرارك" title={`بانتظار المراجعة (${pending.length})`}>
          {loading?<Loading/>:pending.length?<div className="aa-person-list">{pending.map(row=><article className="aa-person-card" key={row.id}>
            <div className="aa-person-head"><span className="aa-avatar"><Icon name="target" size={24}/></span><div>
              <b>{row.task?.title||"مهمة"}</b>
              <small>{studentName(row.student_id)} • {taskTypeLabel(row.task?.task_type)} • {row.task?.points_reward||0} نقطة • أرسلها ولي الأمر {formatDate(row.latestSubmission?.submitted_at)}</small>
            </div></div>
            {row.latestSubmission?.parent_note&&<p style={{margin:"8px 0",fontSize:12}}>ملاحظة ولي الأمر: {row.latestSubmission.parent_note}</p>}
            <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800}}>ملاحظتك<textarea rows="2" value={decisionNotes[row.id]||""} onChange={e=>setDecisionNotes(v=>({...v,[row.id]:e.target.value}))} placeholder="مطلوبة في حالة الرفض"/></label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
              <Button onClick={()=>decide(row,true)} disabled={busy} icon="circleCheck">اعتماد وإضافة النقاط</Button>
              <Button kind="secondary" onClick={()=>decide(row,false)} disabled={busy} icon="close">رفض</Button>
            </div>
          </article>)}</div>:<Empty icon="circleCheck" title="لا توجد مهام بانتظار المراجعة"/>}
        </Section>
      </section>
    </div>
    <Section eyebrow="السجل" title="آخر المهام">
      {recent.length?<div className="aa-table-list">{recent.map(row=><article className="aa-table-row" key={row.id}>
        <span><Icon name={row.status==="approved"?"circleCheck":"target"} size={21}/></span>
        <div><b>{row.task?.title||"مهمة"}</b><small>{studentName(row.student_id)} • {taskTypeLabel(row.task?.task_type)} • موعد التسليم {formatDate(row.due_at)}</small></div>
        <strong>{taskStatusLabel(row.status)}</strong>
      </article>)}</div>:<Empty icon="target" title="لم تُنشأ مهام بعد"/>}
    </Section>
  </>;
}

function StudentDetail({user,data,studentId,reloadOverview}){
  const summary=data.students.find(s=>s.id===studentId);
  const [progress,setProgress]=useState([]),[reviews,setReviews]=useState([]),[gameSessions,setGameSessions]=useState([]),[gameEvents,setGameEvents]=useState([]),[lessonSessions,setLessonSessions]=useState([]),[pointLedger,setPointLedger]=useState([]),[score,setScore]=useState(100),[surahNumber,setSurahNumber]=useState(""),[notes,setNotes]=useState(""),[bonusPoints,setBonusPoints]=useState(10),[bonusReason,setBonusReason]=useState(""),[reversalTarget,setReversalTarget]=useState(""),[reversalReason,setReversalReason]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  async function load(){if(!summary)return;try{
    const from=new Date(Date.now()-180*86400000),to=new Date(Date.now()+30*86400000);
    const [rows,reviewRows,gameRows,gameEventRows,sessionRows,ledgerRows]=await Promise.all([
      getProgress(studentId),
      rest(`/review_events?child_id=eq.${encodeURIComponent(studentId)}&select=id,surah_number,score,notes,reviewed_at,created_by&order=reviewed_at.desc&limit=20`),
      listTeacherGameSessions(studentId,20).catch(()=>[]),
      listTeacherGameEvents(studentId,120).catch(()=>[]),
      listVisibleSessions({from,to}).catch(()=>[]),
      listPointLedger(studentId,40).catch(()=>[])
    ]);
    setProgress(rows||[]);setReviews(reviewRows||[]);setGameSessions(gameRows||[]);setGameEvents(gameEventRows||[]);
    setLessonSessions((sessionRows||[]).filter(s=>s.enrollment_id===summary.enrollmentId).sort((a,b)=>new Date(b.scheduled_start_utc||0)-new Date(a.scheduled_start_utc||0)).slice(0,30));
    setPointLedger(ledgerRows||[]);
    const first=(rows||[]).find(r=>Number(r.memorized_percent||0)>0);setSurahNumber(v=>v||(first?String(first.surah_number):""));
  }catch(e){setError(e.message||"تعذر تحميل ملف الطالب.");}}
  useEffect(()=>{load();},[studentId,summary?.id]);
  if(!summary)return <Empty icon="lock" title="الطالب غير متاح" text="لا يوجد Enrollment نشط يسمح لهذا المعلم بالوصول إلى الطفل." action={<Button onClick={()=>go("/teacher/students")}>كل الطلاب</Button>}/>;
  const active=progress.filter(r=>Number(r.memorized_percent||0)>0);
  const gameReport=gameSessions.reduce((acc,s)=>{
    const key=s.game_id||s.game_name||"unknown";
    if(!acc[key])acc[key]={key,title:s.game_name||s.game_id||"لعبة",count:0,total:0,best:0,correct:0,wrong:0,accuracySamples:0,accuracyTotal:0};
    const item=acc[key];
    const scoreValue=Number(s.score||0);
    const correct=Number(s.correct_answers??s.correctAnswers??0);
    const wrong=Number(s.wrong_answers??s.wrongAnswers??0);
    const attempts=correct+wrong;
    item.count+=1; item.total+=scoreValue; item.best=Math.max(item.best,scoreValue); item.correct+=correct; item.wrong+=wrong;
    if(attempts){item.accuracySamples+=1;item.accuracyTotal+=(correct/attempts)*100;}
    return acc;
  },{});
  const gameBreakdown=Object.values(gameReport).sort((a,b)=>b.count-a.count||b.total-a.total);
  const totalGameAttempts=gameSessions.reduce((sum,s)=>sum+Number(s.correct_answers??s.correctAnswers??0)+Number(s.wrong_answers??s.wrongAnswers??0),0);
  const totalGameCorrect=gameSessions.reduce((sum,s)=>sum+Number(s.correct_answers??s.correctAnswers??0),0);
  const overallGameAccuracy=totalGameAttempts?Math.round(totalGameCorrect/totalGameAttempts*100):0;
  const ayahReport=gameEvents.reduce((acc,event)=>{
    if(!event.surah_number||!event.ayah_number)return acc;
    const key=event.surah_number+":"+event.ayah_number;
    if(!acc[key])acc[key]={key,surahNumber:Number(event.surah_number),ayahNumber:Number(event.ayah_number),attempts:0,correct:0,wrong:0,games:new Set(),last:event.created_at};
    const item=acc[key];
    item.attempts+=1;
    if(event.is_correct)item.correct+=1;else item.wrong+=1;
    if(event.game_id)item.games.add(event.game_id);
    if(new Date(event.created_at||0)>new Date(item.last||0))item.last=event.created_at;
    return acc;
  },{});
  const ayahRows=Object.values(ayahReport).map(item=>({...item,accuracy:item.attempts?Math.round(item.correct/item.attempts*100):0,gamesCount:item.games.size})).sort((a,b)=>a.accuracy-b.accuracy||b.attempts-a.attempts);
  const lowAccuracyAyahs=ayahRows.filter(row=>row.attempts>=2&&row.accuracy<70).slice(0,10);
  const surahReport=gameEvents.reduce((acc,event)=>{
    if(!event.surah_number)return acc;
    const key=String(event.surah_number);
    if(!acc[key])acc[key]={surahNumber:Number(event.surah_number),attempts:0,correct:0,ayahs:new Set(),games:new Set(),last:event.created_at};
    const item=acc[key];
    item.attempts+=1;
    if(event.is_correct)item.correct+=1;
    if(event.ayah_number)item.ayahs.add(Number(event.ayah_number));
    if(event.game_id)item.games.add(event.game_id);
    if(new Date(event.created_at||0)>new Date(item.last||0))item.last=event.created_at;
    return acc;
  },{});
  const surahRows=Object.values(surahReport).map(item=>({...item,accuracy:item.attempts?Math.round(item.correct/item.attempts*100):0,ayahCount:item.ayahs.size,gamesCount:item.games.size})).sort((a,b)=>new Date(b.last||0)-new Date(a.last||0));
  const teacherPointLedger=pointLedger.filter(row=>row.workspace_id===summary.workspaceId||row.enrollment_id===summary.enrollmentId);

  function prepareAyah(row,path){
    const surah=getSurah(row.surahNumber);
    const next={...(getLessonContext()||{}),surah:surah?.name||row.surahNumber,surahNumber:row.surahNumber,number:row.ayahNumber,phase:"مراجعة",studentId:studentId,enrollmentId:summary.enrollmentId,workspaceId:summary.workspaceId,studentName:summary.display_name};
    saveLessonContext(next);
    go(path);
  }
  async function grantBonus(e){
    e.preventDefault();
    setBusy(true);setMessage("");setError("");
    try{
      await grantTeacherBonus(summary.enrollmentId,bonusPoints,bonusReason);
      setBonusReason("");
      setMessage("تمت إضافة المكافأة وتسجيلها في سجل النقاط.");
      await load();
    }catch(e){setError(e.message||"تعذر إضافة المكافأة.");}
    finally{setBusy(false);}
  }
  async function reverseTransaction(e){
    e.preventDefault();
    if(!reversalTarget)return;
    setBusy(true);setMessage("");setError("");
    try{
      await reversePointTransaction(reversalTarget,reversalReason);
      setReversalTarget("");setReversalReason("");
      setMessage("تم تسجيل سحب النقاط كسجل عكسي، دون تعديل العملية الأصلية.");
      await load();
    }catch(e){setError(e.message||"تعذر سحب النقاط.");}
    finally{setBusy(false);}
  }
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
    <div className="aa-teacher-layout" style={{marginTop:24}}>
      <Metric icon="game" label="جولات الألعاب" value={gameSessions.length} tone="sky"/>
      <Metric icon="circleCheck" label="متوسط النقاط" value={gameSessions.length?Math.round(gameSessions.reduce((sum,s)=>sum+Number(s.score||0),0)/gameSessions.length):0} tone="mint"/>
      <Metric icon="target" label="دقة الإجابات" value={overallGameAccuracy+"%"} tone="gold"/>
      <Metric icon="quran" label="سور طُبقت عليها ألعاب" value={new Set(gameSessions.map(s=>s.surah_number).filter(Boolean)).size} tone="sky"/>
    </div>
    <div className="aa-dashboard-grid" style={{marginTop:24}}>
      <aside className="aa-form-card"><h3 style={{marginTop:0}}>مكافأة سريعة</h3>
        <form className="aa-form" onSubmit={grantBonus}>
          <label>عدد النقاط<input type="number" min="1" max="100000" value={bonusPoints} onChange={e=>setBonusPoints(e.target.value)} required/></label>
          <label>سبب المكافأة<textarea rows="2" maxLength="300" value={bonusReason} onChange={e=>setBonusReason(e.target.value)} placeholder="مثال: تسميع ممتاز اليوم" required/></label>
          <Button type="submit" disabled={busy}>إضافة المكافأة</Button>
        </form>
      </aside>
      <section><Section eyebrow="نقاط هذا الارتباط" title="سجل نقاط الطالب مع هذا المعلم">{teacherPointLedger.length?<div className="aa-table-list">{teacherPointLedger.slice(0,15).map((row,index)=>{
        const delta=Number(row.wallet_delta||0);
        const reversible=delta>0&&row.transaction_type!=="GAME_PURCHASE"&&row.transaction_type!=="POINT_REVERSAL"&&(row.workspace_id===summary.workspaceId||row.enrollment_id===summary.enrollmentId);
        const labels={TASK_APPROVED:"اعتماد مهمة",TEACHER_BONUS:"مكافأة معلم",GAME_PURCHASE:"شراء لعبة",WEEKLY_REWARD:"مكافأة أسبوعية",POINT_REVERSAL:"سحب نقاط",ADMIN_ADJUSTMENT:"تعديل إداري",LEGACY_REWARD:"مكافأة قديمة",LEGACY_BALANCE_IMPORT:"ترحيل رصيد"};
        return <article className="aa-table-row" key={row.id||index}><span><Icon name={delta<0?"arrow":"star"} size={20}/></span><div><b>{labels[row.transaction_type]||row.transaction_type||"حركة نقاط"}</b><small>{formatDate(row.created_at)}{row.reason?" • "+row.reason:""}</small></div><strong>{delta>0?"+":""}{delta} نقطة</strong>{reversible&&<Button kind="ghost" onClick={()=>setReversalTarget(row.id)}>سحب</Button>}</article>;
      })}</div>:<Empty icon="star" title="لا توجد حركات نقاط بعد"/>}</Section></section>
    </div>
    {reversalTarget&&<section className="aa-form-card" style={{marginTop:16}}>
      <h3 style={{marginTop:0}}>سحب النقاط</h3>
      <form className="aa-form" onSubmit={reverseTransaction}>
        <label>سبب السحب<textarea rows="2" maxLength="300" value={reversalReason} onChange={e=>setReversalReason(e.target.value)} placeholder="اكتبي سببًا واضحًا لسحب النقاط" required/></label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button type="submit" disabled={busy}>تأكيد السحب</Button><Button kind="secondary" onClick={()=>{setReversalTarget("");setReversalReason("");}}>إلغاء</Button></div>
      </form>
    </section>}

    <Section eyebrow="سجل الحصص" title="آخر الحصص المرتبطة بالطالب">{lessonSessions.length?<div className="aa-table-list">{lessonSessions.map((s,index)=>{
      const statusLabels={SCHEDULED:"مجدولة",COMPLETED:"مكتملة",STUDENT_NO_SHOW:"غياب الطالب",TEACHER_NO_SHOW:"غياب المعلم",EARLY_CANCELLATION:"إلغاء مبكر",LATE_CANCELLATION:"إلغاء متأخر",RESCHEDULED:"أعيدت جدولتها",CANCELLED:"ملغاة"};
      return <article className="aa-table-row" key={s.id||index}><span><Icon name={s.status==="COMPLETED"?"circleCheck":"clock"} size={21}/></span><div><b>{statusLabels[s.status]||s.status}</b><small>{formatDate(s.scheduled_start_utc)}{s.teacher_note?" • "+s.teacher_note:""}{s.completed_at?" • أُنهيت "+formatDate(s.completed_at):""}</small></div><strong>{s.status==="COMPLETED"?"تمت":s.status==="SCHEDULED"?"قادمة":"مسجلة"}</strong></article>;
    })}</div>:<Empty icon="clock" title="لا يوجد سجل حصص بعد" text="عند بدء الحصص وإنهائها سيظهر هنا تاريخ الحصة وملاحظة المعلم وحالة الحضور."/>}</Section>
    <Section eyebrow="تحليل الألعاب" title="أداء كل لعبة">{gameBreakdown.length?<div className="aa-person-list">{gameBreakdown.map(item=><article className="aa-person-card" key={item.key}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><b>{item.title}</b><strong>{item.count} جولة</strong></div><small>متوسط النقاط: {Math.round(item.total/item.count)} • أعلى نتيجة: {item.best}{item.accuracySamples?" • دقة الإجابات: "+Math.round(item.accuracyTotal/item.accuracySamples)+"%":""} • إجابات صحيحة: {item.correct}</small></article>)}</div>:<Empty icon="game" title="لا توجد بيانات كافية للتحليل"/>}</Section>
    <Section eyebrow="تحليل السور" title="السور التي طُبقت عليها الألعاب">{surahRows.length?<div className="aa-person-list">{surahRows.slice(0,12).map(row=><article className="aa-person-card" key={row.surahNumber}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><b>سورة {getSurah(row.surahNumber)?.name||row.surahNumber}</b><strong>{row.accuracy}%</strong></div><small>{row.ayahCount} آيات مطبقة • {row.attempts} محاولة • {row.correct} صحيحة • {row.gamesCount} ألعاب • آخر تطبيق: {formatDate(row.last)}</small></article>)}</div>:<Empty icon="quran" title="لا توجد بيانات تطبيق على السور بعد" text="يظهر هذا الملخص بعد تسجيل محاولات على آيات داخل الألعاب."/>}</Section>
    <Section eyebrow="تحليل الآيات" title="متابعة التطبيق على الآيات">{ayahRows.length?<div className="aa-table-list">{ayahRows.slice(0,20).map(row=><article className="aa-table-row" key={row.key}><span><Icon name="quran" size={21}/></span><div><b>سورة {getSurah(row.surahNumber)?.name||row.surahNumber} • الآية {row.ayahNumber}</b><small>{row.attempts} محاولة • {row.correct} صحيحة • {row.wrong} غير صحيحة • {row.gamesCount} ألعاب • آخر تطبيق: {formatDate(row.last)}</small></div><strong>{row.accuracy}%</strong></article>)}</div>:<Empty icon="quran" title="لا توجد بيانات على مستوى الآيات بعد" text="تظهر هنا الآيات التي سُجل عليها تطبيق فعلي داخل الألعاب."/ >}</Section>\n    <Section eyebrow="متابعة تحتاج انتباهًا" title="آيات بدقة منخفضة في الجولات المسجلة">{lowAccuracyAyahs.length?<div className="aa-person-list">{lowAccuracyAyahs.map(row=><article className="aa-person-card" key={row.key}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><b>سورة {getSurah(row.surahNumber)?.name||row.surahNumber} • الآية {row.ayahNumber}</b><strong>{row.accuracy}%</strong></div><small>{row.attempts} محاولات • {row.correct} صحيحة • آخر تطبيق: {formatDate(row.last)}</small><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}><Button kind="secondary" icon="quran" onClick={()=>prepareAyah(row,"/quran")}>فتح في المصحف</Button><Button kind="secondary" icon="edit" onClick={()=>prepareAyah(row,"/teacher/whiteboard")}>شرح على السبورة</Button></div></article>)}</div>:<Empty icon="circleCheck" title="لا توجد آيات منخفضة الدقة ضمن البيانات الحالية" text="يظهر هذا القسم فقط عند وجود محاولتين فأكثر ودقة أقل من 70%. " />}</Section>\n    <Section eyebrow="سجل الألعاب" title="آخر جولات الألعاب">{gameSessions.length?<div className="aa-table-list">{gameSessions.map((s,index)=><article className="aa-table-row" key={s.id||index}><span><Icon name="game" size={21}/></span><div><b>{s.game_name||s.game_id||"لعبة"}</b><small>{formatDate(s.completed_at||s.updated_at||s.created_at)}{s.surah_number?" • سورة "+(getSurah(s.surah_number)?.name||s.surah_number):""}{(s.lesson_context?.number||s.resume_state?.lesson_context?.number)?" • الآية "+(s.lesson_context?.number||s.resume_state.lesson_context.number):""}{(s.lesson_context?.phase||s.resume_state?.lesson_context?.phase)?" • "+(s.lesson_context?.phase||s.resume_state.lesson_context.phase):""}</small></div><strong>{Number(s.score||0)} نقطة</strong></article>)}</div>:<Empty icon="game" title="لا توجد جولات ألعاب محفوظة بعد" text="تظهر هنا الجولات التي يسجلها نظام الألعاب للطالب."/>}</Section>
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
    else if(path==="/teacher/tasks")page=<Tasks data={data}/>;
    else if(path==="/teacher/schedule")page=<TeacherSchedulePanel data={data}/>;
    else if(path==="/teacher/billing")page=<TeacherBillingPanel data={data}/>;
    else if(path==="/teacher/leaderboard")page=<TeacherLeaderboardPanel data={data}/>;
    else if(match)page=<StudentDetail user={user} data={data} studentId={match[1]} reloadOverview={reload}/>;
    else page=<Empty icon="target" title="الصفحة غير موجودة" action={<Button onClick={()=>go("/teacher")}>لوحة المعلم</Button>}/>;
  }
  return <AppShell mode="teacher" subtitle="بوابة المعلم" nav={TEACHER_NAV} actions={<><span style={{fontSize:12,fontWeight:900}}>{user?.name||"المعلم"}</span><Button kind="ghost" icon="logout" onClick={logout}>خروج</Button></>} footer="أبو العزايم • Teacher Workspace وEnrollment هما أساس إدارة الطلاب.">
    {error&&<ErrorBox text={error}/>} {page}
  </AppShell>;
}
