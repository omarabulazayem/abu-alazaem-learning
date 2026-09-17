import React, { useEffect, useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import {
  getActiveChildId,
  getCurrentUser,
  listChildren,
  setActiveChildId,
  signOut,
} from "./api.js";
import { DEFAULT_HOME_CONTENT, DEFAULT_MAIN_NAV, loadHomeContent } from "./siteContent.js";

function routePath(){return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;}
function navigate(path){if(routePath()!==path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}}

function BrandMark({brand=DEFAULT_HOME_CONTENT.brand}){
  return <button className="homeBrand" onClick={()=>navigate("/")}>
    <span className="homeBrandIcon"><Icon name="mosque" size={42}/></span>
    <span><b>{brand.title}</b><small>{brand.subtitle}</small></span>
  </button>;
}

function HeroTitle({title,highlight}){
  if(!highlight||!String(title).includes(highlight))return <>{title}</>;
  const [before,...rest]=String(title).split(highlight);
  return <>{before}<strong>{highlight}</strong>{rest.join(highlight)}</>;
}

export default function HomePage(){
  const [user,setUser]=useState(undefined);
  const [child,setChild]=useState(null);
  const [menuOpen,setMenuOpen]=useState(false);
  const [content,setContent]=useState({...DEFAULT_HOME_CONTENT,navigation:DEFAULT_MAIN_NAV});

  useEffect(()=>{
    let alive=true;
    (async()=>{
      const [current,editorial]=await Promise.all([
        getCurrentUser().catch(()=>null),
        loadHomeContent("ar").catch(()=>({...DEFAULT_HOME_CONTENT,navigation:DEFAULT_MAIN_NAV}))
      ]);
      if(!alive)return;
      setContent(editorial);
      setUser(current);
      if(!current||current.accountType==="teacher")return;
      const kids=await listChildren(current).catch(()=>[]);
      if(!alive)return;
      const activeId=getActiveChildId();
      const selected=kids.find(k=>k.id===activeId)||kids[0]||null;
      if(selected&&selected.id!==activeId)setActiveChildId(selected.id);
      setChild(selected);
    })();
    return()=>{alive=false;};
  },[]);

  const accountLabel=useMemo(()=>{
    if(!user)return "تسجيل الدخول";
    if(user.accountType==="teacher")return "لوحة المعلم";
    return "حساب الأسرة";
  },[user]);

  async function logout(){await signOut();setUser(null);setChild(null);}
  function openAccount(){if(!user)return navigate("/login");navigate(user.accountType==="teacher"?"/teacher":"/family");}

  const navigation=content.navigation||DEFAULT_MAIN_NAV;
  const hero=content.hero||DEFAULT_HOME_CONTENT.hero;
  const sections=content.sections||DEFAULT_HOME_CONTENT.sections;
  const heading=content.sectionsHeading||DEFAULT_HOME_CONTENT.sectionsHeading;
  const promise=content.promise||DEFAULT_HOME_CONTENT.promise;
  const footer=content.footer||DEFAULT_HOME_CONTENT.footer;

  return <div className="homeV2" dir="rtl">
    <header className="homeHeader"><div className="homeHeaderInner">
      <BrandMark brand={content.brand}/>
      <nav className={menuOpen?"homeNav open":"homeNav"}>
        {navigation.map(item=><button key={`${item.url}:${item.label}`} className={item.url==="/"?"active":""} onClick={()=>{navigate(item.url||"/");setMenuOpen(false);}}><Icon name={item.icon||"arrow"} size={23}/><span>{item.label}</span></button>)}
        {user?.accountType==="teacher"&&<button onClick={()=>{navigate("/teacher");setMenuOpen(false);}}><Icon name="teacher" size={23}/><span>المعلم</span></button>}
      </nav>
      <div className="homeAccountArea">
        {child&&<div className="homeScore"><Icon name="star" size={22}/><b>{child.points||0}</b><span>نقطة</span></div>}
        <button className="homeAccount" onClick={openAccount}><Icon name={user?"user":"login"} size={22}/><span>{accountLabel}</span></button>
        {user&&<button className="homeLogout" onClick={logout} aria-label="تسجيل الخروج"><Icon name="logout" size={20}/></button>}
        <button className="homeMenu" onClick={()=>setMenuOpen(v=>!v)} aria-label="فتح القائمة"><Icon name={menuOpen?"close":"menu"} size={24}/></button>
      </div>
    </div></header>

    <main>
      <section className="homeHeroWrap"><div className="homeHero">
        <div className="homeHeroCopy">
          <span className="homeEyebrow"><Icon name="sparkle" size={18}/>{hero.eyebrow}</span>
          <h1><HeroTitle title={hero.title} highlight={hero.highlight}/></h1>
          <p>{hero.description}</p>
          <div className="homeHeroActions">
            <button className="homePrimary" onClick={()=>navigate(user?(user.accountType==="teacher"?"/teacher":"/child"):"/login")}><span>{user?"ابدأ رحلتك":hero.primaryLabel}</span><Icon name="arrow" size={19}/></button>
            <button className="homeGhost" onClick={()=>navigate(hero.secondaryRoute||"/quran")}><Icon name="quran" size={20}/><span>{hero.secondaryLabel}</span></button>
          </div>
          {child&&<div className="homeChildStrip"><span className="homeChildAvatar"><Icon name="user" size={24}/></span><div><small>المستوى الحالي</small><b>{child.display_name}</b></div><div className="homeChildMetric"><strong>{child.stars||0}</strong><span>نجمة</span></div><div className="homeChildMetric"><strong>{child.streak||0}</strong><span>يوم متواصل</span></div></div>}
        </div>
        <div className="homeHeroVisual" role="img" aria-label="أطفال يتعلمون القرآن"/>
      </div></section>

      <section className="homeSections">
        <div className="homeSectionHeading"><span>{heading.eyebrow}</span><h2>{heading.title}</h2><p>{heading.description}</p></div>
        <div className="homeCardGrid">{sections.map(item=><button key={`${item.route}:${item.title}`} className={`homeFeatureCard ${item.tone||""}`} onClick={()=>navigate(item.route)}><span className="homeFeatureIcon"><Icon name={item.icon||"arrow"} size={42}/></span><span className="homeFeatureText"><b>{item.title}</b><small>{item.subtitle}</small></span><span className="homeFeatureArrow"><Icon name="arrow" size={18}/></span></button>)}</div>
      </section>

      <section className="homePromise"><div className="homePromiseIcon"><Icon name="quran" size={34}/></div><div><span>{promise.eyebrow}</span><h3>{promise.title}</h3><p>{promise.description}</p></div><button onClick={()=>navigate(promise.route||"/quran")}>{promise.buttonLabel}<Icon name="arrow" size={18}/></button></section>
    </main>

    <footer className="homeFooter"><div><BrandMark brand={content.brand}/><p>{footer.description}</p></div><small>{content.brand?.title||"أبو العزايم"} {content.brand?.subtitle||"للحفظ الممتع"}</small></footer>
  </div>;
}
