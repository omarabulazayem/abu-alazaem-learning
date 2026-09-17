import { rest, rpc } from "./api.js";
import { getAyah } from "./quranCorpus.js";
export { TAFSIR_STATUS, TAFSIR_GAME_DEFINITIONS, tafsirGameDefinition, tafsirGamesByWorld } from "./tafsirRegistry.js";

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
