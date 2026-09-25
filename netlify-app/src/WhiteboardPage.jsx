import React,{useCallback,useEffect,useRef,useState} from "react";
import {AppShell,Button,Card,Hero,Section,TEACHER_NAV,go} from "./ui-v4.jsx";
import {getSurah} from "./surahCatalog.js";
import Peer from "peerjs";

const COLORS=["#1E6F5C","#4EA8DE","#8E7CC3","#E58AA8","#2B2D42","#E9C46A","#FFFFFF"];
const SIZES=[2,4,7,11,16];

function pointFromEvent(canvas,e){
  const rect=canvas.getBoundingClientRect();
  return {x:(e.clientX-rect.left)*(canvas.width/rect.width),y:(e.clientY-rect.top)*(canvas.height/rect.height)};
}

function drawRemoteStroke(canvas,stroke){
  if(!canvas||!stroke?.points?.length)return;
  const ctx=canvas.getContext("2d");
  ctx.save();
  ctx.lineCap="round";ctx.lineJoin="round";
  ctx.lineWidth=stroke.size;
  ctx.globalCompositeOperation=stroke.tool==="eraser"?"destination-out":"source-over";
  ctx.strokeStyle=stroke.color||"#1E6F5C";
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x,stroke.points[0].y);
  for(const p of stroke.points.slice(1))ctx.lineTo(p.x,p.y);
  ctx.stroke();
  ctx.restore();
}

