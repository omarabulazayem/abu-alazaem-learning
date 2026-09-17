import { rest, rpc } from "./api.js";
import { getAyah } from "./quranCorpus.js";

export const TAFSIR_STATUS = Object.freeze({ BLOCKED_CONTENT: "blocked_content", LIVE: "live" });

export const TAFSIR_GAME_DEFINITIONS = Object.freeze([
  { id:"what-does-ayah-mean", title:"ماذا تعني الآية؟", world:"garden", worldLabel:"حديقة المعاني", route:"/games/tafsir/what-does-ayah-mean", mechanic:"اختيار صورة أو موقف يعبّر عن المعنى", questionType:"meaning_choice", ageRange:[4,12], status:"blocked_content" },
  { id:"key-word", title:"الكلمة المفتاح", world:"garden", worldLabel:"حديقة المعاني", route:"/games/tafsir/key-word", mechanic:"اختيار معنى كلمة ثم فتح مفتاح السياق", questionType:"keyword_meaning", ageRange:[6,12], status:"blocked_content" },
  { id:"meaning-boxes", title:"صندوق المعاني", world:"garden", worldLabel:"حديقة المعاني", route:"/games/tafsir/meaning-boxes", mechanic:"صناديق كلمة ومعنى وصورة وسؤال", questionType:"meaning_boxes", ageRange:[4,12], status:"blocked_content" },
  { id:"meaning-or-not", title:"صح أم ليس من معنى الآية؟", world:"garden", worldLabel:"حديقة المعاني", route:"/games/tafsir/meaning-or-not", mechanic:"سحب العبارات إلى من المعنى أو ليس من المعنى", questionType:"meaning_sort", ageRange:[7,12], status:"blocked_content" },
  { id:"ayah-and-situation", title:"الآية والموقف", world:"garden", worldLabel:"حديقة المعاني", route:"/games/tafsir/ayah-and-situation", mechanic:"مطابقة معنى الآية بموقف مناسب", questionType:"situation_match", ageRange:[6,12], status:"blocked_content" },
  { id:"guidance-treasure", title:"كنز الهداية", world:"treasure", worldLabel:"كنز الهدايات", route:"/games/tafsir/guidance-treasure", mechanic:"غرف آيات وجواهر هدايات موثقة", questionType:"guidance", ageRange:[7,12], status:"blocked_content" },
  { id:"ayah-story", title:"قصة الآية", world:"stories", worldLabel:"مدينة القصص", route:"/games/tafsir/ayah-story", mechanic:"مشاهد وسياق موثق فقط", questionType:"story_context", ageRange:[6,12], status:"blocked_content" },
  { id:"what-happened-first", title:"ماذا حدث أولًا؟", world:"stories", worldLabel:"مدينة القصص", route:"/games/tafsir/what-happened-first", mechanic:"ترتيب مشاهد موثقة", questionType:"story_order", ageRange:[6,12], status:"blocked_content" },
  { id:"complete-story", title:"أكمل القصة", world:"stories", worldLabel:"مدينة القصص", route:"/games/tafsir/complete-story", mechanic:"اختيار الحدث التالي من سياق موثق", questionType:"story_next", ageRange:[6,12], status:"blocked_content" },
  { id:"who-is-meant", title:"من المقصود؟", world:"stories", worldLabel:"مدينة القصص", route:"/games/tafsir/who-is-meant", mechanic:"تحديد المقصود من النص أو التفسير الموثق", questionType:"who_is_meant", ageRange:[8,12], status:"blocked_content" },
  { id:"where-did-it-happen", title:"أين حدث هذا؟", world:"stories", worldLabel:"مدينة القصص", route:"/games/tafsir/where-did-it-happen", mechanic:"اختيار المكان فقط عند وجود دليل معتبر", questionType:"where", ageRange:[8,12], status:"blocked_content" },
  { id:"who-said-it", title:"من قالها؟", world:"stories", worldLabel:"مدينة القصص", route:"/games/tafsir/who-said-it", mechanic:"ربط القول بصاحبه وفق مصدر موثق", questionType:"who_said", ageRange:[7,12], status:"blocked_content" },
  { id:"who-did-what", title:"من يفعل ماذا؟", world:"lab", worldLabel:"مختبر التدبر والفهم", route:"/games/tafsir/who-did-what", mechanic:"سحب الفعل إلى الشخصية الصحيحة", questionType:"actor_action", ageRange:[7,12], status:"blocked_content" },
  { id:"cause-and-result", title:"اربط السبب بالنتيجة", world:"lab", worldLabel:"مختبر التدبر والفهم", route:"/games/tafsir/cause-and-result", mechanic:"وصل السبب بالنتيجة عندما تكون العلاقة واضحة وموثقة", questionType:"cause_result", ageRange:[8,12], status:"blocked_content" },
  { id:"why", title:"لماذا؟", world:"lab", worldLabel:"مختبر التدبر والفهم", route:"/games/tafsir/why", mechanic:"اختيار السبب الصحيح فقط عند وجود سبب موثق", questionType:"why", ageRange:[8,12], status:"blocked_content" },
  { id:"surah-journey", title:"رحلة داخل السورة", world:"lab", worldLabel:"مختبر التدبر والفهم", route:"/games/tafsir/surah-journey", mechanic:"خريطة موضوعات السورة في محطات مترابطة", questionType:"surah_theme", ageRange:[8,12], status:"blocked_content" },
  { id:"word-changes-meaning", title:"كلمة تغيّر المعنى", world:"lab", worldLabel:"مختبر التدبر والفهم", route:"/games/tafsir/word-changes-meaning", mechanic:"تمييز أثر السياق بين كلمات متقاربة", questionType:"context_word", ageRange:[10,12], status:"blocked_content" },
  { id:"find-meaning-error", title:"اكتشف الخطأ", world:"lab", worldLabel:"مختبر التدبر والفهم", route:"/games/tafsir/find-meaning-error", mechanic:"ثلاث بطاقات ومعنى واحد خاطئ", questionType:"meaning_error", ageRange:[8,12], status:"blocked_content" },
  { id:"tafsir-maze", title:"متاهة التفسير", world:"lab", worldLabel:"مختبر التدبر والفهم", route:"/games/tafsir/tafsir-maze", mechanic:"أبواب فهم صحيحة تفتح الطريق وخطأ يعيد خطوة مع تلميح", questionType:"tafsir_maze", ageRange:[8,12], status:"blocked_content" },
  { id:"meaning-ladder", title:"سلم المعنى", world:"treasure", worldLabel:"كنز الهدايات", route:"/games/tafsir/meaning-ladder", mechanic:"اقرأ ثم الكلمة ثم المعنى ثم الموقف ثم الهداية", questionType:"meaning_ladder", ageRange:[8,12], status:"blocked_content" },
]);

