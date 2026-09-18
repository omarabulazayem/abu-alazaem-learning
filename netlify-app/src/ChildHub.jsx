import React,{useEffect,useMemo,useState} from "react";
import {getActiveChildId,getCurrentUser,getStudentWallet,hasChildModePin,listChildTaskAssignments,listChildren,listParentEnrollments,listRewardsToday,listVisibleSessions,setActiveChildId,verifyChildModePin} from "./api.js";
import Icon from "./Icon.jsx";
import {AppShell,Button,Card,CHILD_NAV,Hero,Section,go} from "./ui-v4.jsx";

export const CHILD_MODE_KEY="abu-alazaem-child-mode";
export function enterChildMode(){localStorage.setItem(CHILD_MODE_KEY,"1");window.dispatchEvent(new Event("abu-child-mode"));}
export function exitChildMode(){localStorage.removeItem(CHILD_MODE_KEY);window.dispatchEvent(new Event("abu-child-mode"));}
export function isChildModeActive(){return localStorage.getItem(CHILD_MODE_KEY)==="1";}

const worlds=[
  {path:"/memorize",title:"نحفظ",text:"خطوات قصيرة تناسبني",icon:"quran",tone:"sky"},
  {path:"/games",title:"نلعب",text:"مغامرات وألعاب تعليمية",icon:"game",tone:"lavender"},
  {path:"/review",title:"نراجع",text:"نثبت اللي حفظناه سوا",icon:"review",tone:"mint"},
];
const more=[
  {path:"/achievements",title:"جوائزي",text:"نجومي وميدالياتي",icon:"trophy",tone:"gold"},
  {path:"/challenges",title:"مهمتي",text:"مهمات اليوم",icon:"target",tone:"pink"},
  {path:"/room",title:"غرفتي",text:"ملخص رحلتي",icon:"room",tone:"sky"},
  {path:"/leaderboard",title:"ترتيبي",text:"مسابقة أسبوعية مع طلاب معلمي",icon:"medal",tone:"gold"},
];

