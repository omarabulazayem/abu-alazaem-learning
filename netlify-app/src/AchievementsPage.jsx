import React,{useEffect,useState} from "react";
import {getActiveChildId,getCurrentUser,listAchievements,listChildren,signOut} from "./api.js";
import {isChildModeActive} from "./ChildHub.jsx";
import {AppShell,Button,Card,CHILD_NAV,FAMILY_NAV,Hero,Metric,Ring,Section,go} from "./ui-v4.jsx";

const badges=[
  ["first_steps","sparkle","البداية الجميلة","ابدأ أول نشاط في الرحلة","mint"],["first_memorization","quran","أول حفظ","أكمل أول جلسة حفظ","sky"],["first_surah","star","أول سورة","أتم حفظ سورة كاملة","gold"],["five_surahs","mosque","خمس سور","أتم حفظ خمس سور كاملة","mint"],["first_review","review","مراجع صغير","أكمل أول مراجعة","sky"],["game_engine_player","game","أول لعبة مسجلة","أكمل أول لعبة تعليمية","lavender"],["memory_player","brain","بطل الذاكرة","أكمل لعبة الذاكرة","lavender"],["surah_order_master","puzzle","خبير ترتيب السور","أكمل لعبة ترتيب السور","gold"],["surah_quiz_star","bolt","نجم اختبار السور","اجتز اختبار السور بنجاح","lavender"],["hundred_points","star","١٠٠ نقطة","اجمع ١٠٠ نقطة","gold"],["five_hundred_points","medal","٥٠٠ نقطة","اجمع ٥٠٠ نقطة","pink"],["three_day_streak","flame","٣ أيام متواصلة","حافظ على نشاطك ٣ أيام","pink"],["seven_day_streak","trophy","أسبوع كامل","حافظ على نشاطك ٧ أيام","gold"]
];

export default function AchievementsPage(){
  const [user,setUser]=useState(undefined),[child,setChild]=useState(null),[items,setItems]=useState([]),[error,setError]=useState("");
  useEffect(()=>{let alive=true;(async()=>{try{const current=await getCurrentUser();if(!alive)return;if(!current)return go("/login");if(current.accountType==="teacher")return go("/teacher");setUser(current);const kids=await listChildren(current);if(!alive)return;const selected=kids.find(k=>k.id===getActiveChildId())||kids[0]||null;setChild(selected);if(!selected){setError("أضف طفلًا أولًا من حساب الأسرة.");return;}const unlocked=await listAchievements(selected.id);if(alive)setItems(unlocked||[]);}catch(e){if(alive)setError(e.message||"تعذر تحميل الإنجازات.");}})();return()=>{alive=false;};},[]);
  if(user===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تحميل الإنجازات...</p></div>;
  const childMode=isChildModeActive();const unlocked=new Set(items.map(i=>i.slug));const count=badges.filter(([slug])=>unlocked.has(slug)).length;const completion=badges.length?Math.round(count/badges.length*100):0;
  async function logout(){await signOut();go("/");}
  return <AppShell mode={childMode?"child":"family"} subtitle="الإنجازات" nav={childMode?CHILD_NAV:FAMILY_NAV} actions={!childMode?<Button kind="ghost" icon="logout" onClick={logout}>خروج</Button>:null} footer="أبو العزايم • كل خطوة صغيرة تستحق الاحتفال.">
    <Hero eyebrow="سجل الإنجازات" title={`ميداليات ${child?.display_name||"الرحلة"}`} description="الميداليات تفتح من نشاط حقيقي محفوظ، مش من ضغط أو مقارنة." icon="medal" tone="gold" aside={<Ring value={completion} label="مكتمل"/>}/>
    {error&&<div className="msg error">{error}</div>}
    <div className="aa-metrics"><Metric icon="circleCheck" label="مفتوحة" value={count} tone="mint"/><Metric icon="lock" label="متبقية" value={badges.length-count} tone="lavender"/><Metric icon="target" label="نسبة الإنجاز" value={`${completion}%`} tone="gold"/><Metric icon="star" label="نجوم الطفل" value={child?.stars||0} tone="sky"/></div>
    <Section eyebrow="الميداليات" title="رحلتي لحد دلوقتي" description="المقفول يفضل ظاهر عشان الطفل يعرف إن فيه حاجات جاية بدون ما يتحول الموضوع لدرجات.">
      <div className="aa-badge-grid">{badges.map(([slug,icon,title,text,tone])=>{const won=unlocked.has(slug);const record=items.find(i=>i.slug===slug);return <Card key={slug} className={`aa-badge ${won?"":"is-locked"}`} icon={won?icon:"lock"} title={title} text={text} tone={tone} badge={won?(record?.unlocked_at?`فُتحت ${new Date(record.unlocked_at).toLocaleDateString("ar-EG")}`:"تم الفتح"):"لسه"}/>;})}</div>
    </Section>
    <Section><div style={{display:"flex",justifyContent:"center",gap:9,flexWrap:"wrap"}}><Button kind="secondary" icon="game" onClick={()=>go("/games")}>الألعاب</Button><Button icon="target" onClick={()=>go("/challenges")}>مهمات اليوم</Button></div></Section>
  </AppShell>;
}
