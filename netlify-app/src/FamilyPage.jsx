import React,{useEffect,useState} from "react";
import {
  acceptEnrollmentInvite,createChild,getActiveChildId,getCurrentUser,hasChildModePin,
  listChildren,listParentEnrollments,setActiveChildId,setChildModePin,signOut,updateChild
} from "./api.js";
import Icon from "./Icon.jsx";
import {AppShell,Button,Card,Empty,FAMILY_NAV,Hero,Metric,Section,go} from "./ui-v4.jsx";

function genderLabel(v){return v==="male"?"ولد":v==="female"?"بنت":"غير محدد";}
function money(v){return new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(v||0));}
const PENDING_INVITE_KEY="abu-alazaem-pending-enrollment-invite";

export default function FamilyPage(){
  const [user,setUser]=useState(undefined),[kids,setKids]=useState([]),[enrollments,setEnrollments]=useState([]);
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
    const [children,links,pinState]=await Promise.all([
      listChildren(current),listParentEnrollments(),hasChildModePin().catch(()=>false)
    ]);
    setKids(children||[]);setEnrollments(links||[]);setPinReady(Boolean(pinState));
    const active=getActiveChildId();
    const selected=(children||[]).find(x=>x.id===active)||(children||[])[0]||null;
    if(selected&&selected.id!==active)setActiveChildId(selected.id);
    if(selected&&!inviteChild)setInviteChild(selected.id);
  }

  useEffect(()=>{let alive=true;(async()=>{try{
    const current=await getCurrentUser();if(!alive)return;
    if(!current){if(inviteToken)localStorage.setItem(PENDING_INVITE_KEY,inviteToken);return go("/login");}
    setUser(current);
    const [children,links,pinState]=await Promise.all([listChildren(current),listParentEnrollments(),hasChildModePin().catch(()=>false)]);
    if(!alive)return;
    setKids(children||[]);setEnrollments(links||[]);setPinReady(Boolean(pinState));
    const active=getActiveChildId();
    const selected=(children||[]).find(x=>x.id===active)||(children||[])[0]||null;
    if(selected&&selected.id!==active)setActiveChildId(selected.id);
    if(selected)setInviteChild(selected.id);
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

  async function logout(){await signOut();go("/");}
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز حساب الأسرة...</p></div>;

  const active=getActiveChildId(),activeChild=kids.find(k=>k.id===active)||kids[0]||null;
  const activeLinks=useMemo(()=>enrollments.filter(e=>e.student_id===activeChild?.id),[enrollments,activeChild?.id]);

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
      <Metric icon="trophy" label="النقاط الحالية" value={activeChild.points||0} tone="gold"/>
      <Metric icon="flame" label="الاستمرار" value={`${activeChild.streak||0} يوم`} tone="mint"/>
    </div>}

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
          </form>:<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button kind={active===child.id?"soft":"secondary"} onClick={()=>{setActiveChildId(child.id);setInviteChild(child.id);}}>{active===child.id?"الطفل النشط":"اختيار"}</Button><Button kind="ghost" onClick={()=>beginEdit(child)}>تعديل</Button></div>}
        </article>)}</div>:<Empty icon="child" title="لا يوجد أطفال بعد"/>}</section>
      </div>
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
