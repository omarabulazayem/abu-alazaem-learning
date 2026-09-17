import { NEW_QURAN_GAME_DEFINITIONS } from "./newGameDefinitions.js";

export const QURAN_GAME_DEFINITIONS = [
  { id:"quran-wheel", title:"العجلة الدوارة", icon:"target", description:"لف العجلة وخذ تحديًا قرآنيًا متجددًا.", ageRange:[4,12], educationalGoal:"الاستدعاء والمراجعة المتنوعة", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["next_ayah","complete_ayah","ayah_beginning","ayah_order"], requiredData:["ayah_text","surah","words"], rewards:{completion:true,mastery:true}, scene:"wheel", route:"/games/quran-wheel" },
  { id:"forgetfulness-dungeon", title:"سرداب النسيان", icon:"lock", description:"افتح أبواب السرداب بحل ألغاز الحفظ.", ageRange:[7,12], educationalGoal:"تثبيت الحفظ وكشف نقاط الضعف", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["next_ayah","missing_word","ayah_order","surah_name","beginning_ending"], requiredData:["ayah_text","words","review_queue"], rewards:{completion:true,mastery:true}, scene:"dungeon", route:"/games/dungeon" },
  { id:"listen-memorize", title:"الاستماع والحفظ", icon:"review", description:"تلقين وترديد وتكملة وترتيب وتسميع.", ageRange:[4,12], educationalGoal:"التلقين السمعي والتكرار", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["listen","repeat","fade_complete","word_order","recite"], requiredData:["ayah_text","words","audio"], rewards:{completion:true}, scene:"studio", route:"/games/listen" },
  { id:"page-lines", title:"رتّب سطور الصفحة", icon:"quran", description:"ثبّت الذاكرة البصرية بترتيب سطور الصفحة.", ageRange:[7,12], educationalGoal:"الحفظ البصري", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["line_order"], requiredData:["page","line_layout"], rewards:{completion:true,mastery:true}, scene:"library", route:"/games/page-lines" },
  { id:"knowledge-bridge", title:"جسر المعرفة", icon:"target", description:"كل إجابة صحيحة تبني قطعة من الجسر.", ageRange:[4,10], educationalGoal:"الاسترجاع التدريجي", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["complete_ayah","next_ayah"], requiredData:["ayah_text","words"], rewards:{completion:true}, scene:"bridge", route:"/games/bridge" },
  { id:"ayah-burger", title:"صانع البرجر", icon:"order", description:"رتّب أجزاء الآية لبناء الطبقات بالترتيب.", ageRange:[4,9], educationalGoal:"ترتيب أجزاء الآية", difficultyLevels:["easy","medium"], supportedQuestionTypes:["chunk_order"], requiredData:["ayah_text","words"], rewards:{completion:true}, scene:"kitchen", route:"/games/burger" },
  { id:"quran-detective", title:"المحقق القرآني", icon:"search", description:"اكتشف الفروق والمتشابهات من الأدلة.", ageRange:[9,12], educationalGoal:"تمييز المتشابهات", difficultyLevels:["medium","hard","advanced"], supportedQuestionTypes:["similar_words","surah_location"], requiredData:["ayah_text","similarity_database"], rewards:{completion:true,mastery:true}, scene:"detective", route:"/games/detective" },
  { id:"word-train", title:"قطار الكلمات", icon:"order", description:"رتّب عربات الكلمات أو الآيات ثم حرّك القطار.", ageRange:[4,10], educationalGoal:"ترتيب الكلمات والآيات", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["word_order","ayah_order"], requiredData:["ayah_text","words"], rewards:{completion:true}, scene:"station", route:"/games/train" },
  { id:"guess-surah", title:"خمّن السورة", icon:"search", description:"تعرف على السورة من آية أو مقطع مسموع.", ageRange:[7,12], educationalGoal:"ربط الآية بسورتها", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["surah_name"], requiredData:["ayah_text","audio","surah"], rewards:{completion:true}, scene:"lab", route:"/games/guess-surah" },
  { id:"gift-boxes", title:"صناديق الهدايا", icon:"gift", description:"اختر صندوقًا واكتشف السؤال أو المكافأة.", ageRange:[4,12], educationalGoal:"تعزيز الدافعية بالمفاجأة", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["mixed"], requiredData:["ayah_text","words"], rewards:{completion:true}, scene:"gifts", route:"/games/gifts" },
  { id:"ayah-code", title:"شفرة الآيات", icon:"lock", description:"حل الأسئلة لتجمع أرقام الشفرة وتفتح الخزنة.", ageRange:[7,12], educationalGoal:"الاستدعاء تحت وقت", difficultyLevels:["medium","hard"], supportedQuestionTypes:["surah_name","ayah_number","missing_word"], requiredData:["ayah_text","words"], rewards:{completion:true,mastery:true}, scene:"vault", route:"/games/code" },
  { id:"flip-cards", title:"البطاقات المقلوبة", icon:"memory", description:"طابق بدايات الآيات ونهاياتها أو السور.", ageRange:[4,12], educationalGoal:"الذاكرة البصرية والربط", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["matching"], requiredData:["ayah_text","surah"], rewards:{completion:true}, scene:"cards", route:"/games/flip-cards" },
  { id:"word-hunter", title:"صائد الكلمات", icon:"target", description:"اصطد الكلمات الصحيحة التي تكمل الآية.", ageRange:[6,12], educationalGoal:"سرعة استدعاء الكلمات", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["missing_word"], requiredData:["ayah_text","words"], rewards:{completion:true}, scene:"word-field", route:"/games/word-hunter" },
  { id:"ayah-matching", title:"مطابقة الآيات", icon:"review", description:"صل بداية كل آية بنهايتها الصحيحة.", ageRange:[7,12], educationalGoal:"ربط بدايات الآيات بنهاياتها", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["beginning_ending"], requiredData:["ayah_text","words"], rewards:{completion:true}, scene:"matching", route:"/games/ayah-matching" },
  { id:"surah-cards", title:"البطاقات العشوائية", icon:"order", description:"رتّب السور واعرف السابق واللاحق.", ageRange:[6,12], educationalGoal:"ترتيب السور", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["surah_order","previous_surah","next_surah"], requiredData:["surah"], rewards:{completion:true}, scene:"cards", route:"/games/surah-cards" },
  { id:"ayah-order", title:"ترتيب الآيات", icon:"order", description:"رتّب نطاقًا من الآيات حسب QuranData.", ageRange:[7,12], educationalGoal:"تثبيت تسلسل السورة", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["ayah_order"], requiredData:["ayah_text"], rewards:{completion:true,mastery:true}, scene:"library", route:"/games/ayah-order" },
  { id:"quick-memory", title:"الذاكرة السريعة", icon:"memory", description:"احفظ الآية لثوانٍ ثم أكمل الكلمات المفقودة.", ageRange:[7,12], educationalGoal:"سرعة التثبيت والاسترجاع", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["missing_word"], requiredData:["ayah_text","words"], rewards:{completion:true,mastery:true}, scene:"memory-room", route:"/games/quick-memory" },
  { id:"complete-ayah", title:"إكمال الآية", icon:"edit", description:"اختر أو اكتب الكلمة الناقصة من النص المرجعي.", ageRange:[6,12], educationalGoal:"استرجاع كلمات الآية", difficultyLevels:["easy","medium","hard","advanced"], supportedQuestionTypes:["missing_word"], requiredData:["ayah_text","words"], rewards:{completion:true,mastery:true}, scene:"workshop", route:"/games/complete-ayah" },
  { id:"surah-exam", title:"اختبار حفظ السورة", icon:"trophy", description:"اختبار شامل ينتج قائمة آيات تحتاج مراجعة.", ageRange:[7,12], educationalGoal:"قياس إتقان السورة", difficultyLevels:["easy","medium","hard"], supportedQuestionTypes:["next_ayah","complete_ayah","ayah_beginning","ayah_ending","surah_name","ayah_order","missing_word"], requiredData:["ayah_text","words","surah"], rewards:{completion:true,mastery:true}, scene:"exam-hall", route:"/games/surah-exam" },
];

