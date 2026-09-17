import React, { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { getCurrentUser, requestPasswordReset, signIn, signUp, updatePassword } from "./api.js";

function routePath(){return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;}
function go(path){if(routePath()!==path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}}

export default function LoginPage(){
  const [user,setUser]=useState(undefined);
  const [mode,setMode]=useState("login");
  const [role,setRole]=useState("parent");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [childName,setChildName]=useState("");
  const [ageBand,setAgeBand]=useState("7-9");
  const [ageYears,setAgeYears]=useState(8);
  const [gender,setGender]=useState("unspecified");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{let alive=true;(async()=>{try{const current=await getCurrentUser();if(!alive)return;setUser(current);if(current)setMode("update");}catch(e){if(alive){setUser(null);setError(e.message||"تعذر التحقق من الحساب.");}}})();return()=>{alive=false;};},[]);

  function changeMode(next){setMode(next);setMessage("");setError("");setPassword("");}
  async function submit(event){
    event.preventDefault();setBusy(true);setMessage("");setError("");
    try{
      if(mode==="login"){
        const current=await signIn(email,password);setUser(current);go(current.accountType==="teacher"?"/teacher":"/family");
      }else if(mode==="signup"){
        const result=await signUp({email,password,displayName:name,accountType:role,childName,childAgeBand:ageBand,childAgeYears:Number(ageYears),childGender:gender});
        if(result.sessionCreated){const current=await getCurrentUser();setUser(current);go(role==="teacher"?"/teacher":"/family");}
        else{setMessage("تم إنشاء الحساب. تحقق من بريدك ثم سجل الدخول.");changeMode("login");}
      }else if(mode==="recover"){
        await requestPasswordReset(email);setMessage("أرسلنا رابط استعادة كلمة المرور إلى بريدك. افتحه من نفس المتصفح ثم اختر كلمة مرور جديدة.");
      }else{
        await updatePassword(password);setMessage("تم تغيير كلمة المرور بنجاح.");const current=await getCurrentUser();setUser(current);
      }
    }catch(e){setError(e.message||"تعذر تنفيذ الطلب.");}
    finally{setBusy(false);}
  }

  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز الحساب...</p></div>;
  const heading=mode==="login"?"أهلًا بعودتك":mode==="signup"?"ابدأ رحلة التعلم":mode==="recover"?"استعادة كلمة المرور":"اختَر كلمة مرور جديدة";
  const description=mode==="login"?"ادخل إلى حساب الأسرة أو لوحة المعلم وتابع التقدم من المكان الذي توقفت عنده.":mode==="signup"?"أنشئ حسابًا واحدًا للأسرة أو المعلم، ثم أضف الأطفال واربطهم بالفصول.":mode==="recover"?"سنرسل رابط الاستعادة إلى بريدك المسجل.":"اكتب كلمة مرور قوية ثم ارجع إلى حسابك.";

  return <div className="login-page" dir="rtl">
    <header className="login-topbar"><button className="login-brand" onClick={()=>go("/")}><span><Icon name="mosque" size={25}/></span><div><b>أبو العزايم</b><small>للحفظ الممتع</small></div></button><button className="secondary" onClick={()=>go("/")}><Icon name="home" size={17}/> الرئيسية</button></header>
    <main className="login-layout">
      <section className="login-visual" aria-label="تعلم القرآن"><div className="login-visual-copy"><span>منصة تعلم أسرية</span><h1>حفظ ومراجعة وفهم القرآن في تجربة واحدة منظمة</h1><p>حسابات الأسرة والمعلم، تقدم الطفل، الألعاب والمراجعة تعمل من نفس المنصة.</p></div></section>
      <section className="login-card">
        <div className="login-heading"><span className="login-icon"><Icon name={mode==="recover"?"shield":mode==="signup"?"users":"login"} size={26}/></span><div><h2>{heading}</h2><p>{description}</p></div></div>
        {!user&&mode!=="recover"&&<div className="login-tabs"><button className={mode==="login"?"active":""} onClick={()=>changeMode("login")}>تسجيل الدخول</button><button className={mode==="signup"?"active":""} onClick={()=>changeMode("signup")}>حساب جديد</button></div>}
        {mode==="signup"&&<div className="login-role"><button className={role==="parent"?"active":""} onClick={()=>setRole("parent")}><Icon name="users" size={18}/> ولي أمر</button><button className={role==="teacher"?"active":""} onClick={()=>setRole("teacher")}><Icon name="teacher" size={18}/> معلم</button></div>}
        <form onSubmit={submit} className="login-form">
          {mode==="signup"&&<label>الاسم<input value={name} onChange={e=>setName(e.target.value)} placeholder={role==="teacher"?"اسم المعلم":"اسم ولي الأمر"} required/></label>}
          {mode!=="update"&&<label>البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" required/></label>}
          {(mode==="login"||mode==="signup"||mode==="update")&&<label>{mode==="update"?"كلمة المرور الجديدة":"كلمة المرور"}<input type="password" minLength="6" autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} required/></label>}
          {mode==="signup"&&role==="parent"&&<div className="login-child-fields"><label>اسم الطفل<input value={childName} onChange={e=>setChildName(e.target.value)} required/></label><label>العمر<input type="number" min="3" max="18" value={ageYears} onChange={e=>setAgeYears(e.target.value)} required/></label><label>الفئة<select value={ageBand} onChange={e=>setAgeBand(e.target.value)}><option value="3-6">٣–٦ سنوات</option><option value="7-9">٧–٩ سنوات</option><option value="10-12">١٠–١٢ سنة</option></select></label><label>الجنس<select value={gender} onChange={e=>setGender(e.target.value)}><option value="unspecified">غير محدد</option><option value="male">ولد</option><option value="female">بنت</option></select></label></div>}
          {error&&<div className="msg error">{error}</div>}{message&&<div className="msg ok">{message}</div>}
          <button className="primary full" disabled={busy}>{busy?"جارٍ التنفيذ...":mode==="login"?"تسجيل الدخول":mode==="signup"?"إنشاء الحساب":mode==="recover"?"إرسال رابط الاستعادة":"حفظ كلمة المرور"}</button>
        </form>
        {!user&&mode==="login"&&<button className="link" onClick={()=>changeMode("recover")}>نسيت كلمة المرور؟</button>}
        {!user&&mode==="recover"&&<button className="link" onClick={()=>changeMode("login")}>العودة لتسجيل الدخول</button>}
        {user&&mode==="update"&&<button className="link" onClick={()=>go(user.accountType==="teacher"?"/teacher":"/family")}>العودة إلى حسابي</button>}
      </section>
    </main>
  </div>;
}