export default function WhiteboardPage(){
  const canvasRef=useRef(null),drawingRef=useRef(false),historyRef=useRef([]),futureRef=useRef([]),strokeRef=useRef([]);
  const [tool,setTool]=useState("pen"),[color,setColor]=useState(COLORS[0]),[size,setSize]=useState(4);
  const [locked,setLocked]=useState(false),[message,setMessage]=useState(""),[timer,setTimer]=useState(0),[savedAt,setSavedAt]=useState(""),[sessionCode,setSessionCode]=useState("");
  const STORAGE_KEY="abu-al-azaem-whiteboard-v2";
  const [timerRunning,setTimerRunning]=useState(false),[ayah,setAyah]=useState(null),[surahNumber,setSurahNumber]=useState("67"),[ayahNumber,setAyahNumber]=useState("1");
  const [background,setBackground]=useState("paper"),[videoUrl,setVideoUrl]=useState(""),[presentation,setPresentation]=useState(false);
  const [effects,setEffects]=useState([]);
  const audioRef=useRef(null),peerRef=useRef(null),connRef=useRef(null);
  const [connectionState,setConnectionState]=useState("offline");

  const snapshot=useCallback(()=>{const c=canvasRef.current;return c?c.toDataURL("image/png"):null;},[]);
  const restore=useCallback((data)=>{
    const c=canvasRef.current;if(!c||!data)return;
    const ctx=c.getContext("2d"),img=new Image();
    img.onload=()=>{ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0);};
    img.src=data;
  },[]);

  const pushHistory=useCallback(()=>{
    const s=snapshot();if(!s)return;
    historyRef.current=[...historyRef.current.slice(-29),s];futureRef.current=[];
  },[snapshot]);

  const fitCanvas=useCallback(()=>{
    const c=canvasRef.current;if(!c)return;
    const rect=c.getBoundingClientRect(),ratio=Math.max(1,window.devicePixelRatio||1),old=snapshot();
    c.width=Math.max(600,Math.floor(rect.width*ratio));c.height=Math.max(420,Math.floor(rect.height*ratio));
    const ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);
    if(old)restore(old);
  },[restore,snapshot]);

  useEffect(()=>{const c=canvasRef.current;if(!c)return;
    const rect=c.getBoundingClientRect(),ratio=Math.max(1,window.devicePixelRatio||1);
    c.width=Math.max(600,Math.floor(rect.width*ratio));c.height=Math.max(420,Math.floor(rect.height*ratio));
    const ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);
    const onResize=()=>fitCanvas();window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[fitCanvas]);

  useEffect(()=>{if(!timerRunning)return;const id=setInterval(()=>setTimer(v=>v+1),1000);return()=>clearInterval(id);},[timerRunning]);
  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if(saved?.canvas){setTimeout(()=>restore(saved.canvas),0);setAyah(saved.ayah||null);setTimer(saved.timer||0);setSavedAt(saved.savedAt||"");setSessionCode(saved.sessionCode||"");}
    }catch{}
  },[restore]);
  const saveBoard=useCallback(()=>{
    const canvas=snapshot();if(!canvas)return;
    const payload={canvas,ayah,timer,savedAt:new Date().toISOString(),sessionCode};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));setSavedAt(payload.savedAt);setMessage("تم حفظ حالة السبورة على هذا الجهاز.");
  },[snapshot,ayah,timer,sessionCode]);
  useEffect(()=>{const id=setTimeout(()=>{const canvas=snapshot();if(canvas)localStorage.setItem(STORAGE_KEY,JSON.stringify({canvas,ayah,timer,savedAt:new Date().toISOString(),sessionCode}));},900);return()=>clearTimeout(id);},[ayah,timer,sessionCode,snapshot]);
  function sendRealtime(payload){try{if(connRef.current?.open)connRef.current.send(payload);}catch{}}
  async function copyStudentLink(){try{await navigator.clipboard.writeText(window.location.origin+"/whiteboard/join");setMessage("تم نسخ رابط دخول الطالب. أرسليه للطالب مع كود الجلسة.");}catch{setMessage("رابط دخول الطالب: "+window.location.origin+"/whiteboard/join");}}
  function startTeacherSession(){
    try{
      peerRef.current?.destroy();
      const code=Math.random().toString(36).slice(2,7).toUpperCase();
      const peer=new Peer("abu-board-"+code);
      peerRef.current=peer;setSessionCode(code);setTimer(0);setAyah(null);setConnectionState("waiting");
      peer.on("open",()=>setConnectionState("waiting"));
      peer.on("connection",conn=>{
        if(connRef.current?.open)connRef.current.close();
        connRef.current=conn;setConnectionState("connected");
        conn.on("open",()=>conn.send({type:"state",canvas:snapshot(),locked,timer,background,sessionCode:code}));
        conn.on("data",data=>{
          if(data?.type==="student-stroke"&&!locked){drawRemoteStroke(canvasRef.current,data.stroke);sendRealtime({type:"stroke",stroke:data.stroke});}
          if(data?.type==="student-snapshot"&&!locked&&data.canvas){restore(data.canvas);sendRealtime({type:"state",canvas:data.canvas,locked,timer,background,sessionCode:code});}
          if(data?.type==="effect"&&data.effect)playSound(data.effect,false);
          if(data?.type==="ping")conn.send({type:"pong"});
        });
        conn.on("close",()=>{if(connRef.current===conn){connRef.current=null;setConnectionState("waiting");}});
      });
      peer.on("error",()=>{setConnectionState("error");setMessage("تعذر فتح جلسة المشاركة. جربي بدء جلسة جديدة.");});
      setMessage("تم إنشاء جلسة مباشرة. أرسلي الكود للطالب: "+code);
    }catch{setConnectionState("error");setMessage("تعذر تشغيل الاتصال المباشر على هذا المتصفح.");}
  }
  useEffect(()=>{sendRealtime({type:"state",canvas:snapshot(),locked,timer,background,sessionCode});},[locked,timer,background,sessionCode,snapshot]);

  function triggerEffect(type){
    const id=Date.now()+Math.random();
    setEffects(v=>[...v,{id,type}]);
    window.setTimeout(()=>setEffects(v=>v.filter(x=>x.id!==id)),type==="celebrate"?2600:1800);
  }
  function playSound(type,broadcast=true){
    triggerEffect(type);
    if(broadcast)sendRealtime({type:"effect",effect:type});
    try{
      const C=window.AudioContext||window.webkitAudioContext;
      if(!C)return;
      const ac=audioRef.current||new C();audioRef.current=ac;
      if(ac.state==="suspended")ac.resume();
      const now=ac.currentTime;
      const tone=(freq,dur,offset=0,volume=.045,wave="sine")=>{
        const o=ac.createOscillator(),g=ac.createGain();o.type=wave;o.frequency.setValueAtTime(freq,now+offset);g.gain.setValueAtTime(.0001,now+offset);g.gain.exponentialRampToValueAtTime(volume,now+offset+.01);g.gain.exponentialRampToValueAtTime(.0001,now+offset+dur);o.connect(g).connect(ac.destination);o.start(now+offset);o.stop(now+offset+dur+.02);
      };
      if(type==="clap"){for(let i=0;i<4;i++)tone(1700,0.045,i*.12,.025,"square");}
      if(type==="heart"){tone(520,.11,0,.04);tone(700,.14,.13,.04);}
      if(type==="celebrate"){[523,659,784,1047].forEach((n,i)=>tone(n,.22,i*.12,.045));}
      if(type==="star"){[1047,1319,1568].forEach((n,i)=>tone(n,.18,i*.09,.035));}
      if(type==="trophy"){[392,494,587,784].forEach((n,i)=>tone(n,.28,i*.16,.05));}
      if(type==="hammer"){tone(115,.12,0,.09,"triangle");tone(72,.18,.1,.06,"triangle");}
      if(type==="alert"){[880,660,880,660].forEach((n,i)=>tone(n,.16,i*.2,.055,"square"));}
    }catch{}
  }
  const soundActions=[
    ["clap","تصفيق"],["heart","قلب"],["celebrate","احتفال"],["star","نجمة"],
    ["trophy","كأس"],["hammer","مطرقة"],["alert","إنذار"]
  ];
  function start(e){
    if(locked)return;
    const c=canvasRef.current,ctx=c.getContext("2d"),p=pointFromEvent(c,e);
    pushHistory();drawingRef.current=true;strokeRef.current=[p];ctx.beginPath();ctx.moveTo(p.x,p.y);
    ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=size*(window.devicePixelRatio||1);
    ctx.globalCompositeOperation=tool==="eraser"?"destination-out":"source-over";ctx.strokeStyle=color;c.setPointerCapture?.(e.pointerId);
  }
  function move(e){if(!drawingRef.current||locked)return;const c=canvasRef.current,ctx=c.getContext("2d"),p=pointFromEvent(c,e);strokeRef.current.push(p);ctx.lineTo(p.x,p.y);ctx.stroke();}
  function end(){
    if(!drawingRef.current)return;
    drawingRef.current=false;
    const points=strokeRef.current;strokeRef.current=[];
    if(points.length){
      sendRealtime({type:"stroke",stroke:{points,tool,color,size:size*(window.devicePixelRatio||1)}});
    }
}
  function undo(){const h=historyRef.current;if(!h.length)return;futureRef.current=[snapshot(),...futureRef.current].slice(0,30);restore(h[h.length-1]);historyRef.current=h.slice(0,-1);sendRealtime({type:"state",canvas:snapshot(),locked,timer,background,sessionCode});}
  function redo(){const f=futureRef.current;if(!f.length)return;historyRef.current=[...historyRef.current,snapshot()].slice(-30);restore(f[0]);futureRef.current=f.slice(1);sendRealtime({type:"state",canvas:snapshot(),locked,timer,background,sessionCode});}
  function clearBoard(){if(!window.confirm("مسح كل ما على السبورة؟"))return;pushHistory();const c=canvasRef.current,ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);sendRealtime({type:"state",canvas:snapshot(),locked,timer,background,sessionCode});setMessage("تم تنظيف السبورة.");}
  function addAyah(){const s=getSurah(Number(surahNumber));if(!s){setMessage("رقم السورة غير صحيح.");return;}setAyah({surah:s.name,number:Number(ayahNumber)});setMessage("تم تجهيز موضع سورة "+s.name+"، الآية "+ayahNumber+". افتح المصحف لإظهار النص الموثق.");}
  function exportBoard(){const c=canvasRef.current;if(!c)return;const a=document.createElement("a");a.href=c.toDataURL("image/png");a.download="abu-al-azaem-whiteboard.png";a.click();setMessage("تم تجهيز صورة السبورة.");}
  const mm=String(Math.floor(timer/60)).padStart(2,"0"),ss=String(timer%60).padStart(2,"0");
  function handleVideo(e){const file=e.target.files?.[0];if(file){setVideoUrl(URL.createObjectURL(file));setBackground("video");}}

  return <AppShell mode="teacher" subtitle="بوابة المعلم" nav={TEACHER_NAV} footer="أبو العزايم • السبورة أداة شرح داخل جلسة الحصة."><div className="aa-whiteboard-page">
    <Hero eyebrow="السبورة التفاعلية" title="مساحة شرح المعلم" description="سبورة سريعة للحصة: كتابة ورسم، ممحاة، تراجع، مؤقت، مرجع للآية، وقفل تفاعل الطالب. يمكن إنشاء جلسة مباشرة وإعطاء الطالب كودًا للدخول، مع تحكم المعلم في الكتابة أو المشاهدة." icon="edit" tone="sky" actions={<Button kind="secondary" icon="arrow" onClick={()=>go("/teacher")}>العودة للوحة المعلم</Button>}/>
    <Section>
      <div className="aa-whiteboard-shell">
        <div className="aa-whiteboard-toolbar">
          <div className="aa-whiteboard-tool-group">
            <button className={tool==="pen"?"is-active":""} onClick={()=>setTool("pen")}>✎ قلم</button>
            <button className={tool==="eraser"?"is-active":""} onClick={()=>setTool("eraser")}>⌫ ممحاة</button>
            <button onClick={undo} disabled={!historyRef.current.length}>↶ تراجع</button>
            <button onClick={redo} disabled={!futureRef.current.length}>↷ إعادة</button>
            <button onClick={clearBoard}>مسح الكل</button>
          </div>
          <div className="aa-whiteboard-tool-group">
            {COLORS.map(c=><button key={c} className={color===c?"aa-color is-active":"aa-color"} style={{background:c}} onClick={()=>{setColor(c);setTool("pen");}} aria-label="لون"/>)}
            <select value={size} onChange={e=>setSize(Number(e.target.value))} aria-label="حجم القلم">{SIZES.map(v=><option key={v} value={v}>{v}px</option>)}</select>
          </div>
          <div className="aa-whiteboard-tool-group">
            <select value={background} onChange={e=>setBackground(e.target.value)} aria-label="خلفية السبورة">
              <option value="paper">خلفية كتابة</option><option value="soft">خلفية هادئة</option><option value="focus">خلفية عرض</option><option value="timer">شاشة المؤقت</option><option value="video">شاشة الفيديو</option>
            </select>
            <label className="aa-video-upload">إضافة فيديو<input type="file" accept="video/*" onChange={handleVideo}/></label>
            <button onClick={()=>setPresentation(v=>!v)}>{presentation?"إنهاء العرض":"وضع العرض"}</button>
            <button onClick={()=>setLocked(v=>!v)}>{locked?"🔓 فتح تفاعل الطالب":"🔒 قفل تفاعل الطالب"}</button>
            <button onClick={()=>setTimerRunning(v=>!v)}>{timerRunning?"⏸ إيقاف المؤقت":"▶ بدء المؤقت"}</button>
            <strong className="aa-board-timer">{mm}:{ss}</strong>
            <button onClick={()=>setTimer(0)}>تصفير</button>
            <button onClick={saveBoard}>💾 حفظ</button>
            <button onClick={startTeacherSession}>＋ جلسة جديدة</button>
            <button onClick={exportBoard}>تصدير صورة</button>
          </div>
          <div className="aa-whiteboard-tool-group aa-sound-group">
            <span className="aa-sound-title">أصوات سريعة</span>
            {soundActions.map(([type,label])=><button key={type} className={"aa-effect-btn aa-effect-"+type} onClick={()=>playSound(type)}>{label}</button>)}
          </div>
        </div>
        <div className="aa-whiteboard-reference"><div><b>جلسة السبورة</b><span>{sessionCode?("رمز الجلسة: "+sessionCode):"لم تبدأ جلسة بعد"}{savedAt?" • آخر حفظ: "+new Date(savedAt).toLocaleTimeString("ar-EG"):""}{sessionCode?" • "+({offline:"غير متصل",waiting:"بانتظار الطالب",connected:"الطالب متصل",error:"خطأ في الاتصال"}[connectionState]||connectionState):""}</span>{sessionCode&&<Button kind="secondary" onClick={copyStudentLink}>نسخ رابط الطالب</Button>}</div>
          <div><b>مرجع الدرس</b><span>{ayah?("سورة "+ayah.surah+" — الآية "+ayah.number):"لم تحدد آية بعد"}</span></div>
          <div className="aa-board-reference-form">
            <label>السورة<input inputMode="numeric" value={surahNumber} onChange={e=>setSurahNumber(e.target.value.replace(/\D/g,"").slice(0,3))}/></label>
            <label>الآية<input inputMode="numeric" value={ayahNumber} onChange={e=>setAyahNumber(e.target.value.replace(/\D/g,"").slice(0,3))}/></label>
            <Button kind="secondary" onClick={addAyah}>تجهيز المرجع</Button>
          </div>
        </div>
        <div className={"aa-whiteboard-stage aa-bg-"+background+(presentation?" is-presentation":"")+(locked?" is-locked":"")}>
          {background==="video"&&videoUrl&&<video className="aa-whiteboard-video" src={videoUrl} controls autoPlay loop playsInline/>}
          {background==="timer"&&<div className="aa-whiteboard-big-timer">{mm}:{ss}</div>}
          {background==="focus"&&<div className="aa-whiteboard-focus"><strong>مساحة العرض</strong><span>شغّلي الفيديو أو المؤقت أو اعرضي المحتوى هنا</span></div>}
          <div className="aa-whiteboard-effects" aria-live="polite">
            {effects.map(effect=><div key={effect.id} className={"aa-board-effect aa-effect-"+effect.type} aria-hidden="true">
              {effect.type==="clap"&&<><span className="aa-clap-hand aa-hand-a"/><span className="aa-clap-hand aa-hand-b"/><span className="aa-clap-lines"/></>}
              {effect.type==="heart"&&<span className="aa-heart-shape">♥</span>}
              {effect.type==="star"&&<span className="aa-star-shape">★</span>}
              {effect.type==="trophy"&&<><span className="aa-trophy-cup"/><span className="aa-trophy-base"/></>}
              {effect.type==="hammer"&&<><span className="aa-hammer-head"/><span className="aa-hammer-handle"/></>}
              {effect.type==="alert"&&<><span className="aa-alert-sign">!</span><span className="aa-alert-ring"/></>}
              {effect.type==="celebrate"&&<><span className="aa-confetti c1"/><span className="aa-confetti c2"/><span className="aa-confetti c3"/><span className="aa-confetti c4"/><span className="aa-confetti c5"/><span className="aa-confetti c6"/><span className="aa-celebrate-text">أحسنت!</span></>}
            </div>)}
          </div>
          <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end}/>
          {locked&&<div className="aa-whiteboard-lock">تفاعل الطالب مقفول — المعلم وحده يستطيع التعديل</div>}
        </div>
        {message&&<div className="msg ok">{message}</div>}
      </div>
    </Section>
    <div className="aa-dashboard-grid aa-whiteboard-support">
      <Card><h3>أدوات الحصة</h3><p>استخدم السبورة للشرح والرسم وتحديد مواضع الأخطاء، ثم انتقل للمصحف أو اللعبة من أدوات المعلم دون تحويل السبورة إلى صفحة منفصلة عن الدرس.</p></Card>
      <Card><h3>الجلسة المباشرة</h3><p>الجلسة تستخدم اتصالًا مباشرًا بين المتصفحين عبر WebRTC من خلال PeerJS. المعلم ينشئ الجلسة، والطالب يدخل بالكود، وتنتقل حالة السبورة بعد كل تعديل مكتمل. صلاحية الكتابة يحددها المعلم.</p></Card>
    </div>
  </div></AppShell>;
}