export const CLASSIC_GAME_DEFINITIONS = [
  { id:"classic-memory", title:"لعبة الذاكرة", icon:"brain", description:"طابق البطاقات المتشابهة بأقل عدد من المحاولات.", ageRange:[4,12], educationalGoal:"الذاكرة البصرية", difficultyLevels:["easy"], supportedQuestionTypes:["matching"], requiredData:["symbols"], rewards:{completion:true}, scene:"classic", route:"/games/memory" },
  { id:"classic-surah-order", title:"رتّب السور", icon:"puzzle", description:"اختبر معرفتك بترتيب السور في المصحف.", ageRange:[6,12], educationalGoal:"ترتيب السور", difficultyLevels:["easy"], supportedQuestionTypes:["surah_order"], requiredData:["surah"], rewards:{completion:true}, scene:"classic", route:"/games/order" },
  { id:"classic-surah-quiz", title:"اختبار السور", icon:"bolt", description:"خمسة أسئلة سريعة عن السور وأرقامها.", ageRange:[7,12], educationalGoal:"معرفة بيانات السور", difficultyLevels:["easy"], supportedQuestionTypes:["surah_number","ayah_count"], requiredData:["surah"], rewards:{completion:true}, scene:"classic", route:"/games/quiz" },
];

export const RECREATIONAL_GAME_DEFINITIONS = [
  { id:"xo", title:"XO", icon:"game", description:"استراحة قصيرة ضد الكمبيوتر.", ageRange:[4,12], route:"/games/fun/xo", scene:"playground" },
  { id:"balloon-pop", title:"فرقعة البالونات", icon:"target", description:"اضغط البالونات قبل أن تختفي.", ageRange:[4,12], route:"/games/fun/balloons", scene:"playground" },
  { id:"picture-memory", title:"ذاكرة الصور", icon:"memory", description:"ابحث عن أزواج الصور المتطابقة.", ageRange:[4,12], route:"/games/fun/picture-memory", scene:"playground" },
  { id:"flashlight", title:"لعبة المصباح", icon:"search", description:"حرك الضوء واكتشف الصورة المخفية.", ageRange:[4,10], route:"/games/fun/flashlight", scene:"playground" },
  { id:"hidden-picture", title:"الصورة المخفية", icon:"search", description:"اكشف أقل عدد من المربعات وخمّن الصورة.", ageRange:[4,10], route:"/games/fun/hidden-picture", scene:"playground" },
];

