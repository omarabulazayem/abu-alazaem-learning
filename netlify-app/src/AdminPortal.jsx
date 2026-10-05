import React,{useEffect,useMemo,useState} from "react";
import {getCurrentUser,listSaasPlans,listTeacherSubscriptions,setTeacherSubscriptionManual,signOut,upsertSaasPlan} from "./api.js";
import {AppShell,Button,Empty,Hero,Section,go} from "./ui-v4.jsx";
import Icon from "./Icon.jsx";

const emptyForm={id:"",code:"",nameAr:"",descriptionAr:"",currency:"EGP",monthlyPrice:"",yearlyPrice:"",active:true,sortOrder:0};
const manualEmpty={workspaceId:"",planId:"",endAt:"",reason:""};

function Loading(){return <div className="center"><i className="spinner"/><p>جارٍ تجهيز إدارة المنصة...</p></div>;}
function ErrorBox({text}){return text?<div className="msg error">{text}</div>:null;}
function money(value,currency){return new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(value||0))+" "+(currency||"EGP");}

export default function AdminPortal(){
  const [user,setUser]=useState(undefined),[plans,setPlans]=useState([]),[subscriptions,setSubscriptions]=useState([]),[form,setForm]=useState(emptyForm),[manual,setManual]=useState(manualEmpty),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[error,setError]=useState("");

  async function load(){
    setLoading(true);
    try{const [planRows,subscriptionRows]=await Promise.all([listSaasPlans(true),listTeacherSubscriptions()]);setPlans(planRows||[]);setSubscriptions(subscriptionRows||[]);setError("");}
    catch(e){setError(e.message||"تعذر تحميل خطط الاشتراك.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{let alive=true;(async()=>{try{
    const current=await getCurrentUser();
    if(!alive)return;
    if(!current)return go("/login");
    if(current.accountType!=="admin")return go(current.accountType==="teacher"?"/teacher":"/family");
    setUser(current);await load();
  }catch(e){if(alive){setError(e.message||"تعذر التحقق من حساب الإدارة.");setLoading(false);}}})();return()=>{alive=false;};},[]);

  const activePlans=useMemo(()=>plans.filter(p=>p.active),[plans]);
  function edit(plan){
    setForm({
      id:plan.id,code:plan.code,nameAr:plan.name_ar||"",descriptionAr:plan.description_ar||"",
      currency:plan.currency||"EGP",monthlyPrice:plan.monthly_price??"",yearlyPrice:plan.yearly_price??"",
      active:plan.active!==false,sortOrder:plan.sort_order||0
    });
    setMessage("");setError("");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function reset(){setForm(emptyForm);setMessage("");setError("");}
  async function save(e){
    e.preventDefault();setBusy(true);setMessage("");setError("");
    try{
      await upsertSaasPlan(form);
      setMessage(form.id?"تم تحديث الخطة.":"تم إنشاء الخطة.");
      setForm(emptyForm);
      await load();
    }catch(e){setError(e.message||"تعذر حفظ الخطة.");}
    finally{setBusy(false);}
  }
  async function activateManual(e){
    e.preventDefault();
    if(!manual.workspaceId||!manual.planId||!manual.reason.trim()){setError("اختر المعلم والخطة واكتب سبب التفعيل اليدوي.");return;}
    setBusy(true);setMessage("");setError("");
    try{
      await setTeacherSubscriptionManual(manual.workspaceId,manual.planId,manual.endAt?new Date(manual.endAt).toISOString():null,manual.reason);
      setManual(manualEmpty);setMessage("تم تسجيل التفعيل اليدوي مع سبب واضح في سجل التدقيق.");await load();
    }catch(e){setError(e.message||"تعذر تسجيل التفعيل اليدوي.");}
    finally{setBusy(false);}
  }
  async function logout(){await signOut();go("/");}

  if(user===undefined||loading&&!user)return <Loading/>;

  return <AppShell mode="admin" subtitle="إدارة المنصة" nav={[{path:"/admin",label:"الخطط",icon:"chart"}]} actions={<><span style={{fontSize:12,fontWeight:900}}>{user?.name||"الإدارة"}</span><Button kind="ghost" icon="logout" onClick={logout}>خروج</Button></>}>
    <Hero eyebrow="SaaS Administration" title="خطط اشتراك المعلمين" description="تعريف الخطط وأسعارها وحالتها محفوظ هنا بصورة مستقلة عن مزود الدفع. ربط بوابة الدفع يأتي لاحقًا عبر عقد الأحداث نفسه." icon="chart" tone="gold"/>
    {message&&<div className="msg ok">{message}</div>}<ErrorBox text={error}/>
    <div className="aa-dashboard-grid">
      <aside className="aa-form-card">
        <h3 style={{marginTop:0}}>{form.id?"تعديل خطة":"إضافة خطة"}</h3>
        <form className="aa-form" onSubmit={save}>
          <label>رمز الخطة<input value={form.code} onChange={e=>setForm(v=>({...v,code:e.target.value.toLowerCase()}))} pattern="[a-z0-9][a-z0-9_-]{1,63}" required placeholder="starter"/></label>
          <label>اسم الخطة<input value={form.nameAr} onChange={e=>setForm(v=>({...v,nameAr:e.target.value}))} maxLength="120" required placeholder="الخطة الأساسية"/></label>
          <label>الوصف<input value={form.descriptionAr} onChange={e=>setForm(v=>({...v,descriptionAr:e.target.value}))} maxLength="300" placeholder="وصف مختصر"/></label>
          <label>العملة<input value={form.currency} onChange={e=>setForm(v=>({...v,currency:e.target.value.toUpperCase()}))} maxLength="3" required/></label>
          <label>السعر الشهري<input type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={e=>setForm(v=>({...v,monthlyPrice:e.target.value}))} required/></label>
          <label>السعر السنوي<input type="number" min="0" step="0.01" value={form.yearlyPrice} onChange={e=>setForm(v=>({...v,yearlyPrice:e.target.value}))} placeholder="اختياري"/></label>
          <label>ترتيب الظهور<input type="number" min="0" step="1" value={form.sortOrder} onChange={e=>setForm(v=>({...v,sortOrder:e.target.value}))}/></label>
          <label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={form.active} onChange={e=>setForm(v=>({...v,active:e.target.checked}))}/> الخطة متاحة</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button type="submit" disabled={busy} icon="circleCheck">{busy?"جارٍ الحفظ...":form.id?"حفظ التعديلات":"إنشاء الخطة"}</Button>{form.id&&<Button kind="secondary" type="button" onClick={reset}>إلغاء التعديل</Button>}</div>
        </form>
      </aside>
      <section>
        <Section eyebrow="Plans" title={activePlans.length+" خطة متاحة"}>
          {plans.length?<div className="aa-person-list">{plans.map(plan=><article className="aa-person-card" key={plan.id}>
            <div className="aa-person-head"><span className="aa-avatar"><Icon name={plan.active?"circleCheck":"close"} size={24}/></span><div>
              <b>{plan.name_ar}</b><small>{plan.code} • شهريًا {money(plan.monthly_price,plan.currency)}{plan.yearly_price!=null?" • سنويًا "+money(plan.yearly_price,plan.currency):""}</small>
            </div></div>
            {plan.description_ar&&<p style={{fontSize:12,margin:"8px 0",color:"var(--aa-muted)"}}>{plan.description_ar}</p>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}><strong>{plan.active?"متاحة":"موقوفة"}</strong><Button kind="secondary" onClick={()=>edit(plan)}>تعديل</Button></div>
          </article>)}</div>:<Empty icon="chart" title="لم تُنشأ خطط بعد" text="أنشئ أول خطة من النموذج لتصبح جاهزة للربط ببوابة الدفع."/>}
        </Section>
        <Section eyebrow="Teacher subscriptions" title={subscriptions.length+" اشتراكات مسجلة"}>
          {subscriptions.length?<div className="aa-table-list">{subscriptions.map(row=><article className="aa-table-row" key={row.id}>
            <span><Icon name={row.status==="ACTIVE"||row.status==="MANUAL"?"circleCheck":"chart"} size={21}/></span>
            <div><b>{row.workspace?.display_name||"مساحة معلم"}</b><small>{row.plan?.name_ar||"بدون خطة"} • الحالة: {row.status} • آخر تحديث: {money(0,"")}<span style={{marginInlineStart:6}}>{new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium"}).format(new Date(row.updated_at))}</span></small></div>
            <strong>{row.provider||"—"}</strong>
            <Button kind="ghost" onClick={()=>setManual({workspaceId:row.workspace_id,planId:row.plan_id||plans.find(p=>p.active)?.id||"",endAt:row.current_period_end?new Date(row.current_period_end).toISOString().slice(0,16):"",reason:""})}>تفعيل يدوي</Button>
          </article>)}</div>:<Empty icon="teacher" title="لا توجد اشتراكات مسجلة بعد"/>}
        </Section>
        <Section eyebrow="Exceptional support" title="تفعيل يدوي لمعلم" description="هذا مسار استثنائي للدعم أو العقود الخاصة، وليس بديلًا عن الدفع الإلكتروني." className="aa-form-card">
          <form className="aa-form" onSubmit={activateManual}>
            <label>مساحة المعلم<select value={manual.workspaceId} onChange={e=>setManual(v=>({...v,workspaceId:e.target.value}))} required>
              <option value="">اختر المعلم</option>
              {subscriptions.map(row=><option key={row.workspace_id} value={row.workspace_id}>{row.workspace?.display_name||row.workspace_id}</option>)}
            </select></label>
            <label>الخطة<select value={manual.planId} onChange={e=>setManual(v=>({...v,planId:e.target.value}))} required>
              <option value="">اختر الخطة</option>
              {plans.map(plan=><option key={plan.id} value={plan.id}>{plan.name_ar} • {money(plan.monthly_price,plan.currency)}/شهر</option>)}
            </select></label>
            <label>نهاية الفترة (اختياري)<input type="datetime-local" value={manual.endAt} onChange={e=>setManual(v=>({...v,endAt:e.target.value}))}/></label>
            <label>سبب التفعيل<textarea rows="2" maxLength="300" value={manual.reason} onChange={e=>setManual(v=>({...v,reason:e.target.value}))} required placeholder="مثال: عقد خاص أو تفعيل دعم استثنائي"/></label>
            <Button type="submit" disabled={busy} icon="circleCheck">حفظ التفعيل اليدوي</Button>
          </form>
        </Section>
        <Section eyebrow="Payment gateway" title="عقد الربط جاهز" description="أحداث الاشتراك تحفظ provider/event identity وتمنع تكرار معالجة Webhook نفسه. لا يتم تفعيل أو إيقاف اشتراك حقيقي من هذه الصفحة قبل ربط مزود دفع.">
          <div className="aa-card-grid"><article className="aa-card aa-card-sky"><h3>Provider-neutral</h3><p>يمكن إضافة بوابة محلية أو عالمية دون تغيير نموذج الاشتراك أو لوحة المعلم.</p></article><article className="aa-card aa-card-mint"><h3>Webhook-safe</h3><p>كل حدث خارجي له معرف فريد، وسجل أحداث مستقل، وتحديث اشتراك قابل للتتبع.</p></article></div>
        </Section>
      </section>
    </div>
  </AppShell>;
}
