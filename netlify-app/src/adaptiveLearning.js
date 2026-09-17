export const ADAPTIVE_VERSION = 1;
export const DIFFICULTIES = ["easy", "medium", "hard"];

function hash(input) {
  let h = 2166136261;
  for (const ch of String(input)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let x = hash(seed) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

export function seededShuffle(items, seed) {
  const out = [...items];
  const random = rng(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function childAgeYears(child) {
  const exact = Number(child?.age_years);
  if (exact >= 3 && exact <= 18) return exact;
  const band = String(child?.age_band || "");
  if (band.startsWith("3-") || band.startsWith("4-")) return 5;
  if (band.startsWith("7-")) return 8;
  if (band.startsWith("10-")) return 11;
  return 8;
}

export function recommendDifficulty({ child, progress = null, manual = "auto" } = {}) {
  if (DIFFICULTIES.includes(manual)) return manual;
  const age = childAgeYears(child);
  const mastery = Number(progress?.mastery_score || 0);
  const completions = Number(progress?.completions || 0);
  if (age <= 6) return "easy";
  if (completions >= 2 && mastery < 58) return "easy";
  if (age >= 10 && completions >= 3 && mastery >= 88) return "hard";
  if (age >= 7 && completions >= 4 && mastery >= 94) return "hard";
  return "medium";
}

export function challengeCountForDifficulty(difficulty) {
  if (difficulty === "hard") return 7;
  if (difficulty === "medium") return 6;
  return 5;
}

export function suggestNextDifficulty(difficulty, accuracy) {
  const order = ["easy", "medium", "hard"];
  const index = Math.max(0, order.indexOf(difficulty));
  if (Number(accuracy) >= 90 && index < 2) return order[index + 1];
  if (Number(accuracy) < 58 && index > 0) return order[index - 1];
  return difficulty;
}

function verseKey(surah, ayah) {
  return `${Number(surah)}:${Number(ayah)}`;
}

function verseBy(quran, surah, ayah) {
  return quran.verses.find(v => v.surahNumber === Number(surah) && v.ayahNumber === Number(ayah)) || null;
}

function eligible(quran, verse, kind) {
  if (!verse) return false;
  const words = Array.isArray(verse.words) ? verse.words : [];
  if (kind === "next_ayah") return verse.ayahNumber > 1 && Boolean(verseBy(quran, verse.surahNumber, verse.ayahNumber - 1));
  if (kind === "ayah_beginning") return words.length >= 5;
  if (kind === "missing_word") return words.length >= 4;
  if (kind === "word_order") return words.length >= 4;
  if (kind === "surah_name") return true;
  return false;
}

function reviewScore(row) {
  return Number(row.priority || 0) * 100
    + Number(row.error_count || 0) * 20
    - Number(row.correct_recovery_count || 0) * 12
    + (row.last_error_at ? 5 : 0);
}

function chooseKind(quran, verse, kinds, index) {
  for (let offset = 0; offset < kinds.length; offset += 1) {
    const kind = kinds[(index + offset) % kinds.length];
    if (eligible(quran, verse, kind)) return kind;
  }
  return null;
}

export function createAdaptivePlan({
  gameId,
  quran,
  surahNumbers = [],
  reviewQueue = [],
  recentKeys = [],
  difficulty = "medium",
  kinds = ["next_ayah"],
  seed = "session",
} = {}) {
  const count = challengeCountForDifficulty(difficulty);
  const recent = new Set(recentKeys.map(String));
  const usedIdentity = new Set();
  const usedVerse = new Set();
  const plan = [];
  const studied = new Set(surahNumbers.map(Number));
  const eligibleVerses = quran.verses.filter(v => studied.has(Number(v.surahNumber)) && kinds.some(kind => eligible(quran, v, kind)));
  if (!eligibleVerses.length) throw new Error("لا توجد آيات مناسبة لهذا النوع من التدريب بعد.");

  const reviewGoal = Math.round(count * 0.5);
  const reviewRows = seededShuffle([...reviewQueue].sort((a, b) => reviewScore(b) - reviewScore(a)), `${seed}:review`);
  for (const row of reviewRows) {
    if (plan.length >= reviewGoal) break;
    const verse = verseBy(quran, row.surah_number, row.ayah_number);
    const kind = chooseKind(quran, verse, kinds, plan.length);
    if (!kind) continue;
    const identity = `${verse.key}:${kind}`;
    if (usedIdentity.has(identity) || usedVerse.has(verse.key)) continue;
    usedIdentity.add(identity);
    usedVerse.add(verse.key);
    plan.push({
      surahNumber: verse.surahNumber,
      ayahNumber: verse.ayahNumber,
      kind,
      source: "review_queue",
      reviewPriority: Number(row.priority || 0),
      seed: `${seed}:r:${plan.length}`,
    });
  }

  const fresh = seededShuffle(eligibleVerses.filter(v => !recent.has(v.key)), `${seed}:fresh`);
  const fallback = seededShuffle(eligibleVerses, `${seed}:fallback`);
  let cursor = 0;
  while (plan.length < count && fresh.length && cursor < fresh.length * Math.max(4, kinds.length)) {
    const verse = fresh[cursor % fresh.length];
    const kind = chooseKind(quran, verse, kinds, cursor);
    cursor += 1;
    if (!kind) continue;
    const identity = `${verse.key}:${kind}`;
    if (usedIdentity.has(identity) || usedVerse.has(verse.key)) continue;
    usedIdentity.add(identity);
    usedVerse.add(verse.key);
    plan.push({ surahNumber: verse.surahNumber, ayahNumber: verse.ayahNumber, kind, source: "learning_pool", reviewPriority: 0, seed: `${seed}:f:${plan.length}` });
  }

  cursor = 0;
  while (plan.length < count && fallback.length && cursor < fallback.length * Math.max(6, kinds.length * 2)) {
    const verse = fallback[cursor % fallback.length];
    const kind = chooseKind(quran, verse, kinds, cursor);
    cursor += 1;
    if (!kind || usedVerse.has(verse.key)) continue;
    const identity = `${verse.key}:${kind}`;
    if (usedIdentity.has(identity)) continue;
    usedIdentity.add(identity);
    usedVerse.add(verse.key);
    plan.push({ surahNumber: verse.surahNumber, ayahNumber: verse.ayahNumber, kind, source: "learning_pool", reviewPriority: 0, seed: `${seed}:x:${plan.length}` });
  }

  // Only reuse the same ayah in a different interaction when the studied pool is too small
  // to reach the minimum round length. This keeps normal rounds non-repetitive.
  cursor = 0;
  while (plan.length < count && fallback.length && cursor < fallback.length * Math.max(8, kinds.length * 3)) {
    const verse = fallback[cursor % fallback.length];
    const kind = chooseKind(quran, verse, kinds, cursor);
    cursor += 1;
    if (!kind) continue;
    const identity = `${verse.key}:${kind}`;
    if (usedIdentity.has(identity)) continue;
    usedIdentity.add(identity);
    plan.push({ surahNumber: verse.surahNumber, ayahNumber: verse.ayahNumber, kind, source: "learning_pool", reviewPriority: 0, seed: `${seed}:reuse:${plan.length}` });
  }

  if (plan.length < Math.min(5, count)) throw new Error("المحتوى الذي درسه الطفل لا يكفي لجولة متنوعة حتى الآن.");
  return plan.slice(0, count);
}

function optionCount(difficulty) {
  return difficulty === "easy" ? 3 : 4;
}

function surahName(surah) {
  return surah?.nameArabic || surah?.name || surah?.arabicName || `سورة ${surah?.number || ""}`;
}

function uniqueByLabel(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = String(item.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shuffleOptions(items, seed) {
  return seededShuffle(uniqueByLabel(items), seed);
}

export function hydrateAdaptiveChallenge(quran, descriptor, difficulty = "medium") {
  const verse = verseBy(quran, descriptor.surahNumber, descriptor.ayahNumber);
  if (!verse) throw new Error("تعذر العثور على الآية المرجعية في QuranData.");
  const count = optionCount(difficulty);
  const sameSurah = quran.verses.filter(v => v.surahNumber === verse.surahNumber && v.key !== verse.key);
  const words = verse.words || [];
  const base = {
    id: `${descriptor.surahNumber}:${descriptor.ayahNumber}:${descriptor.kind}:${descriptor.seed}`,
    descriptor,
    kind: descriptor.kind,
    source: descriptor.source,
    surahNumber: verse.surahNumber,
    ayahNumber: verse.ayahNumber,
    verse,
    optionCount: count,
  };

  if (descriptor.kind === "next_ayah") {
    const prompt = verseBy(quran, verse.surahNumber, verse.ayahNumber - 1);
    const distractors = seededShuffle(sameSurah.filter(v => v.key !== prompt?.key), `${descriptor.seed}:d`)
      .slice(0, count - 1)
      .map(v => ({ id: v.key, label: v.text }));
    const options = shuffleOptions([{ id: verse.key, label: verse.text }, ...distractors], `${descriptor.seed}:o`);
    return { ...base, promptText: prompt?.text || "", answerId: verse.key, answerLabel: verse.text, options, hint: `تبدأ الإجابة بـ: ${words.slice(0, 2).map(w => w.text).join(" ") || verse.text.slice(0, 12)}` };
  }

  if (descriptor.kind === "ayah_beginning") {
    const take = difficulty === "easy" ? Math.min(3, Math.max(2, Math.floor(words.length / 2))) : 2;
    const correct = words.slice(0, take).map(w => w.text).join(" ");
    const ending = words.slice(take).map(w => w.text).join(" ");
    const distractors = seededShuffle(sameSurah.filter(v => (v.words || []).length >= take), `${descriptor.seed}:d`)
      .slice(0, count - 1)
      .map(v => ({ id: `${v.key}:start`, label: v.words.slice(0, take).map(w => w.text).join(" ") }));
    const options = shuffleOptions([{ id: `${verse.key}:start`, label: correct }, ...distractors], `${descriptor.seed}:o`);
    return { ...base, promptText: `… ${ending}`, answerId: `${verse.key}:start`, answerLabel: correct, options, hint: `أول كلمة هي: ${words[0]?.text || ""}` };
  }

  if (descriptor.kind === "missing_word") {
    const valid = words.map((word, index) => ({ word, index })).filter(item => item.index > 0 && item.index < words.length - 1);
    const target = valid[hash(descriptor.seed) % valid.length];
    const otherWords = seededShuffle(
      sameSurah.flatMap(v => (v.words || []).map(w => w.text)).filter(text => text !== target.word.text),
      `${descriptor.seed}:d`,
    );
    const options = shuffleOptions(
      [{ id: `answer:${target.word.text}`, label: target.word.text }, ...otherWords.slice(0, count - 1).map((text, index) => ({ id: `d:${index}:${text}`, label: text }))],
      `${descriptor.seed}:o`,
    );
    return {
      ...base,
      promptText: words.map((word, index) => index === target.index ? "ــــــ" : word.text).join(" "),
      answerId: `answer:${target.word.text}`,
      answerLabel: target.word.text,
      options,
      hint: `الكلمة تبدأ بحرف: ${target.word.text.slice(0, 1)}`,
    };
  }

  if (descriptor.kind === "surah_name") {
    const surah = quran.surahs.find(s => Number(s.number) === Number(verse.surahNumber));
    const others = seededShuffle(quran.surahs.filter(s => Number(s.number) !== Number(verse.surahNumber)), `${descriptor.seed}:s`).slice(0, count - 1);
    const options = shuffleOptions(
      [{ id: String(verse.surahNumber), label: surahName(surah) }, ...others.map(s => ({ id: String(s.number), label: surahName(s) }))],
      `${descriptor.seed}:o`,
    );
    return { ...base, promptText: verse.text, answerId: String(verse.surahNumber), answerLabel: surahName(surah), options, hint: `رقم السورة في المصحف: ${verse.surahNumber}` };
  }

  if (descriptor.kind === "word_order") {
    const chunks = [];
    if (difficulty === "easy") {
      const size = Math.ceil(words.length / 4);
      for (let i = 0; i < words.length; i += size) chunks.push(words.slice(i, i + size).map(w => w.text).join(" "));
    } else if (difficulty === "medium") {
      for (let i = 0; i < words.length; i += 2) chunks.push(words.slice(i, i + 2).map(w => w.text).join(" "));
    } else {
      chunks.push(...words.map(w => w.text));
    }
    const pieces = chunks.map((label, index) => ({ id: `p${index}`, label }));
    return {
      ...base,
      promptText: "رتّب القطع لتكوين الآية بالترتيب الصحيح",
      pieces: seededShuffle(pieces, `${descriptor.seed}:p`),
      answerOrder: pieces.map(piece => piece.id),
      answerLabel: verse.text,
      hint: `ابدأ بالقطعة: ${pieces[0]?.label || ""}`,
    };
  }

  throw new Error(`نوع سؤال غير مدعوم: ${descriptor.kind}`);
}

export function recentAyahKeys(events = []) {
  return events
    .filter(event => event.surah_number != null && event.ayah_number != null)
    .map(event => verseKey(event.surah_number, event.ayah_number));
}

export function adaptiveResumeState({ gameId, difficulty, plan, index, attempt, wrongKeys, startedAt }) {
  return {
    adaptiveVersion: ADAPTIVE_VERSION,
    gameId,
    difficulty,
    plan,
    index,
    attempt,
    wrongKeys: [...new Set(wrongKeys || [])],
    startedAt,
  };
}

export function isAdaptiveResumeState(state, gameId) {
  return Boolean(
    state
    && state.adaptiveVersion === ADAPTIVE_VERSION
    && state.gameId === gameId
    && Array.isArray(state.plan)
    && state.plan.length >= 1,
  );
}
