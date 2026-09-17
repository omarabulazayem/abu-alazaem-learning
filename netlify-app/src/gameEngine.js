import { rest, rpc } from "./api.js";
import { gameDefinition } from "./gameDefinitions.js";

export class GameEngine {
  constructor({ childId, gameId, teacherPreview = false }) {
    this.childId = childId || null;
    this.gameId = gameId;
    this.teacherPreview = Boolean(teacherPreview);
    this.definition = gameDefinition(gameId);
    if (!this.definition) throw new Error(`Unknown game definition: ${gameId}`);
    if (this.definition.status !== "implemented") throw new Error(`Game is not implemented yet: ${gameId}`);
    this.session = null;
    this.local = {
      score: 0,
      stars: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      hintsUsed: 0,
      elapsedTime: 0,
      completed: false,
      earnedRewards: {},
    };
  }

  async start({ difficulty = "easy", surahNumber = null, ayahNumbers = [] } = {}) {
    if (this.teacherPreview) {
      this.session = { id: `preview:${this.gameId}:${Date.now()}`, game_id: this.gameId, difficulty, surah_number: surahNumber, selected_ayahs: ayahNumbers, preview: true };
      return this.session;
    }
    if (!this.childId) throw new Error("لا يوجد طفل نشط لبدء اللعبة.");
    const result = await rpc("start_game_session", {
      p_child_id: this.childId,
      p_game_id: this.gameId,
      p_game_name: this.definition.title,
      p_game_type: this.definition.educationalGoal || "quran_game",
      p_difficulty: difficulty,
      p_surah_number: surahNumber,
      p_selected_ayahs: ayahNumbers,
    });
    this.session = Array.isArray(result) ? result[0] : result;
    return this.session;
  }

  async recordAnswer({ surahNumber = null, ayahNumber = null, questionType, correct, usedHint = false, responseTimeMs = null, metadata = {} }) {
    if (!this.session) throw new Error("ابدأ اللعبة أولًا.");
    if (correct) this.local.correctAnswers += 1; else this.local.wrongAnswers += 1;
    if (usedHint) this.local.hintsUsed += 1;
    if (this.teacherPreview) return { ...this.local };
    const result = await rpc("record_game_ayah_event", {
      p_session_id: this.session.id,
      p_surah_number: surahNumber == null ? null : Number(surahNumber),
      p_ayah_number: ayahNumber == null ? null : Number(ayahNumber),
      p_question_type: questionType || "unknown",
      p_is_correct: Boolean(correct),
      p_used_hint: Boolean(usedHint),
      p_response_time_ms: responseTimeMs == null ? null : Math.max(0, Math.round(responseTimeMs)),
      p_metadata: metadata || {},
    });
    this.session = Array.isArray(result) ? result[0] : result;
    return this.session;
  }

  async save(resumeState, elapsedSeconds = null) {
    if (!this.session || this.teacherPreview) return this.session;
    const result = await rpc("save_game_state", {
      p_session_id: this.session.id,
      p_resume_state: resumeState || {},
      p_elapsed_seconds: elapsedSeconds == null ? null : Math.max(0, Math.round(elapsedSeconds)),
    });
    this.session = Array.isArray(result) ? result[0] : result;
    return this.session;
  }

  async complete({ elapsedSeconds = null, resumeState = {} } = {}) {
    if (!this.session) throw new Error("ابدأ اللعبة أولًا.");
    if (this.teacherPreview) {
      const total = this.local.correctAnswers + this.local.wrongAnswers;
      const accuracy = total ? this.local.correctAnswers / total : 0;
      this.local.score = Math.max(0, this.local.correctAnswers * 10 - this.local.hintsUsed * 3 + 20 + (accuracy >= .9 ? 30 : 0));
      this.local.stars = 1 + (accuracy >= .75 ? 1 : 0) + (accuracy >= .9 && this.local.hintsUsed <= 1 ? 1 : 0);
      this.local.completed = true;
      return { ...this.local, preview: true };
    }
    const result = await rpc("complete_game_session", {
      p_session_id: this.session.id,
      p_elapsed_seconds: elapsedSeconds == null ? null : Math.max(0, Math.round(elapsedSeconds)),
      p_resume_state: resumeState || {},
    });
    this.session = Array.isArray(result) ? result[0] : result;
    return this.session;
  }

  static async latestIncomplete(childId, gameId) {
    if (!childId || !gameId) return null;
    const rows = await rest(`/game_sessions?child_id=eq.${encodeURIComponent(childId)}&game_id=eq.${encodeURIComponent(gameId)}&completed=eq.false&select=*&order=updated_at.desc&limit=1`);
    return rows?.[0] || null;
  }

  static async progress(childId, gameId = null) {
    if (!childId) return [];
    const gameFilter = gameId ? `&game_id=eq.${encodeURIComponent(gameId)}` : "";
    return rest(`/game_progress?child_id=eq.${encodeURIComponent(childId)}${gameFilter}&select=*&order=last_played_at.desc.nullslast`);
  }

  static async dueReview(childId, limit = 20) {
    if (!childId) return [];
    return rest(`/review_queue?child_id=eq.${encodeURIComponent(childId)}&next_review_at=lte.${encodeURIComponent(new Date().toISOString())}&select=*&order=priority.desc,last_error_at.desc&limit=${Math.max(1, Math.min(100, Number(limit) || 20))}`);
  }
}

export function gameResultSummary(session) {
  if (!session) return null;
  const correct = Number(session.correct_answers ?? session.correctAnswers ?? 0);
  const wrong = Number(session.wrong_answers ?? session.wrongAnswers ?? 0);
  const total = correct + wrong;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  return {
    score: Number(session.score || 0),
    stars: Number(session.stars || 0),
    correct,
    wrong,
    hints: Number(session.hints_used ?? session.hintsUsed ?? 0),
    accuracy,
    rewardAwarded: session.reward_awarded ?? true,
  };
}
