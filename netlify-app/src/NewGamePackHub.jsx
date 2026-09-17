import React from "react";
import {gamesBy,GAME_STATUS} from "./gameRegistry.js";
import {AppShell,Button,Card,CHILD_NAV,Hero,Metric,Section,go} from "./ui-v4.jsx";
import {isChildModeActive} from "./ChildHub.jsx";

export default function NewGamePackHub(){
  const games=gamesBy({pack:"quran-expansion",status:GAME_STATUS.LIVE});const unavailable=gamesBy({pack:"quran-expansion"}).filter(g=>g.status!==GAME_STATUS.LIVE);const childMode=isChildModeActive();
  return <AppShell mode={childMode?"child":"family"} subtitle="مغامرات إضافية" nav={childMode?CHILD_NAV:[]} actions={<Button kind="secondary" icon="game" onClick={()=>go("/games")}>كل الألعاب</Button>} footer="أبو العزايم • الألعاب المتاحة تأتي من Game Registry الموحد.">
    <Hero eyebrow="مغامرات إضافية" title="طرق جديدة للحفظ والاستدعاء" description="الألعاب الظاهرة هنا live ومربوطة فعليًا بالمحرك؛ غير المكتمل لا يظهر للطفل." icon="sparkle" tone="lavender"/>
    <div className="aa-metrics"><Metric icon="game" label="متاحة الآن" value={games.length} tone="lavender"/><Metric icon="lock" label="قيد الاستكمال" value={unavailable.length} tone="sky"/><Metric icon="target" label="هدفها" value="حفظ ومراجعة" tone="mint"/><Metric icon="star" label="جولات قصيرة" value="نعم" tone="gold"/></div>
    <Section eyebrow="المتاح الآن" title="اختار مغامرة"><div className="aa-game-grid">{games.map(g=><Card key={g.id} className="aa-game-card" icon={g.icon||"game"} title={g.title} text={g.description} tone="sky" badge={g.categoryLabel} action="ابدأ اللعب" onClick={()=>go(g.route)}/>)}</div></Section>
  </AppShell>;
}
