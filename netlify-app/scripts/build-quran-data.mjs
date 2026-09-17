import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "quran");
const TEXT_URLS = [
  "https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt&agree=true",
  "https://raw.githubusercontent.com/Mushaf-Learning/quran-text/af982bc35c986c06261c10afdf9751e711bcbf6e/uthmani/quran-uthmani.txt",
];
const META_URLS = [
  "https://tanzil.net/res/text/metadata/quran-data.xml",
  "https://raw.githubusercontent.com/Mushaf-Learning/quran-text/af982bc35c986c06261c10afdf9751e711bcbf6e/metadata/quran-data.xml",
];

async function fetchFirst(urls, label) {
  let last;
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Abu-Alazaem-QuranData-Build/1.0" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const text = await response.text();
      if (!text.trim()) throw new Error("empty response");
      console.log(`[QuranData] ${label}: ${url}`);
      return { text, url };
    } catch (error) {
      last = error;
      console.warn(`[QuranData] ${label} source failed: ${url} — ${error.message}`);
    }
  }
  throw new Error(`Unable to fetch ${label}: ${last?.message || "unknown error"}`);
}

function attrs(line) {
  const out = {};
  for (const m of line.matchAll(/([a-zA-Z_]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function parseTags(xml, tag) {
  const re = new RegExp(`<${tag}\\s+[^>]*\\/>`, "g");
  return [...xml.matchAll(re)].map(m => attrs(m[0]));
}

function integer(value) { return Number.parseInt(value, 10); }

function toGlobalIndex(boundary, suraMap) {
  const sura = suraMap.get(integer(boundary.sura));
  if (!sura) throw new Error(`Unknown sura in metadata boundary: ${boundary.sura}`);
  return sura.start + integer(boundary.aya) - 1;
}

function assignBoundary(globalIndex, boundaries, suraMap) {
  let current = boundaries[0];
  for (const boundary of boundaries) {
    if (toGlobalIndex(boundary, suraMap) <= globalIndex) current = boundary;
    else break;
  }
  return current ? integer(current.index) : null;
}

function splitWords(text) {
  return text.trim().split(/\s+/u).filter(Boolean).map((word, index) => ({ position: index + 1, text: word }));
}

await fs.mkdir(OUT_DIR, { recursive: true });
const [{ text: rawText, url: textSource }, { text: xml, url: metadataSource }] = await Promise.all([
  fetchFirst(TEXT_URLS, "Tanzil Uthmani text"),
  fetchFirst(META_URLS, "Tanzil metadata"),
]);

const textSha256 = crypto.createHash("sha256").update(rawText, "utf8").digest("hex");
const verseLines = rawText.split(/\r?\n/u).map(x => x.trim()).filter(x => x && !x.startsWith("#"));
const suras = parseTags(xml, "sura").map(x => ({
  number: integer(x.index),
  name: x.name,
  transliteration: x.tname,
  englishName: x.ename,
  revelationType: x.type,
  revelationOrder: integer(x.order),
  rukus: integer(x.rukus),
  ayahCount: integer(x.ayas),
  start: integer(x.start),
}));
const suraMap = new Map(suras.map(s => [s.number, s]));
const expected = suras.reduce((sum, s) => sum + s.ayahCount, 0);
if (suras.length !== 114) throw new Error(`QuranData integrity failure: expected 114 surahs, got ${suras.length}`);
if (expected !== 6236) throw new Error(`QuranData integrity failure: metadata totals ${expected} ayahs instead of 6236`);
if (verseLines.length !== expected) throw new Error(`QuranData integrity failure: text has ${verseLines.length} ayahs; metadata expects ${expected}`);

const pages = parseTags(xml, "page");
const juzs = parseTags(xml, "juz");
const hizbs = parseTags(xml, "hizb");
const quarters = parseTags(xml, "quarter");
if (!pages.length || !juzs.length || !hizbs.length || !quarters.length) throw new Error("QuranData metadata is missing page/juz/hizb/quarter boundaries");

const verses = [];
for (const surah of suras) {
  for (let ayah = 1; ayah <= surah.ayahCount; ayah++) {
    const globalIndex = surah.start + ayah - 1;
    const text = verseLines[globalIndex];
    const words = splitWords(text);
    verses.push({
      key: `${surah.number}:${ayah}`,
      surahNumber: surah.number,
      surahName: surah.name,
      ayahNumber: ayah,
      orderInSurah: ayah,
      globalIndex: globalIndex + 1,
      text,
      page: assignBoundary(globalIndex, pages, suraMap),
      juz: assignBoundary(globalIndex, juzs, suraMap),
      hizb: assignBoundary(globalIndex, hizbs, suraMap),
      rub: assignBoundary(globalIndex, quarters, suraMap),
      words,
      beginning: words.slice(0, Math.min(3, words.length)).map(w => w.text),
      ending: words.slice(Math.max(0, words.length - 3)).map(w => w.text),
    });
  }
}

const data = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    text: "Tanzil Quran Text (Uthmani)",
    textUrl: textSource,
    metadata: "Tanzil Quran Metadata",
    metadataUrl: metadataSource,
    canonicalSource: "https://tanzil.net",
    license: "Creative Commons Attribution 3.0",
    rule: "Verbatim Quran text. Do not edit generated verse text.",
    sha256: textSha256,
  },
  stats: { surahs: suras.length, ayahs: verses.length, pages: pages.length, juzs: juzs.length, hizbs: hizbs.length, rubs: quarters.length },
  surahs: suras.map(({ start, ...s }) => s),
  verses,
};

await fs.writeFile(path.join(OUT_DIR, "quran-data.json"), JSON.stringify(data), "utf8");
await fs.writeFile(path.join(OUT_DIR, "SOURCE.txt"), `Quran text provided by Tanzil Project (https://tanzil.net)\nLicense: Creative Commons Attribution 3.0\nSHA-256 of fetched source: ${textSha256}\nText is copied verbatim into quran-data.json.\n`, "utf8");
console.log(`[QuranData] built ${verses.length} ayahs, ${suras.length} surahs; sha256=${textSha256}`);
