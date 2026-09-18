import React,{useEffect,useMemo,useState} from "react";
import {
  cancelSession,createRecurringScheduleRule,finalizeSession,listRecurringScheduleRules,
  listSessionBillingEntries,listVisibleSessions,markSessionChargePaid,rescheduleSessionLocal,
  setRecurringScheduleRuleActive,waiveSessionCharge
} from "./api.js";
import Icon from "./Icon.jsx";
import {Button,Empty,Hero,Metric,Section} from "./ui-v4.jsx";

const DAY_NAMES=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const STATUS_LABELS={
  SCHEDULED:"مجدولة",COMPLETED:"مكتملة",STUDENT_NO_SHOW:"غياب الطالب",TEACHER_NO_SHOW:"غياب المعلم",
  EARLY_CANCELLATION:"إلغاء مبكر",LATE_CANCELLATION:"إلغاء متأخر",RESCHEDULED:"أعيدت جدولتها",CANCELLED:"ملغاة"
};

function fmtDate(value,timezone){
  if(!value)return "—";
  try{return new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short",timeZone:timezone||"UTC"}).format(new Date(value));}
  catch{return String(value);}
}
function money(value){return new Intl.NumberFormat("ar-EG",{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value||0));}
function ErrorBox({text}){return text?<div className="msg error">{text}</div>:null;}

export function TeacherSchedulePanel({data}){
  const [rules,setRules]=useState([]),[sessions,setSessions]=useState([]),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState(""),[error,setError]=useState("");
  const [notes,setNotes]=useState({}),[reschedule,setReschedule]=useState({});
  const [form,setForm]=useState({enrollmentId:"",weekday:0,startTime:"16:00",durationMinutes:45});

  const students=data.students.filter(s=>s.enrollmentStatus==="active");
  const timezone=data.workspace?.timezone||"Africa/Cairo";
  const studentByEnrollment=useMemo(()=>new Map(students.map(s=>[s.enrollmentId,s])),[students]);

  async function load(){
    try{
      const from=new Date(Date.now()-7*86400000),to=new Date(Date.now()+90*86400000);
      const [ruleRows,sessionRows]=await Promise.all([
        listRecurringScheduleRules(),listVisibleSessions({from,to})
      ]);
      setRules(ruleRows||[]);setSessions(sessionRows||[]);setError("");
    }catch(e){setError(e.message||"تعذر تحميل الجدول.");}
  }
  useEffect(()=>{load();},[]);
  useEffect(()=>{
    if(!form.enrollmentId&&students[0]?.enrollmentId)setForm(v=>({...v,enrollmentId:students[0].enrollmentId}));
  },[students.length,form.enrollmentId]);

  async function createRule(e){
    e.preventDefault();setBusy(true);setMessage("");setError("");
    try{
      const result=await createRecurringScheduleRule({
        enrollmentId:form.enrollmentId,weekday:Number(form.weekday),startTime:form.startTime,
        durationMinutes:Number(form.durationMinutes)||45,weeksAhead:12
      });
      setMessage("تم إنشاء الموعد الأسبوعي وإنشاء "+(result?.sessions_created||0)+" حصة قادمة.");
      await load();
    }catch(e){setError(e.message||"تعذر إنشاء الجدول الأسبوعي.");}
    finally{setBusy(false);}
  }

  async function pauseRule(rule){
    if(!window.confirm("إيقاف هذا الموعد الأسبوعي؟ الحصص المستقبلية الناتجة عنه ستصبح ملغاة."))return;
    setBusy(true);setMessage("");setError("");
    try{await setRecurringScheduleRuleActive(rule.id,false);setMessage("تم إيقاف الموعد الأسبوعي.");await load();}
    catch(e){setError(e.message||"تعذر إيقاف الموعد.");}
    finally{setBusy(false);}
  }

  async function finalize(row,status){
    setBusy(true);setMessage("");setError("");
    try{
      const result=await finalizeSession(row.id,status,notes[row.id]||"");
      setMessage(result?.billable?"تم إنهاء الحصة وإنشاء استحقاق مالي تلقائي.":"تم إنهاء الحصة بدون استحقاق مالي.");
      await load();
    }catch(e){setError(e.message||"تعذر إنهاء الحصة.");}
    finally{setBusy(false);}
  }

  async function cancel(row){
    if(!window.confirm("إلغاء هذه الحصة؟ إلغاء المعلم لا ينشئ استحقاقًا على ولي الأمر."))return;
    setBusy(true);setMessage("");setError("");
    try{await cancelSession(row.id,notes[row.id]||"");setMessage("تم إلغاء الحصة.");await load();}
    catch(e){setError(e.message||"تعذر إلغاء الحصة.");}
    finally{setBusy(false);}
  }

  async function move(row){
    const next=reschedule[row.id]||{};
    if(!next.date||!next.time){setError("اختر التاريخ والوقت الجديدين حسب توقيت المعلم.");return;}
    setBusy(true);setMessage("");setError("");
    try{
      await rescheduleSessionLocal(row.id,next.date,next.time,notes[row.id]||"");
      setReschedule(v=>({...v,[row.id]:{date:"",time:""}}));
      setMessage("تمت إعادة الجدولة حسب توقيت المعلم: "+timezone+".");await load();
    }catch(e){setError(e.message||"تعذر إعادة الجدولة.");}
    finally{setBusy(false);}
  }

  const upcoming=sessions.filter(s=>new Date(s.scheduled_start_utc)>=new Date()||s.status!=="SCHEDULED").slice(0,40);
  const scheduledCount=sessions.filter(s=>s.status==="SCHEDULED"&&new Date(s.scheduled_start_utc)>=new Date()).length;

  return <>
    <Hero eyebrow="Scheduling V7" title="الجدول والحصص" description={"التوقيت الأساسي للسياسات هو "+timezone+"، بينما التخزين في قاعدة البيانات UTC."} icon="clock" tone="sky"/>
    {message&&<div className="msg ok">{message}</div>}<ErrorBox text={error}/>
    <div className="aa-teacher-layout">
      <Metric icon="clock" label="حصص قادمة" value={scheduledCount} tone="sky"/>
      <Metric icon="review" label="قواعد أسبوعية نشطة" value={rules.filter(r=>r.active).length} tone="mint"/>
      <Metric icon="users" label="طلاب نشطون" value={students.length} tone="mint"/>
      <Metric icon="teacher" label="Teacher Timezone" value={timezone} tone="gold"/>
    </div>

    <div className="aa-dashboard-grid" style={{marginTop:24}}>
      <aside className="aa-form-card"><h3 style={{marginTop:0}}>موعد أسبوعي جديد</h3>
        {students.length?<form className="aa-form" onSubmit={createRule}>
          <label>الطالب<select value={form.enrollmentId} onChange={e=>setForm(v=>({...v,enrollmentId:e.target.value}))} required>
            {students.map(s=><option key={s.enrollmentId} value={s.enrollmentId}>{s.display_name}</option>)}
          </select></label>
          <label>اليوم<select value={form.weekday} onChange={e=>setForm(v=>({...v,weekday:e.target.value}))}>
            {DAY_NAMES.map((d,i)=><option key={i} value={i}>{d}</option>)}
          </select></label>
          <label>الوقت حسب توقيت المعلم<input type="time" value={form.startTime} onChange={e=>setForm(v=>({...v,startTime:e.target.value}))} required/></label>
          <label>مدة الحصة بالدقائق<input type="number" min="15" max="240" step="5" value={form.durationMinutes} onChange={e=>setForm(v=>({...v,durationMinutes:e.target.value}))} required/></label>
          <Button type="submit" disabled={busy} icon="clock">إنشاء الجدول</Button>
        </form>:<Empty icon="users" title="لا يوجد Enrollment نشط"/>}
      </aside>
      <section>
        <Section eyebrow="Recurring Rules" title="المواعيد الأسبوعية">
          {rules.length?<div className="aa-person-list">{rules.map(rule=>{
            const student=studentByEnrollment.get(rule.enrollment_id);
            return <article className="aa-person-card" key={rule.id}>
              <div className="aa-person-head"><span className="aa-avatar"><Icon name="clock" size={24}/></span><div>
                <b>{student?.display_name||"طالب"}</b>
                <small>{DAY_NAMES[rule.weekday]} • {String(rule.local_start_time).slice(0,5)} • {rule.duration_minutes} دقيقة • {rule.timezone}</small>
              </div></div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <strong>{rule.active?"نشط":"متوقف"}</strong>
                {rule.active&&<Button kind="secondary" onClick={()=>pauseRule(rule)} disabled={busy}>إيقاف الموعد</Button>}
              </div>
            </article>;
          })}</div>:<Empty icon="clock" title="لا توجد مواعيد أسبوعية بعد"/>}
        </Section>
      </section>
    </div>

    <Section eyebrow="Session lifecycle" title="الحصص">
      {upcoming.length?<div className="aa-person-list">{upcoming.map(row=>{
        const student=studentByEnrollment.get(row.enrollment_id);
        const canAct=row.status==="SCHEDULED";
        const moveState=reschedule[row.id]||{date:"",time:""};
        return <article className="aa-person-card" key={row.id}>
          <div className="aa-person-head"><span className="aa-avatar"><Icon name={canAct?"clock":"circleCheck"} size={24}/></span><div>
            <b>{student?.display_name||"طالب"} — {STATUS_LABELS[row.status]||row.status}</b>
            <small>{fmtDate(row.scheduled_start_utc,timezone)} → {fmtDate(row.scheduled_end_utc,timezone)}</small>
          </div></div>
          {row.teacher_note&&<p style={{fontSize:12,margin:"8px 0"}}>{row.teacher_note}</p>}
          {canAct&&<>
            <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800}}>ملاحظة اختيارية
              <input value={notes[row.id]||""} onChange={e=>setNotes(v=>({...v,[row.id]:e.target.value}))} maxLength="400"/>
            </label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
              <Button onClick={()=>finalize(row,"COMPLETED")} disabled={busy} icon="circleCheck">مكتملة</Button>
              <Button kind="secondary" onClick={()=>finalize(row,"STUDENT_NO_SHOW")} disabled={busy}>غياب الطالب</Button>
              <Button kind="secondary" onClick={()=>finalize(row,"TEACHER_NO_SHOW")} disabled={busy}>غياب المعلم</Button>
              <Button kind="ghost" onClick={()=>cancel(row)} disabled={busy} icon="close">إلغاء</Button>
            </div>
            <div className="aa-form" style={{gridTemplateColumns:"1fr 1fr auto",alignItems:"end",marginTop:12}}>
              <label>تاريخ جديد<input type="date" value={moveState.date} onChange={e=>setReschedule(v=>({...v,[row.id]:{...moveState,date:e.target.value}}))}/></label>
              <label>وقت جديد<input type="time" value={moveState.time} onChange={e=>setReschedule(v=>({...v,[row.id]:{...moveState,time:e.target.value}}))}/></label>
              <Button kind="secondary" onClick={()=>move(row)} disabled={busy}>إعادة الجدولة</Button>
            </div>
          </>}
        </article>;
      })}</div>:<Empty icon="clock" title="لا توجد حصص في النطاق الحالي"/>}
    </Section>
  </>;
}