export default function ChildHub(){
  const [user,setUser]=useState(undefined);const [child,setChild]=useState(null);const [wallet,setWallet]=useState({wallet_balance:0,lifetime_points:0});const [rewards,setRewards]=useState([]);const [tasks,setTasks]=useState([]);const [nextLesson,setNextLesson]=useState(null);const [showExit,setShowExit]=useState(false);const [pin,setPin]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  useEffect(()=>{enterChildMode();let alive=true;(async()=>{try{const current=await getCurrentUser();if(!alive)return;if(!current){exitChildMode();return go("/login");}if(current.accountType==="teacher"){exitChildMode();return go("/teacher");}
const pinReady=await hasChildModePin().catch(()=>false);
if(!pinReady){exitChildMode();return go("/family");}
setUser(current);const kids=await listChildren(current);if(!alive)return;const active=getActiveChildId();const selected=kids.find(k=>k.id===active)||kids[0]||null;if(selected&&selected.id!==active)setActiveChildId(selected.id);setChild(selected);if(!selected){setError("لا يوجد ملف طفل بعد. اطلب من ولي الأمر إضافة طفل أولًا.");return;}const to=new Date(Date.now()+60*86400000);const [today,walletState,taskRows,links,sessionRows]=await Promise.all([listRewardsToday(selected.id),getStudentWallet(selected.id),listChildTaskAssignments(selected.id),listParentEnrollments(),listVisibleSessions({from:new Date(),to})]);const childLinks=(links||[]).filter(e=>e.student_id===selected.id);const ids=new Set(childLinks.map(e=>e.id));const upcoming=(sessionRows||[]).filter(s=>ids.has(s.enrollment_id)&&s.status==="SCHEDULED"&&new Date(s.scheduled_start_utc)>=new Date()).sort((a,b)=>new Date(a.scheduled_start_utc)-new Date(b.scheduled_start_utc));const lesson=upcoming[0]||null;const lessonLink=lesson?childLinks.find(e=>e.id===lesson.enrollment_id):null;if(alive){setRewards(today||[]);setWallet(walletState||{wallet_balance:0,lifetime_points:0});setTasks(taskRows||[]);setNextLesson(lesson?{...lesson,teacherName:lessonLink?.workspace?.display_name||"المعلم",timezone:lessonLink?.workspace?.timezone||""}:null);}}catch(e){if(alive)setError(e.message||"تعذر فتح وضع الطفل.");}})();return()=>{alive=false;};},[]);
  const gameCount=useMemo(()=>{const ids=new Set();for(const r of rewards){if(r.source_type==="game_session")ids.add(r.source_key||String(ids.size));else if(["memory_game","surah_order_game","surah_quiz_game"].includes(r.source_type))ids.add(r.source_type);}return Math.min(3,ids.size);},[rewards]);
  async function verifyParent(e){e.preventDefault();setBusy(true);setError("");try{const ok=await verifyChildModePin(pin);if(!ok)throw new Error();exitChildMode();setPin("");go("/family");}catch{setError("الرقم السري غير صحيح. لا يمكن الخروج من وضع الطفل.");}finally{setBusy(false);}}
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز عالمك...</p></div>;
  const headerActions=<><div className="aa-child-score"><span><Icon name="star" size={17}/>{child?.stars||0}</span><span><Icon name="trophy" size={17}/>{wallet?.wallet_balance||0}</span></div><Button kind="secondary" icon="lock" onClick={()=>{setShowExit(true);setError("");}}>ولي الأمر</Button></>;
  return <AppShell mode="child" subtitle="عالمي الصغير" nav={CHILD_NAV} actions={headerActions} footer="أبو العزايم • خطوة صغيرة كل مرة.">
    <Hero eyebrow="جاهز لمغامرة جديدة؟" title={`أهلًا ${child?.display_name||"يا بطل"}`} description="اختار حاجة واحدة نعملها دلوقتي، والباقي موجود لما تحب." icon="sparkle" tone="pink" aside={<div className="aa-child-score"><span><Icon name="flame" size={18}/>{child?.streak||0} يوم</span><span><Icon name="trophy" size={18}/>{wallet?.lifetime_points||0} إجمالي</span></div>}/>
    {error&&<div className="msg error">{error}</div>}
    {!showExit&&child&&<>
      {nextLesson&&<Section eyebrow="الحصة القادمة" title="موعدك الجاي">
        <Card icon="clock" title={new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(nextLesson.scheduled_start_utc))} text={(nextLesson.teacherName||"المعلم")+(nextLesson.timezone?" • توقيت المعلم "+nextLesson.timezone:"")} tone="sky" badge="قادمة"/>
      </Section>}
      <Section eyebrow="الاختيارات الأساسية" title="هنعمل إيه دلوقتي؟" description="ثلاثة اختيارات كبيرة وواضحة بدون زحمة.">
        <div className="aa-world-grid">{worlds.map(w=><Card key={w.path} className="aa-world-card" icon={w.icon} title={w.title} text={w.path==="/games"&&gameCount?`${gameCount}/٣ ألعاب اليوم • ${w.text}`:w.text} tone={w.tone} action="يلا" onClick={()=>go(w.path)}/>)}</div>
      </Section>
      <Section eyebrow="حاجاتي" title="أماكن تانية">
        <div className="aa-mini-grid">{more.map(item=>{const openTasks=tasks.filter(t=>t.status==="assigned"||t.status==="rejected").length;const text=item.path==="/challenges"&&openTasks?openTasks+" مهمة محتاجة شغل":item.text;return <Card key={item.path} icon={item.icon} title={item.title} text={text} tone={item.tone} badge={item.path==="/challenges"&&openTasks?String(openTasks):undefined} onClick={()=>go(item.path)}/>;})}</div>
        <button className="aa-daily" onClick={()=>go("/games")}><span><Icon name={gameCount===3?"circleCheck":"rocket"} size={28}/></span><span className="aa-daily-copy"><small>مغامرة اليوم</small><b>{gameCount===3?"برافو! خلصت ألعاب اليوم":"نكمل لعبة كمان؟"}</b></span><span className="aa-dots">{[0,1,2].map(i=><i key={i} className={i<gameCount?"is-done":""}/>)}</span></button>
      </Section>
    </>}
    {showExit&&<Section eyebrow="للكبار فقط" title="منطقة ولي الأمر" description="أدخل الرقم السري المكوّن من 4 أرقام للعودة إلى حساب الأسرة."><div className="aa-learning-card" style={{maxWidth:520,margin:"0 auto"}}><form className="aa-form" onSubmit={verifyParent}><label>الرقم السري لولي الأمر<input type="password" inputMode="numeric" pattern="[0-9]{4}" minLength="4" maxLength="4" autoFocus autoComplete="off" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} required/></label><Button type="submit" disabled={busy} className="full">{busy?"جارٍ التحقق...":"التحقق والخروج"}</Button><Button kind="ghost" onClick={()=>{setShowExit(false);setPin("");setError("");}}>ارجع لعالمي</Button></form></div></Section>}
  </AppShell>;
}
