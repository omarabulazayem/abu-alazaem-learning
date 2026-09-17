import React, { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import {
  createChild,
  getActiveChildId,
  getCurrentUser,
  joinChildToClass,
  listChildren,
  setActiveChildId,
  signOut,
  updateChild,
} from "./api.js";

function routePath(){return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;}
function navigate(path){if(routePath()!==path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}}
function genderLabel(value){return value==="male"?"ولد":value==="female"?"بنت":"غير محدد";}

export default function FamilyPage(){
  const [user,setUser]=useState(undefined);
  const [kids,setKids]=useState([]);
  const [name,setName]=useState("");
  const [age,setAge]=useState("7-9");
  const [ageYears,setAgeYears]=useState(8);
  const [gender,setGender]=useState("unspecified");
  const [codes,setCodes]=useState({});
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [err,setErr]=useState("");

  async function load(current=user){
    if(!current)return;
    const rows=await listChildren(current);
    setKids(rows||[]);
    const active=getActiveChildId();
    if(rows.length&&!rows.some(x=>x.id===active))setActiveChildId(rows[0].id);
  }

  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const current=await getCurrentUser();
        if(!alive)return;
        if(!current)return navigate("/login");
        setUser(current);
        const rows=await listChildren(current);
        if(!alive)return;
        setKids(rows||[]);
        const active=getActiveChildId();
        if(rows.length&&!rows.some(x=>x.id===active))setActiveChildId(rows[0].id);
      }catch(e){if(alive)setErr(e.message||"تعذر تحميل حساب الأسرة.");}
    })();
    return()=>{alive=false;};
  },[]);

  async function addChild(e){
    e.preventDefault();
    if(!user)return;
    setBusy(true);setErr("");setMsg("");
    try{
      const child=await createChild(user,{displayName:name.trim(),ageBand:age,ageYears:Number(ageYears),gender,avatar:null,customization:{}});
      setName("");
      if(child?.id)setActiveChildId(child.id);
      await load(user);
      setMsg("تمت إضافة الطفل وحفظ بياناته في الحساب.");
    }catch(e){setErr(e.message||"تعذر إضافة الطفل.");}
    finally{setBusy(false);}
  }

  function beginEdit(child){
    setEditingId(child.id);
    setEditForm({
      displayName:child.display_name||"",
      ageBand:child.age_band||"7-9",
      ageYears:child.age_years||8,
      gender:child.gender||"unspecified",
      avatar:child.avatar||null,
      customization:child.customization||{},
    });
    setErr("");setMsg("");
  }

  async function saveEdit(e){
    e.preventDefault();
    if(!editingId||!editForm)return;
    setBusy(true);setErr("");setMsg("");
    try{
      await updateChild(editingId,{...editForm,ageYears:Number(editForm.ageYears)});
      setEditingId(null);setEditForm(null);
      await load(user);
      setMsg("تم تحديث بيانات الطفل بنجاح.");
    }catch(e){setErr(e.message||"تعذر تحديث بيانات الطفل.");}
    finally{setBusy(false);}
  }

  async function join(childId){
    const code=(codes[childId]||"").trim();
    if(!code)return;
    setBusy(true);setErr("");setMsg("");
    try{
      await joinChildToClass(childId,code);
      setCodes(v=>({...v,[childId]:""}));
      setMsg("تم ربط الطفل بالفصل بنجاح.");
    }catch(e){setErr(e.message||"تعذر ربط الطفل بالفصل.");}
    finally{setBusy(false);}
  }

  async function logout(){await signOut();navigate("/");}
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز حساب الأسرة...</p></div>;
  const active=getActiveChildId();

  return <div className="app family-v2" dir="rtl">
    <header className="family-topbar"><div className="wrap nav"><button className="brand" onClick={()=>navigate("/")}><span className="logo"><Icon name="mosque" size={22}/></span><span><b>أبو العزايم</b><small>حساب الأسرة</small></span></button><div className="actions"><button className="secondary" onClick={()=>navigate("/")}><Icon name="home" size={17}/> الرئيسية</button><button className="secondary" onClick={logout}><Icon name="logout" size={17}/> خروج</button></div></div></header>
    <main className="wrap page family-page">
      <section className="family-hero"><div><span className="family-kicker"><Icon name="users" size={18}/> إدارة رحلة الأطفال</span><h1>أهلًا {user?.name||"بك"}</h1><p>بيانات الطفل الأساسية والتقدم والمكافآت محفوظة في الحساب، بينما الجهاز يحتفظ فقط باختيار الطفل النشط.</p></div><div className="family-hero-art"><Icon name="family" size={74}/></div></section>
      {err&&<div className="msg error">{err}</div>}{msg&&<div className="msg ok">{msg}</div>}
      <div className="family-grid">
        <section className="panel family-add">
          <div className="panel-icon"><Icon name="user-plus" size={28}/></div><h2>إضافة طفل</h2><p className="muted">أضف ملفًا مستقلًا لكل طفل. العمر الدقيق والجنس بيانات اختيارية مفيدة لتخصيص التجربة لاحقًا.</p>
          <form onSubmit={addChild}>
            <label>اسم الطفل<input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الطفل الحقيقي" required maxLength="60"/></label>
            <label>العمر<input type="number" min="3" max="18" value={ageYears} onChange={e=>setAgeYears(e.target.value)} required/></label>
            <label>الفئة العمرية<select value={age} onChange={e=>setAge(e.target.value)}><option value="3-6">٣–٦ سنوات</option><option value="7-9">٧–٩ سنوات</option><option value="10-12">١٠–١٢ سنة</option></select></label>
            <label>الجنس<select value={gender} onChange={e=>setGender(e.target.value)}><option value="unspecified">غير محدد</option><option value="male">ولد</option><option value="female">بنت</option></select></label>
            <button className="primary full" disabled={busy}><Icon name="plus" size={18}/>{busy?"جارٍ الإضافة...":"إضافة الطفل"}</button>
          </form>
        </section>
        <section>
          <div className="family-section-head"><div><span>{kids.length} طفل</span><h2>أطفال الأسرة</h2></div>{active&&<button className="primary" onClick={()=>navigate("/child")}><Icon name="child" size={18}/> دخول وضع الطفل</button>}</div>
          {kids.length?<div className="family-children">{kids.map(child=>{
            const selected=child.id===active;
            const editing=editingId===child.id;
            return <article className={selected?"family-child selected":"family-child"} key={child.id}>
              <button className="family-child-main" onClick={()=>setActiveChildId(child.id)}><span className="family-child-avatar"><Icon name="child" size={34}/></span><span className="grow"><b>{child.display_name}</b><small>{child.age_years?`${child.age_years} سنوات • `:""}{child.age_band||""} • {genderLabel(child.gender)}</small></span>{selected&&<span className="active-badge"><Icon name="check" size={15}/> الطفل النشط</span>}</button>
              <div className="family-child-stats"><span><Icon name="trophy" size={17}/><b>{child.points||0}</b> نقطة</span><span><Icon name="star" size={17}/><b>{child.stars||0}</b> نجمة</span><span><Icon name="flame" size={17}/><b>{child.streak||0}</b> يوم</span></div>
              <div className="family-join"><Icon name="classroom" size={20}/><input value={codes[child.id]||""} onChange={e=>setCodes(v=>({...v,[child.id]:e.target.value}))} placeholder="كود الفصل"/><button className="secondary" disabled={busy} onClick={()=>join(child.id)}>ربط</button></div>
              <button className="link" onClick={()=>editing?setEditingId(null):beginEdit(child)}>{editing?"إلغاء التعديل":"تعديل بيانات الطفل"}</button>
              {editing&&editForm&&<form className="family-child-edit" onSubmit={saveEdit}>
                <label>الاسم<input value={editForm.displayName} onChange={e=>setEditForm(v=>({...v,displayName:e.target.value}))} required maxLength="60"/></label>
                <label>العمر<input type="number" min="3" max="18" value={editForm.ageYears} onChange={e=>setEditForm(v=>({...v,ageYears:e.target.value}))} required/></label>
                <label>الفئة<select value={editForm.ageBand} onChange={e=>setEditForm(v=>({...v,ageBand:e.target.value}))}><option value="3-6">٣–٦</option><option value="7-9">٧–٩</option><option value="10-12">١٠–١٢</option></select></label>
                <label>الجنس<select value={editForm.gender} onChange={e=>setEditForm(v=>({...v,gender:e.target.value}))}><option value="unspecified">غير محدد</option><option value="male">ولد</option><option value="female">بنت</option></select></label>
                <button className="primary" disabled={busy}>حفظ بيانات الطفل</button>
              </form>}
            </article>;
          })}</div>:<div className="family-empty"><span><Icon name="child" size={50}/></span><h3>أضف أول طفل</h3><p>بعد إضافة الطفل ستظهر نقاطه ونجومه ويمكنك ربطه بفصل المعلم.</p></div>}
        </section>
      </div>
    </main><footer><div className="wrap">أبو العزايم للحفظ الممتع • الأسرة ترى التقدم وتختار الرحلة المناسبة لكل طفل.</div></footer>
  </div>;
}