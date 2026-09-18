import React,{useEffect,useState} from "react";
import {
  acceptEnrollmentInvite,createChild,getActiveChildId,getCurrentUser,hasChildModePin,
  listChildTaskAssignments,listChildren,listParentEnrollments,listSessionBillingEntries,listStudentWallets,listVisibleSessions,setActiveChildId,setChildModePin,signOut,submitTaskAssignment,updateChild
} from "./api.js";
import Icon from "./Icon.jsx";
import {AppShell,Button,Card,Empty,FAMILY_NAV,Hero,Metric,Section,go} from "./ui-v4.jsx";

function genderLabel(v){return v==="male"?"ولد":v==="female"?"بنت":"غير محدد";}
function money(v){return new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(v||0));}
function taskTypeLabel(v){return ({NEW_MEMORIZATION:"حفظ جديد",REVIEW:"مراجعة",RECITATION:"تسميع",BEHAVIOR:"سلوك"}[v]||v||"مهمة");}
function taskStatusLabel(v){return ({assigned:"مطلوبة",pending_teacher_approval:"بانتظار المعلم",approved:"معتمدة",rejected:"تحتاج إعادة"}[v]||v||"");}
function formatDate(value){if(!value)return "—";try{return new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch{return value;}}
function sessionStatusLabel(v){return ({SCHEDULED:"مجدولة",COMPLETED:"مكتملة",STUDENT_NO_SHOW:"غياب الطالب",TEACHER_NO_SHOW:"غياب المعلم",EARLY_CANCELLATION:"إلغاء مبكر",LATE_CANCELLATION:"إلغاء متأخر",RESCHEDULED:"أعيدت جدولتها",CANCELLED:"ملغاة"}[v]||v||"");}
function billingStatusLabel(v){return ({DUE:"مستحق",PAID:"مدفوع",WAIVED:"معفى"}[v]||v||"");}
const PENDING_INVITE_KEY="abu-alazaem-pending-enrollment-invite";

export default function FamilyPage(){
  const [user,setUser]=useState(undefined),[kids,setKids]=useState([]),[enrollments,setEnrollments]=useState([]),[wallets,setWallets]=useState([]),[tasks,setTasks]=useState([]),[sessions,setSessions]=useState([]),[billing,setBilling]=useState([]);
  const [taskNotes,setTaskNotes]=useState({});
  const [name,setName]=useState(""),[ageYears,setAgeYears]=useState(8),[gender,setGender]=useState("unspecified");
  const [editingId,setEditingId]=useState(null),[editForm,setEditForm]=useState(null);
  const [pinReady,setPinReady]=useState(false),[pin,setPin]=useState(""),[pin2,setPin2]=useState("");
  const [inviteToken,setInviteToken]=useState(()=>{
    const token=new URLSearchParams(window.location.search).get("invite")||localStorage.getItem(PENDING_INVITE_KEY)||"";
    if(token)localStorage.setItem(PENDING_INVITE_KEY,token);
    return token;
  });
  const [inviteChild,setInviteChild]=useState("");
  const [busy,setBusy]=useState(false),[msg,setMsg]=useState(""),[err,setErr]=useState("");

  async function load(current=user){
    if(!current)return;
    const from=new Date(Date.now()-30*86400000),to=new Date(Date.now()+90*86400000);
    const [children,links,pinState,walletRows,sessionRows,billingRows]=await Promise.all([
      listChildren(current),listParentEnrollments(),hasChildModePin().catch(()=>false),listStudentWallets().catch(()=>[]),
      listVisibleSessions({from,to}).catch(()=>[]),listSessionBillingEntries().catch(()=>[])
    ]);
    setKids(children||[]);setEnrollments(links||[]);setPinReady(Boolean(pinState));setWallets(walletRows||[]);setSessions(sessionRows||[]);setBilling(billingRows||[]);
    const active=getActiveChildId();
    const selected=(children||[]).find(x=>x.id===active)||(children||[])[0]||null;
    if(selected&&selected.id!==active)setActiveChildId(selected.id);
    if(selected&&!inviteChild)setInviteChild(selected.id);
    setTasks(selected?await listChildTaskAssignments(selected.id).catch(()=>[]):[]);
  }

  useEffect(()=>{let alive=true;(async()=>{try{
    const current=await getCurrentUser();if(!alive)return;
    if(!current){if(inviteToken)localStorage.setItem(PENDING_INVITE_KEY,inviteToken);return go("/login");}
    setUser(current);
    const from=new Date(Date.now()-30*86400000),to=new Date(Date.now()+90*86400000);
    const [children,links,pinState,walletRows,sessionRows,billingRows]=await Promise.all([
      listChildren(current),listParentEnrollments(),hasChildModePin().catch(()=>false),listStudentWallets().catch(()=>[]),
      listVisibleSessions({from,to}).catch(()=>[]),listSessionBillingEntries().catch(()=>[])
    ]);
    if(!alive)return;
    setKids(children||[]);setEnrollments(links||[]);setPinReady(Boolean(pinState));setWallets(walletRows||[]);setSessions(sessionRows||[]);setBilling(billingRows||[]);
    const active=getActiveChildId();
    const selected=(children||[]).find(x=>x.id===active)||(children||[])[0]||null;
    if(selected&&selected.id!==active)setActiveChildId(selected.id);
    if(selected)setInviteChild(selected.id);
    setTasks(selected?await listChildTaskAssignments(selected.id).catch(()=>[]):[]);
  }catch(e){if(alive)setErr(e.message||"تعذر تحميل حساب الأسرة.");}})();return()=>{alive=false;};},[]);

  async function addChild(e){e.preventDefault();if(!user)return;setBusy(true);setErr("");setMsg("");
    try{
      const years=Number(ageYears);const ageBand=years<=6?"3-6":years<=9?"7-9":"10-12";
      const child=await createChild(user,{displayName:name.trim(),ageBand,ageYears:years,gender,avatar:null,customization:{}});
      setName("");if(child?.id){setActiveChildId(child.id);setInviteChild(child.id);}await load(user);setMsg("تمت إضافة الطفل.");
    }catch(e){setErr(e.message||"تعذر إضافة الطفل.");}finally{setBusy(false);}
  }

  function beginEdit(child){setEditingId(child.id);setEditForm({
    displayName:child.display_name||"",ageBand:child.age_band||"7-9",ageYears:child.age_years||8,
    gender:child.gender||"unspecified",avatar:child.avatar||null,customization:child.customization||{}
  });}

  async function saveEdit(e){e.preventDefault();setBusy(true);setErr("");setMsg("");
    try{await updateChild(editingId,{...editForm,ageYears:Number(editForm.ageYears)});setEditingId(null);setEditForm(null);await load(user);setMsg("تم تحديث بيانات الطفل.");}
    catch(e){setErr(e.message||"تعذر تحديث بيانات الطفل.");}finally{setBusy(false);}
  }

  async function savePin(e){e.preventDefault();setErr("");setMsg("");
    if(!/^[0-9]{4}$/.test(pin)){setErr("الرقم السري يجب أن يكون 4 أرقام.");return;}
    if(pin!==pin2){setErr("تأكيد الرقم السري غير مطابق.");return;}
    setBusy(true);try{await setChildModePin(pin);setPin("");setPin2("");setPinReady(true);setMsg("تم حفظ الرقم السري لوضع الطفل.");}
    catch(e){setErr(e.message||"تعذر حفظ الرقم السري.");}finally{setBusy(false);}
  }

  async function acceptInvite(e){e.preventDefault();if(!inviteToken||!inviteChild)return;
    setBusy(true);setErr("");setMsg("");
    try{
      await acceptEnrollmentInvite(inviteToken,inviteChild);
      setInviteToken("");localStorage.removeItem(PENDING_INVITE_KEY);history.replaceState({},"","/family");
      await load(user);setMsg("تم ربط الطفل بالمعلم بنجاح.");
    }catch(e){setErr(e.message||"تعذر قبول دعوة المعلم.");}finally{setBusy(false);}
  }

  async function sendTask(assignmentId){
    setBusy(true);setErr("");setMsg("");
    try{
      await submitTaskAssignment(assignmentId,taskNotes[assignmentId]||"");
      if(activeChild)setTasks(await listChildTaskAssignments(activeChild.id));
      setTaskNotes(v=>({...v,[assignmentId]:""}));
      setMsg("تم إرسال إنجاز المهمة للمعلم للمراجعة. النقاط لن تُضاف قبل اعتماده.");
    }catch(e){setErr(e.message||"تعذر إرسال المهمة.");}
    finally{setBusy(false);}
  }

  async function logout(){await signOut();go("/");}
  const active=getActiveChildId(),activeChild=kids.find(k=>k.id===active)||kids[0]||null;
  const activeLinks=enrollments.filter(e=>e.student_id===activeChild?.id);
  const activeWallet=wallets.find(w=>w.student_id===activeChild?.id)||{wallet_balance:0,lifetime_points:0};
  const activeEnrollmentIds=new Set(activeLinks.map(e=>e.id));
  const childSessions=sessions.filter(s=>activeEnrollmentIds.has(s.enrollment_id));
  const upcomingSessions=childSessions.filter(s=>s.status==="SCHEDULED"&&new Date(s.scheduled_start_utc)>=new Date()).slice(0,5);
  const childBilling=billing.filter(b=>activeEnrollmentIds.has(b.enrollment_id));
  const dueTotal=childBilling.filter(b=>b.status==="DUE").reduce((sum,b)=>sum+Number(b.amount||0),0);
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز حساب الأسرة...</p></div>;

  return <AppShell mode="family" subtitle="حساب الأسرة" nav={FAMILY_NAV}
    actions={<><Button kind="secondary" icon="child" onClick={()=>go("/child")} disabled={!activeChild||!pinReady}>وضع الطفل</Button><Button kind="ghost" icon="logout" onClick={logout}>خروج</Button></>}
    footer="أبو العزايم • ولي الأمر يملك ملف الطفل والمعلم يرتبط به عبر Enrollment.">
    <Hero eyebrow="حساب الأسرة" title={`أهلًا ${user?.name||"بك"}`}
      description="ملف الطفل ملك للأسرة. اربطه بأكثر من معلم من خلال دعوات آمنة، وادخل وضع الطفل برقم سري مستقل." icon="family" tone="sky"/>
    {err&&<div className="msg error">{err}</div>}{msg&&<div className="msg ok">{msg}</div>}

    {inviteToken&&<Section eyebrow="دعوة معلم" title="اختر الطفل الذي سيدرس مع هذا المعلم" description="الدعوة لا تنشئ ملف طفل جديد؛ تضيف Enrollment للملف الذي تختاره.">
      <form className="aa-learning-card aa-form" onSubmit={acceptInvite} style={{maxWidth:620}}>
        {kids.length?<label>الطفل<select value={inviteChild} onChange={e=>setInviteChild(e.target.value)} required>{kids.map(k=><option key={k.id} value={k.id}>{k.display_name}</option>)}</select></label>:<Empty icon="child" title="أضف طفلًا أولًا" text="بعد إضافة الطفل ارجع إلى نفس رابط الدعوة."/>}
        <Button type="submit" disabled={busy||!kids.length}>قبول الدعوة وربط الطفل</Button>
      </form>
    </Section>}

    {activeChild&&<div className="aa-metrics">
      <Metric icon="child" label="الطفل النشط" value={activeChild.display_name} tone="sky"/>
      <Metric icon="users" label="المعلمون المرتبطون" value={activeLinks.length} tone="mint"/>
      <Metric icon="trophy" label="رصيد الألعاب" value={activeWallet.wallet_balance||0} tone="gold"/>
      <Metric icon="flame" label="الاستمرار" value={`${activeChild.streak||0} يوم`} tone="mint"/>
    </div>}

    <Section eyebrow="الجدول" title="الحصص القادمة" description="المواعيد تُدار حسب توقيت المعلم وتظهر هنا كتوقيت فعلي للحصة.">
      {upcomingSessions.length?<div className="aa-table-list">{upcomingSessions.map(row=>{
        const link=enrollments.find(e=>e.id===row.enrollment_id);
        return <article className="aa-table-row" key={row.id}>
          <span><Icon name="clock" size={21}/></span><div><b>{formatDate(row.scheduled_start_utc)}</b><small>{link?.workspace?.display_name||"المعلم"} • {sessionStatusLabel(row.status)} • Teacher TZ: {link?.workspace?.timezone||"—"}</small></div><strong>{money(link?.session_rate||0)}</strong>
        </article>;
      })}</div>:<Empty icon="clock" title="لا توجد حصص قادمة لهذا الطفل"/>}
    </Section>

    <Section eyebrow="متابعة التعلم" title="مهام المعلم" description="ولي الأمر يرسل الإنجاز، والمعلم هو من يراجع ويعتمد النقاط.">
      {activeChild?(tasks.length?<div className="aa-person-list">{tasks.map(row=><article className="aa-person-card" key={row.id}>
        <div className="aa-person-head"><span className="aa-avatar"><Icon name={row.status==="approved"?"circleCheck":"target"} size={25}/></span><div>
          <b>{row.task?.title||"مهمة"}</b>
          <small>{taskTypeLabel(row.task?.task_type)} • {row.task?.points_reward||0} نقطة بعد اعتماد المعلم • التسليم {formatDate(row.due_at)}</small>
        </div></div>
        {row.task?.teacher_note&&<p style={{fontSize:12,margin:"8px 0"}}>ملاحظة المعلم: {row.task.teacher_note}</p>}
        {row.status==="rejected"&&row.latestSubmission?.rejection_note&&<div className="msg error">سبب الرفض: {row.latestSubmission.rejection_note}</div>}
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <strong>{taskStatusLabel(row.status)}</strong>
          {(row.status==="assigned"||row.status==="rejected")&&<div style={{display:"grid",gap:8,minWidth:260,flex:"1 1 340px"}}>
            <textarea rows="2" placeholder="ملاحظة اختيارية للمعلم" value={taskNotes[row.id]||""} onChange={e=>setTaskNotes(v=>({...v,[row.id]:e.target.value}))}/>
            <Button onClick={()=>sendTask(row.id)} disabled={busy} icon="circleCheck">تم الإنجاز — أرسل للمعلم</Button>
          </div>}
          {row.status==="pending_teacher_approval"&&<span style={{fontSize:12,color:"var(--aa-muted)"}}>بانتظار قرار المعلم، ولا توجد نقاط مضافة حتى الآن.</span>}
          {row.status==="approved"&&<span style={{fontSize:12}}>تم اعتماد المهمة وإضافة النقاط.</span>}
        </div>
      </article>)}</div>:<Empty icon="target" title="لا توجد مهام لهذا الطفل بعد" text="عندما يرسل المعلم مهمة ستظهر هنا تلقائيًا."/>):<Empty icon="child" title="اختر طفلًا أولًا"/>}
    </Section>

    <Section eyebrow="الأمان" title="الرقم السري لوضع الطفل" description={pinReady?"تم إعداد PIN. يمكنك تغييره متى شئت.":"عيّن 4 أرقام أولًا؛ لن نسمح بدخول وضع الطفل قبل وجود PIN للخروج الآمن."}>
      <form className="aa-learning-card aa-form" onSubmit={savePin} style={{maxWidth:620}}>
        <label>PIN من 4 أرقام<input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength="4" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} required/></label>
        <label>تأكيد PIN<input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength="4" value={pin2} onChange={e=>setPin2(e.target.value.replace(/\D/g,"").slice(0,4))} required/></label>
        <Button type="submit" disabled={busy}>{pinReady?"تغيير الرقم السري":"حفظ الرقم السري"}</Button>
      </form>
    </Section>

    <Section eyebrow="إدارة الأسرة" title="الأطفال">
      <div className="aa-dashboard-grid">
        <aside className="aa-form-card"><h3 style={{marginTop:0}}>إضافة طفل</h3>
          <form className="aa-form" onSubmit={addChild}>
            <label>اسم الطفل<input value={name} onChange={e=>setName(e.target.value)} required maxLength="60"/></label>
            <label>العمر<input type="number" min="6" max="12" value={ageYears} onChange={e=>setAgeYears(e.target.value)} required/></label>
            <label>النوع<select value={gender} onChange={e=>setGender(e.target.value)}><option value="unspecified">غير محدد</option><option value="male">ولد</option><option value="female">بنت</option></select></label>
            <Button type="submit" disabled={busy}>إضافة الطفل</Button>
          </form>
        </aside>
        <section>{kids.length?<div className="aa-person-list">{kids.map(child=><article className="aa-person-card" key={child.id}>
          <div className="aa-person-head"><span className="aa-avatar"><Icon name="child" size={27}/></span><div><b>{child.display_name}</b><small>{child.age_years||"—"} سنة • {genderLabel(child.gender)}</small></div></div>
          {editingId===child.id?<form className="aa-form" onSubmit={saveEdit}>
            <label>الاسم<input value={editForm.displayName} onChange={e=>setEditForm(v=>({...v,displayName:e.target.value}))} required/></label>
            <label>العمر<input type="number" min="6" max="12" value={editForm.ageYears} onChange={e=>setEditForm(v=>({...v,ageYears:e.target.value}))}/></label>
            <div style={{display:"flex",gap:8}}><Button type="submit" disabled={busy}>حفظ</Button><Button kind="ghost" onClick={()=>{setEditingId(null);setEditForm(null);}}>إلغاء</Button></div>
          </form>:<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button kind={active===child.id?"soft":"secondary"} onClick={()=>{setActiveChildId(child.id);setInviteChild(child.id);listChildTaskAssignments(child.id).then(setTasks).catch(()=>setTasks([]));}}>{active===child.id?"الطفل النشط":"اختيار"}</Button><Button kind="ghost" onClick={()=>beginEdit(child)}>تعديل</Button></div>}
        </article>)}</div>:<Empty icon="child" title="لا يوجد أطفال بعد"/>}</section>
      </div>
    </Section>

    <Section eyebrow="Tuition CRM" title="كشف الاستحقاقات" description="الدفع يتم خارج المنصة. هنا فقط نتابع ما أصبح مستحقًا أو مدفوعًا أو تم إعفاؤه.">
      <div className="aa-metrics" style={{marginBottom:18}}>
        <Metric icon="clock" label="إجمالي المستحق" value={money(dueTotal)} tone="gold"/>
        <Metric icon="list" label="عدد القيود" value={childBilling.length} tone="sky"/>
      </div>
      {childBilling.length?<div className="aa-table-list">{childBilling.map(entry=>{
        const session=childSessions.find(s=>s.id===entry.session_id);
        const link=enrollments.find(e=>e.id===entry.enrollment_id);
        return <article className="aa-table-row" key={entry.id}>
          <span><Icon name="chart" size={21}/></span><div><b>{money(entry.amount)} — {billingStatusLabel(entry.status)}</b><small>{link?.workspace?.display_name||"المعلم"} • {session?formatDate(session.scheduled_start_utc):"حصة"} • {sessionStatusLabel(entry.auto_charge_reason)}</small>{entry.override_reason&&<small>سبب الإعفاء: {entry.override_reason}</small>}</div><strong>{entry.status}</strong>
        </article>;
      })}</div>:<Empty icon="chart" title="لا توجد استحقاقات لهذا الطفل بعد"/>}
    </Section>

    <Section eyebrow="Enrollment" title="المعلمون المرتبطون" description="كل معلم له علاقة تعليمية مستقلة وسعر حصة مستقل، بينما ملف الطفل يظل ملك الأسرة.">
      {enrollments.length?<div className="aa-table-list">{enrollments.map(link=>{
        const child=kids.find(k=>k.id===link.student_id);return <article className="aa-table-row" key={link.id}>
          <span><Icon name="teacher" size={21}/></span><div><b>{link.workspace?.display_name||"معلم"}</b><small>{child?.display_name||"الطفل"} • {link.status==="active"?"نشط":link.status} • سعر الحصة {money(link.session_rate)}</small></div><strong>{link.workspace?.timezone||""}</strong>
        </article>;
      })}</div>:<Empty icon="users" title="لا توجد علاقات تعليمية بعد" text="عندما يرسل المعلم دعوة إلى بريدك، افتح الرابط واختر الطفل."/>}
    </Section>
  </AppShell>;
}