const CORE_IMPLEMENTED_IDS = new Set([
  "quran-wheel","knowledge-bridge","ayah-burger","word-train","guess-surah","ayah-code","flip-cards",
  "word-hunter","ayah-matching","surah-cards","ayah-order","quick-memory","complete-ayah","surah-exam",
]);
const ENGINE_INTEGRATED_IDS = new Set([
  ...CORE_IMPLEMENTED_IDS,
  "ayah-hunter","where-start","what-next","build-ayah","memory-race","surah-treasure","similarity-boxes","missing-word-adventure",
]);

function normalize(definition, group, status) {
  return {
    ...definition,
    group,
    status,
    engineIntegrated: ENGINE_INTEGRATED_IDS.has(definition.id),
  };
}

const core = QURAN_GAME_DEFINITIONS.map(definition => normalize(
  definition,
  "quran-core",
  CORE_IMPLEMENTED_IDS.has(definition.id) ? "implemented" : "planned",
));
const expansion = NEW_QURAN_GAME_DEFINITIONS.map(definition => normalize(definition, "quran-expansion", "implemented"));
const classic = CLASSIC_GAME_DEFINITIONS.map(definition => normalize(definition, "classic", "implemented"));
const recreational = RECREATIONAL_GAME_DEFINITIONS.map(definition => normalize(definition, "recreational", "planned"));

export const ALL_GAME_DEFINITIONS = [...core, ...expansion, ...classic, ...recreational];
export const IMPLEMENTED_GAME_DEFINITIONS = ALL_GAME_DEFINITIONS.filter(game => game.status === "implemented");
export const PLANNED_GAME_DEFINITIONS = ALL_GAME_DEFINITIONS.filter(game => game.status === "planned");
export const gameDefinition = id => ALL_GAME_DEFINITIONS.find(game => game.id === id) || null;
export const implementedGamesByGroup = group => IMPLEMENTED_GAME_DEFINITIONS.filter(game => game.group === group);
export const isGameImplemented = id => gameDefinition(id)?.status === "implemented";