export function tafsirGameDefinition(id){return TAFSIR_GAME_DEFINITIONS.find(game=>game.id===id)||null;}
export function tafsirGamesByWorld(world){return TAFSIR_GAME_DEFINITIONS.filter(game=>game.world===world);}

function ageYears(child){
  const raw=Number(child?.age_years ?? child?.ageYears);
  if(Number.isFinite(raw)&&raw>=3&&raw<=12)return raw;
  const band=String(child?.age_band||child?.ageBand||"7-9");
  if(band==="3-6")return 5;
  if(band==="10-12")return 11;
  return 8;
}

function normalizeAnswer(answer){
  if(answer==null)return null;
  if(typeof answer==="object"&&"value" in answer)return answer;
  return {value:answer,label:String(answer)};
}

export async function getApprovedTafsirQuestions({gameId,child,difficulty=null,limit=24}={}){
  if(!gameId)return [];
  const age=ageYears(child);
  const params=[
    `game_id=eq.${encodeURIComponent(gameId)}`,
    "approval_status=eq.approved",
    `age_min=lte.${age}`,
    `age_max=gte.${age}`,
  ];
  if(difficulty)params.push(`difficulty=eq.${encodeURIComponent(difficulty)}`);
  params.push("select=id,content_id,game_id,question_type,difficulty,age_min,age_max,prompt,correct_answer,distractors,interaction_config,audio_reference,image_reference,tags,tafsir_content!inner(id,surah_number,ayah_start,ayah_end,source_name,source_author,source_reference,source_url,source_text,child_friendly_explanation,guidance_summary,tags,approval_status)");
  params.push(`limit=${Math.max(1,Math.min(50,Number(limit)||24))}`);
  const rows=await rest(`/tafsir_questions?${params.join("&")}`);
  const normalized=[];
  for(const row of rows||[]){
    const content=Array.isArray(row.tafsir_content)?row.tafsir_content[0]:row.tafsir_content;
    if(!content||content.approval_status!=="approved")continue;
    const ayah=await getAyah(content.surah_number,content.ayah_start);
    if(!ayah)continue;
    normalized.push({
      contentId:content.id,
      questionId:row.id,
      gameId:row.game_id,
      surahNumber:content.surah_number,
      ayahNumber:content.ayah_start,
      ayahEnd:content.ayah_end,
      ayahText:ayah.text,
      difficulty:row.difficulty,
      ageRange:[row.age_min,row.age_max],
      questionType:row.question_type,
      prompt:row.prompt,
      correctAnswer:normalizeAnswer(row.correct_answer),
      distractors:Array.isArray(row.distractors)?row.distractors.map(normalizeAnswer):[],
      interactionConfig:row.interaction_config||{},
      childFriendlyExplanation:content.child_friendly_explanation,
      guidanceSummary:content.guidance_summary||null,
      sourceName:content.source_name,
      sourceAuthor:content.source_author,
      sourceReference:content.source_reference,
      sourceUrl:content.source_url||null,
      sourceText:content.source_text,
      audioReference:row.audio_reference||null,
      imageReference:row.image_reference||null,
      tags:[...(content.tags||[]),...(row.tags||[])],
    });
  }
  return normalized;
}

export async function recordTafsirAnswer({childId,question,correct,usedHint=false,responseTimeMs=null,metadata={}}){
  if(!childId||!question?.contentId||!question?.questionId)throw new Error("بيانات سؤال الفهم غير مكتملة.");
  return rpc("record_tafsir_game_event",{
    p_child_id:childId,
    p_content_id:question.contentId,
    p_question_id:question.questionId,
    p_game_id:question.gameId,
    p_question_type:question.questionType,
    p_is_correct:Boolean(correct),
    p_used_hint:Boolean(usedHint),
    p_response_time_ms:responseTimeMs==null?null:Math.max(0,Math.round(responseTimeMs)),
    p_metadata:metadata||{},
  });
}

export async function dueTafsirReview(childId,limit=20){
  if(!childId)return [];
  const bounded=Math.max(1,Math.min(100,Number(limit)||20));
  return rest(`/tafsir_review_queue?child_id=eq.${encodeURIComponent(childId)}&next_review_at=lte.${encodeURIComponent(new Date().toISOString())}&select=*&order=priority.desc,last_error_at.desc&limit=${bounded}`);
}
