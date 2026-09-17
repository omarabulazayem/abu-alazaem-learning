import React, { useEffect, useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import { getActiveChildId,getCurrentUser,listChildren,setActiveChildId,signOut } from "./api.js";
import { DEFAULT_HOME_CONTENT, DEFAULT_MAIN_NAV, loadHomeContent } from "./siteContent.js";

function routePath(){return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;}
function navigate(path){if(routePath()!==path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}}
function BrandMark({brand}){return <button className="homeBrand" onClick={()=>navigate("/")}><span className="homeBrandIcon"><Icon name="mosque" size={31}/></span><span><b>{brand.title}</b><small>{brand.subtitle}</small></span></button>;}
function HeroTitle({title,highlight}){if(!highlight||!String(title).includes(highlight))return <>{title}</>;const [before,...rest]=String(title).split(highlight);return <>{before}<strong>{highlight}</strong>{rest.join(highlight)}</>;}

const primaryRoutes=new Set(["/memorize","/games","/review"]);
const worldMeta={
  "/memorize":{tone:"memorize",label:"نحفظ",icon:"quran",companion:"star"},
  "/games":{tone:"play",label:"نلعب",icon:"game",companion:"gift"},
  "/review":{tone:"review",label:"نراجع",icon:"review",companion:"sparkle"},
};

function WorldArt({meta}){return <span className={`home-world-art ${meta.tone}`} aria-hidden="true"><span className="home-world-main"><Icon name={meta.icon} size={49}/></span><span className="home-world-friend"><Icon name={meta.companion} size={20}/></span></span>;}

export default function HomePage(){
  const [user,setUser]=useState(undefined);
  const [child,setChild]=useState(null);
  const [menuOpen,setMenuOpen]=useState(false);
  const [content,setContent]=useState({...DEFAULT_HOME_CONTENT,navigation:DEFAULT_MAIN_NAV});

  useEffect(()=>{let alive=true;(async()=>{
    const [current,editorial]=await Promise.all([
      getCurrentUser().catch(()=>null),
      loadHomeContent("ar").catch(()=>({...DEFAULT_HOME_CONTENT,navigation:DEFAULT_MAIN_NAV}))
    ]);
    if(!alive)return;
    setContent(editorial);setUser(current);
    if(!current||current.accountType==="teacher")return;
    const kids=await listChildren(current).catch(()=>[]);if(!alive)return;
    const activeId=getActiveChildId();const selected=kids.find(k=>k.id===activeId)||kids[0]||null;
    if(selected&&selected.id!==activeId)setActiveChildId(selected.id);setChild(selected);
  })();return()=>{alive=false;};},[]);

  const isTeacher=user?.accountType==="teacher";
  const accountLabel=useMemo(()=>!user?"تسجيل الدخول":isTeacher?"لوحة المعلم":"حساب الأسرة",[user,isTeacher]);
  async function logout(){await signOut();setUser(null);setChild(null);}
  function openAccount(){if(!user)return navigate("/login");navigate(isTeacher?"/teacher":"/family");}

  const navigation=content.navigation||DEFAULT_MAIN_NAV;
  const hero=content.hero||DEFAULT_HOME_CONTENT.hero;
  const sections=content.sections||DEFAULT_HOME_CONTENT.sections;
  const heading=content.sectionsHeading||DEFAULT_HOME_CONTENT.sectionsHeading;
  const promise=content.promise||DEFAULT_HOME_CONTENT.promise;
  const footer=content.footer||DEFAULT_HOME_CONTENT.footer;
  const primarySections=sections.filter(item=>primaryRoutes.has(item.route));
  const secondarySections=sections.filter(item=>!primaryRoutes.has(item.route));
  const childPreview=Boolean(child)||isTeacher;
  const activeHero=childPreview?{
    eyebrow:child?`أهلًا ${child.display_name}`:"معاينة تجربة الطفل",
    title:"جاهز لمغامرة جديدة؟",
    highlight:"مغامرة",
    description:"اختار خطوة واحدة: نحفظ، نلعب، أو نراجع. كل جولة قصيرة وواضحة ومناسبة للأطفال الصغار.",
    primaryLabel:isTeacher?"معاينة الألعاب":"ادخل عالمي",
    secondaryLabel:"افتح القرآن",secondaryRoute:"/quran"
  }:hero;
  const primaryRoute=isTeacher?"/games":user?"/child":"/login";
  const assetBase=import.meta.env.BASE_URL||"/";

  return <div className={`homeV2 ${isTeacher?"teacher-home-preview":""}`} dir="rtl">
    <header className="homeHeader"><div className="homeHeaderInner">
      <BrandMark brand={content.brand||DEFAULT_HOME_CONTENT.brand}/>
      {!isTeacher&&<nav className={menuOpen?"homeNav open":"homeNav"}>{navigation.map(item=><button key={`${item.url}:${item.label}`} className={item.url==="/"?"active":""} onClick={()=>{navigate(item.url||"/");setMenuOpen(false);}}><Icon name={item.icon||"arrow"} size={21}/><span>{item.label}</span></button>)}</nav>}
      <div className="homeAccountArea">
        {child&&<div className="homeScore"><Icon name="star" size={18}/><b>{child.points||0}</b><span>نقطة</span></div>}
        <button className="homeAccount" onClick={openAccount}><Icon name={user?"user":"login"} size={19}/><span>{accountLabel}</span></button>
        {user&&<button className="homeLogout" onClick={logout} aria-label="تسجيل الخروج"><Icon name="logout" size={18}/></button>}
        {!isTeacher&&<button className="homeMenu" onClick={()=>setMenuOpen(v=>!v)} aria-label="فتح القائمة"><Icon name={menuOpen?"close":"menu"} size={22}/></button>}
      </div>
    </div></header>

    <main>
      <section className="homeHeroWrap"><div className="homeHero">
        <div className="homeHeroCopy">
          <span className="homeEyebrow"><Icon name="sparkle" size={16}/>{activeHero.eyebrow}</span>
          <h1><HeroTitle title={activeHero.title} highlight={activeHero.highlight}/></h1>
          <p>{activeHero.description}</p>
          <div className="homeHeroActions"><button className="homePrimary" onClick={()=>navigate(primaryRoute)}>{activeHero.primaryLabel}<Icon name="arrow" size={18}/></button><button className="homeGhost" onClick={()=>navigate(activeHero.secondaryRoute||"/quran")}><Icon name="quran" size={19}/>{activeHero.secondaryLabel}</button></div>
          {child&&<div className="homeChildStrip"><span className="homeChildAvatar"><Icon name="child" size={22}/></span><div><small>بطل الرحلة</small><b>{child.display_name}</b></div><div className="homeChildMetric"><strong>{child.stars||0}</strong><span>نجمة</span></div><div className="homeChildMetric"><strong>{child.streak||0}</strong><span>يوم متواصل</span></div></div>}
        </div>
        <div className="homeHeroVisual"><img src={`${assetBase}assets/hero-kids.webp?v=4`} alt="طفلان مع المصحف في عالم تعليمي مرح" onError={e=>{e.currentTarget.style.display="none";}}/></div>
      </div></section>

      <section className="homeSections home-worlds-section">
        <div className="homeSectionHeading"><span>{childPreview?"اختار عالمك":heading.eyebrow}</span><h2>{childPreview?"نبدأ منين النهارده؟":heading.title}</h2><p>{childPreview?"ثلاث خطوات رئيسية واضحة. والباقي موجود بدون زحمة.":heading.description}</p></div>
        <div className="homeWorldGrid">{primarySections.map(item=>{const meta=worldMeta[item.route]||{tone:"memorize",label:item.title,icon:item.icon||"quran",companion:"star"};return <button key={`${item.route}:${item.title}`} className={`home-world-card ${meta.tone}`} onClick={()=>navigate(item.route)}><WorldArt meta={meta}/><span className="home-world-copy"><b>{childPreview?meta.label:item.title}</b><small>{item.subtitle}</small></span><span className="home-world-go">يلا <Icon name="arrow" size={17}/></span></button>;})}</div>

        <div className="homeMoreWorlds"><div className="home-more-heading"><span>أماكن إضافية</span><h3>{childPreview?"حاجاتك وجوائزك":"استكشف أكثر"}</h3></div><div className="homeMiniGrid">{secondarySections.slice(0,5).map(item=><button key={`${item.route}:${item.title}`} className="home-mini-card" onClick={()=>navigate(item.route)}><span className="home-mini-icon"><Icon name={item.icon||"arrow"} size={24}/></span><span><b>{item.title}</b><small>{item.subtitle}</small></span></button>)}</div></div>

        <div className="homePromise"><div><small>{promise.eyebrow}</small><b>{promise.title}</b><p>{promise.description}</p></div><button className="secondary" onClick={()=>navigate(promise.route||"/quran")}>{promise.buttonLabel}<Icon name="arrow" size={17}/></button></div>
      </section>
    </main>

    <footer className="homeFooter"><div className="wrap"><BrandMark brand={content.brand||DEFAULT_HOME_CONTENT.brand}/><p>{footer.description}</p></div></footer>
  </div>;
}
