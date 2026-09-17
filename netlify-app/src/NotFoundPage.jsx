import React from "react";
import Icon from "./Icon.jsx";
function go(path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}
export default function NotFoundPage(){return <div className="app" dir="rtl"><main className="wrap page narrow"><section className="panel focus"><span className="logo"><Icon name="search" size={28}/></span><h1>الصفحة غير موجودة</h1><p>الرابط الذي فتحته غير معروف في المنصة أو أن الميزة ليست متاحة بعد.</p><button className="primary" onClick={()=>go("/")}>العودة للرئيسية</button></section></main></div>;}
