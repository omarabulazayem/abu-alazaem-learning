import React, { useEffect, useState } from "react";
import { isChildModeActive } from "./ChildHub.jsx";

const credits=[
  {label:"صورة المصحف",creator:"el7bara",source:"https://commons.wikimedia.org/wiki/File:Opened_Qur%27an.jpg",license:"CC BY 2.0",licenseUrl:"https://creativecommons.org/licenses/by/2.0/"},
  {label:"صورة التعلم",creator:"Historian128",source:"https://commons.wikimedia.org/wiki/File:Sundanese_Muslim_children_reading_the_Al-Qur%27an_together_at_a_mosque_in_Purwakarta,_West_Java,_Indonesia.jpg",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
  {label:"صورة مسجد السلطان حسن",creator:"Ahmedalbadawy",source:"https://commons.wikimedia.org/wiki/File:Mosque-Madrassa_of_Sultan_Hassan_-_Exterior.jpg",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
];

export default function SiteCredits(){
  const [childMode,setChildMode]=useState(()=>isChildModeActive());
  useEffect(()=>{
    const sync=()=>setChildMode(isChildModeActive());
    window.addEventListener("abu-child-mode",sync);
    window.addEventListener("storage",sync);
    return()=>{window.removeEventListener("abu-child-mode",sync);window.removeEventListener("storage",sync);};
  },[]);
  if(childMode)return null;
  return <details className="site-media-credits" dir="rtl">
    <summary>حقوق الوسائط</summary>
    <div className="site-media-credit-list">{credits.map(item=><span key={item.source}><a href={item.source} target="_blank" rel="noreferrer">{item.label}</a><small>{item.creator}</small><a href={item.licenseUrl} target="_blank" rel="noreferrer">{item.license}</a></span>)}</div>
  </details>;
}
