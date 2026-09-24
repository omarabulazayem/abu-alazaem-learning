import React,{useCallback,useEffect,useRef,useState} from "react";
import {Button,Card,Hero,Section,go} from "./ui-v4.jsx";
import {getSurah} from "./surahCatalog.js";

const COLORS=["#1E6F5C","#4EA8DE","#8E7CC3","#E58AA8","#2B2D42","#E9C46A","#FFFFFF"];
const SIZES=[2,4,7,11,16];

function pointFromEvent(canvas,e){
  const rect=canvas.getBoundingClientRect();
  return {x:(e.clientX-rect.left)*(canvas.width/rect.width),y:(e.clientY-rect.top)*(canvas.height/rect.height)};
}

export default function WhiteboardPage(){
  const canvasRef=useRef(null),drawingRef=useRef(false),historyRef=useRef([]),futureRef=useRef([]);
  const [tool,setTool]=useState("pen"),[color,setColor]=useState(COLORS[0]),[size,setSize]=useState(4);
  const [locked,setLocked]=useState(false),[message,setMessage]=useState(""),[timer,setTimer]=useState(0);
  const [timerRunning,setTimerRunning]=useState(false),[ayah,setAyah]=useState(null),[surahNumber,setSurahNumber]=useState("67"),[ayahNumber,setAyahNumber]=useState("1");

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
    const ctx=c.getContext("2d");ctx.fillStyle="#fffdf8";ctx.fillRect(0,0,c.width,c.height);
    if(old)restore(old);
  },[restore,snapshot]);

  useEffect(()=>{const c=canvasRef.current;if(!c)return;
    const rect=c.getBoundingClientRect(),ratio=Math.max(1,window.devicePixelRatio||1);
    c.width=Math.max(600,Math.floor(rect.width*ratio));c.height=Math.max(420,Math.floor(rect.height*ratio));
    const ctx=c.getContext("2d");ctx.fillStyle="#fffdf8";ctx.fillRect(0,0,c.width,c.height);
    const onResize=()=>fitCanvas();window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[fitCanvas]);

  useEffect(()=>{if(!timerRunning)return;const id=setInterval(()=>setTimer(v=>v+1),1000);return()=>clearInterval(id);},[timerRunning]);

  function start(e){
    if(locked)return;
    const c=canvasRef.current,ctx=c.getContext("2d"),p=pointFromEvent(c,e);
    pushHistory();drawingRef.current=true;ctx.beginPath();ctx.moveTo(p.x,p.y);
    ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=size*(window.devicePixelRatio||1);
    ctx.strokeStyle=tool==="eraser"?"#fffdf8":color;c.setPointerCapture?.(e.pointerId);
  }
  function move(e){if(!drawingRef.current||locked)return;const c=canvasRef.current,ctx=c.getContext("2d"),p=pointFromEvent(c,e);ctx.lineTo(p.x,p.y);ctx.stroke();}
  function end(){drawingRef.current=false;}
  function undo(){const h=historyRef.current;if(!h.length)return;futureRef.current=[snapshot(),...futureRef.current].slice(0,30);restore(h[h.length-1]);historyRef.current=h.slice(0,-1);}
  function redo(){const f=futureRef.current;if(!f.length)return;historyRef.current=[...historyRef.current,snapshot()].slice(-30);restore(f[0]);futureRef.current=f.slice(1);}
  function clearBoard(){if(!window.confirm("مسح كل ما على السبورة؟ لا يمكن التراجع بعد المسح الكامل."))return;pushHistory();const c=canvasRef.current,ctx=c.getContext("2d");ctx.fillStyle="#fffdf8";ctx.fillRect(0,0,c.width,c.height);setMessage("تم تنظيف السبورة.");}
  function addAyah(){const s=getSurah(Number(surahNumber));if(!s){setMessage("رقم السورة غير صحيح.");return;}setAyah({surah:s.name,number:Number(ayahNumber)});setMessage("تم تجهيز موضع سورة "+s.name+"، الآية "+ayahNumber+". افتح المصحف لإظهار النص الموثق.");}
  function exportBoard(){const c=canvasRef.current;if(!c)return;const a=document.createElement("a");a.href=c.toDataURL("image/png");a.download="abu-al-azaem-whiteboard.png";a.click();setMessage("تم تجهيز صورة السبورة.");}
  const mm=String(Math.floor(timer/60)).padStart(2,"0"),ss=String(timer%60).padStart(2,"0");

  return <div className="aa-whiteboard-page">
    <Hero eyebrow="السبورة التفاعلية" title="مساحة شرح المعلم" description="سبورة سريعة للحصة: كتابة ورسم، ممحاة، تراجع، مؤقت، مرجع للآية، وقفل تفاعل الطالب. حالة السبورة مؤقتة لجلسة الحصة ولا تُحفظ كسجل دائم في MVP." icon="edit" tone="sky" actions={<Button kind="secondary" icon="arrow" onClick={()=>go("/teacher")}>العودة للوحة المعلم</Button>}/>
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
            <button onClick={()=>setLocked(v=>!v)}>{locked?"🔓 فتح تفاعل الطالب":"🔒 قفل تفاعل الطالب"}</button>
            <button onClick={()=>setTimerRunning(v=>!v)}>{timerRunning?"⏸ إيقاف المؤقت":"▶ بدء المؤقت"}</button>
            <strong className="aa-board-timer">{mm}:{ss}</strong>
            <button onClick={()=>setTimer(0)}>تصفير</button>
            <button onClick={exportBoard}>⬇ تصدير صورة</button>
          </div>
        </div>
        <div className="aa-whiteboard-reference">
          <div><b>مرجع الدرس</b><span>{ayah?("سورة "+ayah.surah+" — الآية "+ayah.number):"لم تحدد آية بعد"}</span></div>
          <div className="aa-board-reference-form">
            <label>السورة<input inputMode="numeric" value={surahNumber} onChange={e=>setSurahNumber(e.target.value.replace(/\D/g,"").slice(0,3))}/></label>
            <label>الآية<input inputMode="numeric" value={ayahNumber} onChange={e=>setAyahNumber(e.target.value.replace(/\D/g,"").slice(0,3))}/></label>
            <Button kind="secondary" onClick={addAyah}>تجهيز المرجع</Button>
          </div>
        </div>
        <div className={"aa-whiteboard-stage "+(locked?"is-locked":"")}>
          <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end}/>
          {locked&&<div className="aa-whiteboard-lock">🔒 تفاعل الطالب مقفول — المعلم وحده يستطيع التعديل</div>}
        </div>
        {message&&<div className="msg ok">{message}</div>}
      </div>
    </Section>
    <div className="aa-dashboard-grid aa-whiteboard-support">
      <Card><h3>أدوات الحصة</h3><p>استخدم السبورة للشرح والرسم وتحديد مواضع الأخطاء، ثم انتقل للمصحف أو اللعبة من أدوات المعلم دون تحويل السبورة إلى صفحة منفصلة عن الدرس.</p></Card>
      <Card><h3>حدود نسخة MVP</h3><p>هذه النسخة تنفذ أدوات السبورة محليًا داخل جلسة المتصفح. المزامنة الحية بين جهاز المعلم والطالب تحتاج قناة WebRTC/DataChannel أو خدمة Realtime ضمن Live Classroom، وهي خطوة مستقلة.</p></Card>
    </div>
  </div>;
}
