let cachePromise = null;

function assetUrl(path) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  return `${base}${String(path).replace(/^\/+/, "")}`;
}

export async function loadQuranData() {
  if (!cachePromise) {
    cachePromise = fetch(assetUrl("quran/quran-data.json"), { cache: "force-cache" })
      .then(async response => {
        if (!response.ok) throw new Error(`QuranData unavailable (${response.status})`);
        const data = await response.json();
        if (data?.stats?.surahs !== 114 || data?.stats?.ayahs !== 6236 || !Array.isArray(data?.verses)) {
          throw new Error("QuranData failed integrity checks.");
        }
        return data;
      })
      .catch(error => {
        cachePromise = null;
        throw error;
      });
  }
  return cachePromise;
}

export async function getQuranSurah(surahNumber) {
  const data = await loadQuranData();
  const number = Number(surahNumber);
  return data.surahs.find(s => s.number === number) || null;
}

export async function getSurahAyahs(surahNumber) {
  const data = await loadQuranData();
  const number = Number(surahNumber);
  return data.verses.filter(v => v.surahNumber === number);
}

export async function getAyah(surahNumber, ayahNumber) {
  const data = await loadQuranData();
  const key = `${Number(surahNumber)}:${Number(ayahNumber)}`;
  return data.verses.find(v => v.key === key) || null;
}

export async function getAyahsByKeys(keys = []) {
  const wanted = new Set(keys.map(String));
  const data = await loadQuranData();
  return data.verses.filter(v => wanted.has(v.key));
}

export function ayahWords(ayah) {
  return Array.isArray(ayah?.words) ? ayah.words.map(w => ({ ...w })) : [];
}

export function splitAyahIntoChunks(ayah, targetChunks = 4) {
  const words = ayahWords(ayah);
  if (!words.length) return [];
  const count = Math.max(2, Math.min(targetChunks, words.length));
  const size = Math.ceil(words.length / count);
  const chunks = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push({ startPosition: words[i].position, endPosition: words[Math.min(words.length - 1, i + size - 1)].position, text: words.slice(i, i + size).map(w => w.text).join(" ") });
  }
  return chunks;
}

export function makeAyahQuestionPool(verses, current, count = 4) {
  const others = verses.filter(v => v.key !== current.key);
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, Math.max(0, count - 1));
  return [...shuffled, current].sort(() => Math.random() - 0.5);
}

export async function quranSourceInfo() {
  const data = await loadQuranData();
  return data.source;
}
