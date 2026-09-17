import React, { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { loadLearningViewer } from "./learningViewer.js";
import { getApprovedTafsirQuestions, recordTafsirAnswer, TAFSIR_GAME_DEFINITIONS, tafsirGameDefinition, tafsirGamesByWorld } from "./tafsirContent.js";

function routePath(){return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;}
function go(path){if(routePath()!==path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}}
function answerValue(answer){return answer&&typeof answer==="object"&&"value" in answer?answer.value:answer;}
function answerLabel(answer){if(answer&&typeof answer==="object")return answer.label??String(answer.value??"");return String(answer??"");}
function answerImage(answer){return answer&&typeof answer==="object"?(answer.imageReference||answer.image_reference||null):null;}
function stableMix(items,seed){
  const out=[...items];let state=0;for(const ch of String(seed||"tafsir"))state=(state*31+ch.charCodeAt(0))>>>0;
  for(let i=out.length-1;i>0;i--){state=(state*1664525+1013904223)>>>0;const j=state%(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;
}

const worlds=[
  {id:"garden",title:"حديقة المعاني",copy:"افهم الكلمة والمعنى من محتوى مراجع، ثم جرّبها في صورة أو موقف.",icon:"sparkle"},
  {id:"stories",title:"مدينة القصص",copy:"السياق والقصص لا تظهر هنا إلا عندما تكون موثقة ومراجعة.",icon:"books"},
  {id:"lab",title:"مختبر التدبر والفهم",copy:"علاقات السبب والنتيجة والسياق تُبنى فقط عندما يثبتها المصدر.",icon:"brain"},
  {id:"treasure",title:"كنز الهدايات",copy:"حوّل الفهم إلى هداية عملية من نص مراجع، بلا اختراع أو تعميم زائد.",icon:"gift"},
];

export function TafsirWorldHub(){
  const [viewer,setViewer]=useState(undefined);const [approved,setApproved]=useState({});
  useEffect(()=>{let alive=true;(async()=>{const context=await loadLearningViewer();if(!alive)return;if(!context.user)return go("/login");setViewer(context);const counts={};for(const game of TAFSIR_GAME_DEFINITIONS.slice(0,4)){try{const rows=await getApprovedTafsirQuestions({gameId:game.id,child:context.child,limit:1});counts[game.id]=rows.length;}catch{counts[game.id]=0;}}if(alive)setApproved(counts);})();return()=>{alive=false;};},[]);
  if(viewer===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تجهيز عالم فهم القرآن...</p></div>;
  return <div className="app tafsir-world" dir="rtl"><header className="tafsir-topbar"><div className="wrap nav"><button className="brand" onClick={()=>go("/games")}><span className="logo"><Icon name="quran" size={24}/></span><span><b>عالم فهم القرآن</b><small>مصدر • تبسيط • مراجعة</small></span></button><button className="secondary" onClick={()=>go("/games")}>كل الألعاب</button></div></header><main className="wrap tafsir-page">
    <section className="tafsir-hero"><div><span className="tafsir-kicker">فهم موثق قبل اللعب</span><h1>أفهم المعنى… من غير ما نخترع تفسيرًا</h1><p>كل نشاط هنا يعتمد على محتوى تفسير له مصدر ومرجع، ثم تبسيط منفصل للطفل، ثم مراجعة قبل النشر. أي محتوى Draft أو In Review لا يصل إلى واجهة الطفل أصلًا.</p></div><div className="tafsir-seal"><Icon name="shield" size={38}/><b>Approved only</b><small>لا بيانات تجريبية دينية</small></div></section>
    <section className="tafsir-world-grid">{worlds.map(world=><article className={`tafsir-world-card ${world.id}`} key={world.id}><span className="tafsir-world-icon"><Icon name={world.icon} size={34}/></span><div><small>{tafsirGamesByWorld(world.id).length} ألعاب مخططة</small><h2>{world.title}</h2><p>{world.copy}</p></div></article>)}</section>
    <section className="tafsir-section"><div className="tafsir-heading"><div><span>الدفعة الأولى</span><h2>أول 4 ميكانيكيات مبنية وجاهزة للمحتوى المراجع</h2><p>اللعبة لا تُفتح إلا إذا وُجد لها سؤال Approved في قاعدة البيانات؛ حالة القفل هنا مقصودة وليست Placeholder.</p></div></div><div className="tafsir-game-grid">{TAFSIR_GAME_DEFINITIONS.slice(0,4).map((game,index)=>{const open=Boolean(approved[game.id]);return <button className={`tafsir-game-card ${open?"ready":"locked"}`} key={game.id} disabled={!open} onClick={()=>open&&go(game.route)}><span className="tafsir-index">{String(index+1).padStart(2,"0")}</span><div><small>{game.worldLabel}</small><h3>{game.title}</h3><p>{game.mechanic}</p></div><span className="tafsir-state"><Icon name={open?"unlock":"lock"} size={18}/>{open?"ابدأ":"بانتظار محتوى Approved"}</span></button>})}</div></section>
    <section className="tafsir-roadmap"><h2>الخريطة الكاملة</h2><div className="tafsir-roadmap-list">{TAFSIR_GAME_DEFINITIONS.map(game=><span key={game.id}><Icon name="lock" size={14}/>{game.title}</span>)}</div></section>
  </main></div>;
}

function SourceCard({question}){return <aside className="tafsir-source"><div><b>المعنى المبسط للطفل</b><p>{question.childFriendlyExplanation}</p></div><div className="tafsir-source-meta"><span><strong>المصدر:</strong> {question.sourceName}</span>{question.sourceAuthor&&<span><strong>المؤلف/المفسر:</strong> {question.sourceAuthor}</span>}<span><strong>المرجع:</strong> {question.sourceReference}</span></div><small>المعنى المبسط صياغة تعليمية منفصلة عن نص المصدر، وليس اقتباسًا يُنسب للمفسر.</small></aside>}

function useTafsirRound(gameId){
  const [viewer,setViewer]=useState(undefined);const [questions,setQuestions]=useState([]);const [index,setIndex]=useState(0);const [attempt,setAttempt]=useState(0);const [feedback,setFeedback]=useState(null);const [score,setScore]=useState(0);const [done,setDone]=useState(false);const [error,setError]=useState("");const startedAt=useRef(Date.now());
  useEffect(()=>{let alive=true;(async()=>{try{const context=await loadLearningViewer();if(!alive)return;if(!context.user)return go("/login");setViewer(context);const rows=await getApprovedTafsirQuestions({gameId,child:context.child,limit:8});if(!alive)return;setQuestions(stableMix(rows,`${gameId}:${context.child?.id||"teacher"}`).slice(0,5));}catch(e){if(alive)setError(e.message||"تعذر تحميل محتوى الفهم.");}})();return()=>{alive=false;};},[gameId]);
  const question=questions[index]||null;
  async function record(correct,metadata={}){if(!question)return;const responseTimeMs=Date.now()-startedAt.current;if(!viewer?.teacherPreview&&viewer?.child?.id)await recordTafsirAnswer({childId:viewer.child.id,question,correct,usedHint:attempt>0,responseTimeMs,metadata});}
  async function judge(correct,metadata={}){try{await record(correct,metadata);}catch(e){setError(e.message||"تعذر حفظ الإجابة.");return false;}if(correct){setScore(v=>v+1);setFeedback({correct:true,text:"أحسنت! وصلت للمعنى المراجع."});}else if(attempt===0){setAttempt(1);setFeedback({correct:false,text:"قريب جدًا. جرّب مرة ثانية ومعك تلميح من السؤال."});}else{setFeedback({correct:false,reveal:true,text:"نشوف المعنى المراجع معًا، وبعدها هنرجع له في مراجعة مختلفة."});}return true;}
  function next(){if(index+1>=questions.length){setDone(true);return;}setIndex(v=>v+1);setAttempt(0);setFeedback(null);startedAt.current=Date.now();}
  return {viewer,questions,question,index,attempt,feedback,score,done,error,setFeedback,judge,next};
}

function GameFrame({gameId,round,children}){const game=tafsirGameDefinition(gameId);if(round.viewer===undefined)return <div className="center"><i className="spinner"/><p>جارٍ تحميل اللعبة...</p></div>;if(round.error&&!round.question)return <LockedGame game={game} detail={round.error}/>;if(!round.question&&!round.done)return <LockedGame game={game}/>;if(round.done)return <div className="app tafsir-world" dir="rtl"><main className="wrap tafsir-game-page"><section className="tafsir-result"><Icon name="medal" size={52}/><h1>جولة فهم مكتملة</h1><p>أجبت بشكل صحيح عن <b>{round.score}</b> من <b>{round.questions.length}</b>.</p><div className="tafsir-result-actions"><button className="primary" onClick={()=>location.reload()}>جولة جديدة</button><button className="secondary" onClick={()=>go("/games/tafsir")}>عالم الفهم</button></div></section></main></div>;return <div className="app tafsir-world" dir="rtl"><header className="tafsir-topbar"><div className="wrap nav"><button className="brand" onClick={()=>go("/games/tafsir")}><span className="logo"><Icon name="quran" size={24}/></span><span><b>{game.title}</b><small>{round.index+1} / {round.questions.length}</small></span></button><button className="secondary" onClick={()=>go("/games/tafsir")}>خروج</button></div></header><main className="wrap tafsir-game-page"><div className="tafsir-progress"><span style={{width:`${((round.index+1)/round.questions.length)*100}%`}}/></div><section className="tafsir-ayah-card"><small>الآية المرتبطة بالسؤال</small><p>{round.question.ayahText}</p><span>سورة {round.question.surahNumber} • آية {round.question.ayahNumber}</span></section>{children}{round.feedback&&<section className={`tafsir-feedback ${round.feedback.correct?"good":"try"}`}><b>{round.feedback.text}</b>{(round.feedback.correct||round.feedback.reveal)&&<SourceCard question={round.question}/>} {(round.feedback.correct||round.feedback.reveal)&&<button className="primary" onClick={round.next}>التالي</button>}</section>}{round.error&&<div className="msg error">{round.error}</div>}</main></div>}
function LockedGame({game,detail}){return <div className="app tafsir-world" dir="rtl"><main className="wrap tafsir-game-page"><section className="tafsir-locked"><Icon name="lock" size={48}/><h1>{game?.title||"لعبة فهم القرآن"}</h1><p>{detail||"الميكانيكية مبنية، لكن لا يوجد لها محتوى Approved كافٍ بعد. لن نعرض تفسيرًا تجريبيًا أو معنى غير مراجع."}</p><button className="secondary" onClick={()=>go("/games/tafsir")}>العودة لعالم الفهم</button></section></main></div>}

function ChoiceScene({round,variant="cards"}){const q=round.question;const options=useMemo(()=>q?stableMix([q.correctAnswer,...q.distractors],q.questionId):[],[q]);async function choose(option){if(round.feedback?.correct||round.feedback?.reveal)return;const correct=JSON.stringify(answerValue(option))===JSON.stringify(answerValue(q.correctAnswer));await round.judge(correct,{chosen:answerValue(option),variant});}return <section className={`tafsir-choice-scene ${variant}`}><div className="tafsir-prompt"><span>{round.attempt?"تلميح: راجع الكلمات الأساسية في الآية":"مهمة المعنى"}</span><h2>{q.prompt}</h2></div><div className="tafsir-options">{options.map((option,i)=><button key={`${answerLabel(option)}:${i}`} onClick={()=>choose(option)}><span className="option-art">{answerImage(option)?<img src={answerImage(option)} alt=""/>:<Icon name={variant==="keys"?"unlock":variant==="boxes"?"gift":"sparkle"} size={30}/>}</span><b>{answerLabel(option)}</b></button>)}</div></section>}

export function WhatDoesAyahMeanGame(){const round=useTafsirRound("what-does-ayah-mean");return <GameFrame gameId="what-does-ayah-mean" round={round}>{round.question&&<ChoiceScene round={round}/>}</GameFrame>}
export function KeyWordGame(){const round=useTafsirRound("key-word");return <GameFrame gameId="key-word" round={round}>{round.question&&<ChoiceScene round={round} variant="keys"/>}</GameFrame>}
export function MeaningBoxesGame(){const round=useTafsirRound("meaning-boxes");return <GameFrame gameId="meaning-boxes" round={round}>{round.question&&<ChoiceScene round={round} variant="boxes"/>}</GameFrame>}

export function MeaningOrNotGame(){
  const round=useTafsirRound("meaning-or-not");const [placed,setPlaced]=useState({meaning:[],not:[]});
  useEffect(()=>setPlaced({meaning:[],not:[]}),[round.question?.questionId]);
  if(!round.question)return <GameFrame gameId="meaning-or-not" round={round}/>;
  const config=round.question.interactionConfig||{};const fallback=[{id:"correct",label:answerLabel(round.question.correctAnswer),isMeaning:true},...round.question.distractors.map((x,i)=>({id:`d${i}`,label:answerLabel(x),isMeaning:false}))];const statements=Array.isArray(config.statements)&&config.statements.length?config.statements:fallback;const used=new Set([...placed.meaning,...placed.not]);const available=statements.filter(s=>!used.has(String(s.id)));
  function place(id,bucket){setPlaced(prev=>{const clean={meaning:prev.meaning.filter(x=>x!==id),not:prev.not.filter(x=>x!==id)};return {...clean,[bucket]:[...clean[bucket],id]};});}
  async function submit(){if(used.size!==statements.length)return round.setFeedback({correct:false,text:"وزّع كل العبارات أولًا."});const correct=statements.every(s=>placed.meaning.includes(String(s.id))===Boolean(s.isMeaning));await round.judge(correct,{meaningIds:placed.meaning,notMeaningIds:placed.not});}
  return <GameFrame gameId="meaning-or-not" round={round}><section className="tafsir-sort-scene"><div className="tafsir-prompt"><span>{round.attempt?"حاول مرة ثانية":"رتّب المعاني"}</span><h2>{round.question.prompt}</h2></div><div className="tafsir-statement-pool">{available.map(s=><article key={s.id}><b>{s.label}</b><div><button onClick={()=>place(String(s.id),"meaning")}>من معنى الآية</button><button onClick={()=>place(String(s.id),"not")}>ليس من معناها</button></div></article>)}</div><div className="tafsir-sort-zones"><section><h3>من معنى الآية</h3>{placed.meaning.map(id=>{const s=statements.find(x=>String(x.id)===id);return <button key={id} onClick={()=>setPlaced(p=>({...p,meaning:p.meaning.filter(x=>x!==id)}))}>{s?.label}</button>})}</section><section><h3>ليس من معنى الآية</h3>{placed.not.map(id=>{const s=statements.find(x=>String(x.id)===id);return <button key={id} onClick={()=>setPlaced(p=>({...p,not:p.not.filter(x=>x!==id)}))}>{s?.label}</button>})}</section></div><button className="primary tafsir-submit" onClick={submit}>تحقق من الترتيب</button></section></GameFrame>;
}

export const TAFSIR_GAME_ROUTES=Object.freeze({
  "/games/tafsir/what-does-ayah-mean":WhatDoesAyahMeanGame,
  "/games/tafsir/key-word":KeyWordGame,
  "/games/tafsir/meaning-boxes":MeaningBoxesGame,
  "/games/tafsir/meaning-or-not":MeaningOrNotGame,
});
