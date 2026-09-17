import React from "react";

const credits=[
  {label:"صورة المصحف",creator:"el7bara",source:"https://commons.wikimedia.org/wiki/File:Opened_Qur%27an.jpg",license:"CC BY 2.0",licenseUrl:"https://creativecommons.org/licenses/by/2.0/"},
  {label:"صورة التعلم",creator:"Historian128",source:"https://commons.wikimedia.org/wiki/File:Sundanese_Muslim_children_reading_the_Al-Qur%27an_together_at_a_mosque_in_Purwakarta,_West_Java,_Indonesia.jpg",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
  {label:"صورة مسجد السلطان حسن",creator:"Ahmedalbadawy",source:"https://commons.wikimedia.org/wiki/File:Mosque-Madrassa_of_Sultan_Hassan_-_Exterior.jpg",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
];
const shell={background:"#f1efe9",borderTop:"1px solid #dedbd2",color:"#6b6f72",fontFamily:'"Segoe UI",Tahoma,Arial,sans-serif',fontSize:"11px",padding:"10px max(18px,calc((100vw - 1240px)/2))"};
const summary={cursor:"pointer",fontWeight:700,color:"#53616d",listStyle:"none"};
const list={display:"flex",flexWrap:"wrap",gap:"7px 18px",paddingTop:"9px",lineHeight:1.7};
const link={color:"#2d6f91",textDecoration:"none"};

export default function SiteCredits(){
  return <details className="site-media-credits" dir="rtl" style={shell}>
    <summary style={summary}>مصادر الصور والتراخيص</summary>
    <div className="site-media-credit-list" style={list}>{credits.map(item=><span key={item.source}><a style={link} href={item.source} target="_blank" rel="noreferrer">{item.label}</a> — {item.creator} — <a style={link} href={item.licenseUrl} target="_blank" rel="noreferrer">{item.license}</a></span>)}</div>
  </details>;
}