export function TeacherBillingPanel({data}){
  const [entries,setEntries]=useState([]),[sessions,setSessions]=useState([]),[busy,setBusy]=useState(false);
  const [reasons,setReasons]=useState({}),[message,setMessage]=useState(""),[error,setError]=useState("");
  const timezone=data.workspace?.timezone||"Africa/Cairo";
  const studentByEnrollment=useMemo(()=>new Map(data.students.map(s=>[s.enrollmentId,s])),[data.students]);
  const sessionMap=useMemo(()=>new Map(sessions.map(s=>[s.id,s])),[sessions]);

  async function load(){
    try{
      const [billingRows,sessionRows]=await Promise.all([listSessionBillingEntries(),listVisibleSessions()]);
      setEntries(billingRows||[]);setSessions(sessionRows||[]);setError("");
    }catch(e){setError(e.message||"تعذر تحميل الاستحقاقات.");}
  }
  useEffect(()=>{load();},[]);

  const totals=useMemo(()=>{
    const total=status=>entries.filter(e=>e.status===status).reduce((sum,e)=>sum+Number(e.amount||0),0);
    return {due:total("DUE"),paid:total("PAID"),waived:total("WAIVED")};
  },[entries]);

  async function paid(entry){
    setBusy(true);setMessage("");setError("");
    try{await markSessionChargePaid(entry.id);setMessage("تم تسجيل الاستحقاق كمدفوع خارج المنصة.");await load();}
    catch(e){setError(e.message||"تعذر تحديث حالة الدفع.");}
    finally{setBusy(false);}
  }
  async function waive(entry){
    const reason=String(reasons[entry.id]||"").trim();
    if(reason.length<3){setError("سبب الإعفاء إلزامي.");return;}
    setBusy(true);setMessage("");setError("");
    try{
      await waiveSessionCharge(entry.id,reason);setReasons(v=>({...v,[entry.id]:""}));
      setMessage("تم إعفاء الاستحقاق مع الاحتفاظ بحالة الحصة في السجل.");await load();
    }catch(e){setError(e.message||"تعذر إعفاء الاستحقاق.");}
    finally{setBusy(false);}
  }

  return <>
    <Hero eyebrow="Tuition CRM" title="استحقاقات أولياء الأمور" description="هذه متابعة مالية فقط؛ الدفع يتم خارج المنصة، ولا علاقة لها باشتراك المعلم في SaaS." icon="chart" tone="mint"/>
    {message&&<div className="msg ok">{message}</div>}<ErrorBox text={error}/>
    <div className="aa-teacher-layout">
      <Metric icon="clock" label="مستحق" value={money(totals.due)} tone="gold"/>
      <Metric icon="circleCheck" label="مدفوع" value={money(totals.paid)} tone="mint"/>
      <Metric icon="shield" label="معفى" value={money(totals.waived)} tone="sky"/>
      <Metric icon="list" label="عدد القيود" value={entries.length} tone="sky"/>
    </div>
    <Section eyebrow="Statement" title="سجل الاستحقاقات">
      {entries.length?<div className="aa-person-list">{entries.map(entry=>{
        const session=sessionMap.get(entry.session_id);
        const student=studentByEnrollment.get(entry.enrollment_id);
        return <article className="aa-person-card" key={entry.id}>
          <div className="aa-person-head"><span className="aa-avatar"><Icon name="chart" size={24}/></span><div>
            <b>{student?.display_name||"طالب"} — {money(entry.amount)}</b>
            <small>{session?fmtDate(session.scheduled_start_utc,timezone):"حصة"} • السبب: {STATUS_LABELS[entry.auto_charge_reason]||entry.auto_charge_reason}</small>
          </div></div>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <strong>{entry.status==="DUE"?"مستحق":entry.status==="PAID"?"مدفوع":"معفى"}</strong>
            {entry.status==="DUE"&&<div style={{display:"flex",gap:8,flexWrap:"wrap",flex:"1 1 420px",justifyContent:"flex-end"}}>
              <input style={{minWidth:220}} value={reasons[entry.id]||""} onChange={e=>setReasons(v=>({...v,[entry.id]:e.target.value}))} placeholder="سبب الإعفاء إذا لزم"/>
              <Button onClick={()=>paid(entry)} disabled={busy} icon="circleCheck">تم الدفع</Button>
              <Button kind="secondary" onClick={()=>waive(entry)} disabled={busy}>إعفاء</Button>
            </div>}
          </div>
          {entry.override_reason&&<p style={{fontSize:12,margin:"8px 0 0"}}>سبب الإعفاء: {entry.override_reason}</p>}
        </article>;
      })}</div>:<Empty icon="chart" title="لا توجد استحقاقات بعد" text="يُنشأ الاستحقاق تلقائيًا فقط من حالة الحصة النهائية حسب قواعد V7."/>}
    </Section>
  </>;
}
