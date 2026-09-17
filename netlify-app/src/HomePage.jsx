import React,{useEffect,useMemo,useState} from "react";
import Icon from "./Icon.jsx";
import {getActiveChildId,getCurrentUser,listChildren,setActiveChildId,signOut} from "./api.js";
import {DEFAULT_HOME_CONTENT,DEFAULT_MAIN_NAV,loadHomeContent} from "./siteContent.js";
import {AppShell,Button,Card,Section,go} from "./ui-v4.jsx";

const mainRoutes=new Set(["/memorize","/games","/review"]);
const meta={
  "/memorize":{label:"نحفظ",icon:"quran",tone:"sky",text:"جلسة قصيرة وواضحة كل مرة."},
  "/games":{label:"نلعب",icon:"game",tone:"lavender",text:"ألعاب تعليمية مرتبطة بما يتعلمه الطفل."},
  "/review":{label:"نراجع",icon:"review",tone:"mint",text:"نثبت المحفوظ بخطوات بسيطة ومنتظمة."},
};

export default function HomePage(){
  const [user,setUser]=useState(undefined);const [child,setChild]=useState(null);const [content,setContent]=useState({...DEFAULT_HOME_CONTENT,navigation:DEFAULT_MAIN_NAV});
  useEffect(()=>{let alive=true;(async()=>{const [current,editorial]=await Promise.all([getCurrentUser().catch(()=>null),loadHomeContent("ar").catch(()=>({...DEFAULT_HOME_CONTENT,navigation:DEFAULT_MAIN_NAV}))]);if(!alive)return;setUser(current);setContent(editorial);if(!current||current.accountType==="teacher")return;const kids=await listChildren(current).catch(()=>[]);if(!alive)return;const active=getActiveChildId();const selected=kids.find(k=>k.id===active)||kids[0]||null;if(selected&&selected.id!==active)setActiveChildId(selected.id);setChild(selected);})();return()=>{alive=false;};},[]);
  const teacher=user?.accountType==="teacher";
  const nav=useMemo(()=>(content.navigation||DEFAULT_MAIN_NAV).slice(0,7).map(item=>({path:item.url||"/",label:item.label,icon:item.icon||"arrow"})),[content]);
  const sections=content.sections||DEFAULT_HOME_CONTENT.sections;
  const primary=sections.filter(x=>mainRoutes.has(x.route));
  const secondary=sections.filter(x=>!mainRoutes.has(x.route)).slice(0,5);
  const hero=content.hero||DEFAULT_HOME_CONTENT.hero;
  const assetBase=window.__ABU_ASSET_BASE__||"/";
  const accountLabel=!user?"تسجيل الدخول":teacher?"لوحة المعلم":"حساب الأسرة";
  async function logout(){await signOut();setUser(null);setChild(null);}
  const actions=<>{child&&<span className="aa-child-name">{child.display_name}</span>}<Button kind="secondary" icon={user?"user":"login"} onClick={()=>go(!user?"/login":teacher?"/teacher":"/family")}>{accountLabel}</Button>{user&&<Button kind="ghost" icon="logout" onClick={logout}>خروج</Button>}</>;
  const heading=child||teacher?"نبدأ منين النهارده؟":content.sectionsHeading?.title||"كل ما يحتاجه الطفل في مكان واحد";
  const sub=child||teacher?"ثلاثة مسارات أساسية، والباقي موجود بدون زحمة.":content.sectionsHeading?.description;
  return <AppShell mode="public" subtitle="للحفظ الممتع" nav={teacher?[]:nav} hideNav={teacher} actions={actions} footer={content.footer?.description||"منصة عربية للحفظ والمراجعة والألعاب والمتابعة."}>
    <section className="aa-home-hero">
      <div className="aa-home-copy"><span className="aa-eyebrow"><Icon name="sparkle" size={17}/>{child?`أهلًا ${child.display_name}`:teacher?"معاينة تجربة الطفل":hero.eyebrow}</span><h1>{child||teacher?<>رحلة قرآن <strong>أبسط وأمتع</strong> للطفل</>:<>{hero.title}</>}</h1><p>{child||teacher?"واجهة واضحة للصغار: حفظ، لعب، مراجعة، وتقدم يظهر بدون تشتيت.":hero.description}</p><div className="aa-home-actions"><Button icon="arrow" onClick={()=>go(teacher?"/games":user?"/child":"/login")}>{child?"ادخل عالمي":teacher?"معاينة الألعاب":hero.primaryLabel}</Button><Button kind="secondary" icon="quran" onClick={()=>go("/quran")}>{hero.secondaryLabel||"القرآن"}</Button></div></div>
      <div className="aa-home-art"><img src={`${assetBase}assets/hero-kids.webp`} alt="طفلان مع المصحف في مشهد تعليمي ملوّن"/></div>
    </section>
    <Section eyebrow={child||teacher?"اختيار واحد في كل مرة":content.sectionsHeading?.eyebrow} title={heading} description={sub}>
      <div className="aa-home-feature-grid">{primary.map(item=>{const m=meta[item.route]||{label:item.title,icon:item.icon||"quran",tone:"sky",text:item.subtitle};return <Card key={item.route} icon={m.icon} title={child||teacher?m.label:item.title} text={child||teacher?m.text:item.subtitle} tone={m.tone} action="ابدأ" onClick={()=>go(item.route)}/>;})}</div>
    </Section>
    <Section eyebrow="أماكن إضافية" title="كل شيء قريب لما تحتاجه">
      <div className="aa-mini-grid">{secondary.map(item=><Card key={`${item.route}-${item.title}`} icon={item.icon||"sparkle"} title={item.title} text={item.subtitle} onClick={()=>go(item.route)} action="افتح"/>)}</div>
    </Section>
  </AppShell>;
}
