// Canonical game metadata registry. Do not create parallel definition lists.
// UI, routing validation, GameEngine and teacher reports read game metadata from here.

export const GAME_STATUS = Object.freeze({ LIVE: "live", PLANNED: "planned", BLOCKED_CONTENT: "blocked_content", DEPRECATED: "deprecated" });

const registry = [
  {
    "id": "quran-wheel",
    "title": "العجلة الدوارة",
    "description": "لف العجلة وخذ تحديًا قرآنيًا متجددًا.",
    "icon": "target",
    "category": "review",
    "categoryLabel": "المراجعة",
    "pack": "quran-core",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "الاستدعاء والمراجعة المتنوعة",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "next_ayah",
      "complete_ayah",
      "ayah_beginning",
      "ayah_order"
    ],
    "requiredData": [
      "ayah_text",
      "surah",
      "words"
    ],
    "route": "/games/quran-wheel",
    "scene": "wheel",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
  {
    "id": "forgetfulness-dungeon",
    "title": "سرداب النسيان",
    "description": "افتح أبواب السرداب بحل ألغاز الحفظ.",
    "icon": "lock",
    "category": "review",
    "categoryLabel": "المراجعة",
    "pack": "quran-core",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "تثبيت الحفظ وكشف نقاط الضعف",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "next_ayah",
      "missing_word",
      "ayah_order",
      "surah_name",
      "beginning_ending"
    ],
    "requiredData": [
      "ayah_text",
      "words",
      "review_queue"
    ],
    "route": "/games/dungeon",
    "scene": "dungeon",
    "status": "planned",
    "engineIntegrated": false,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
  {
    "id": "listen-memorize",
    "title": "الاستماع والحفظ",
    "description": "تلقين وترديد وتكملة وترتيب وتسميع.",
    "icon": "review",
    "category": "listening",
    "categoryLabel": "الاستماع",
    "pack": "quran-core",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "التلقين السمعي والتكرار",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "listen",
      "repeat",
      "fade_complete",
      "word_order",
      "recite"
    ],
    "requiredData": [
      "ayah_text",
      "words",
      "audio"
    ],
    "route": "/games/listen",
    "scene": "studio",
    "status": "blocked_content",
    "engineIntegrated": false,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "page-lines",
    "title": "رتّب سطور الصفحة",
    "description": "ثبّت الذاكرة البصرية بترتيب سطور الصفحة.",
    "icon": "quran",
    "category": "visual",
    "categoryLabel": "الحفظ البصري",
    "pack": "quran-core",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "الحفظ البصري",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "line_order"
    ],
    "requiredData": [
      "page",
      "line_layout"
    ],
    "route": "/games/page-lines",
    "scene": "library",
    "status": "blocked_content",
    "engineIntegrated": false,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
  {
    "id": "knowledge-bridge",
    "title": "جسر المعرفة",
    "description": "كل إجابة صحيحة تبني قطعة من الجسر.",
    "icon": "target",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-core",
    "ageRange": [
      4,
      10
    ],
    "educationalGoal": "الاسترجاع التدريجي",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "complete_ayah",
      "next_ayah"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/bridge",
    "scene": "bridge",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "ayah-burger",
    "title": "صانع البرجر",
    "description": "رتّب أجزاء الآية لبناء الطبقات بالترتيب.",
    "icon": "order",
    "category": "words",
    "categoryLabel": "الكلمات",
    "pack": "quran-core",
    "ageRange": [
      4,
      9
    ],
    "educationalGoal": "ترتيب أجزاء الآية",
    "difficultyLevels": [
      "easy",
      "medium"
    ],
    "supportedQuestionTypes": [
      "chunk_order"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/burger",
    "scene": "kitchen",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "quran-detective",
    "title": "المحقق القرآني",
    "description": "اكتشف الفروق والمتشابهات من الأدلة.",
    "icon": "search",
    "category": "similarities",
    "categoryLabel": "المتشابهات",
    "pack": "quran-core",
    "ageRange": [
      9,
      12
    ],
    "educationalGoal": "تمييز المتشابهات",
    "difficultyLevels": [
      "medium",
      "hard",
      "advanced"
    ],
    "supportedQuestionTypes": [
      "similar_words",
      "surah_location"
    ],
    "requiredData": [
      "ayah_text",
      "similarity_database"
    ],
    "route": "/games/detective",
    "scene": "detective",
    "status": "blocked_content",
    "engineIntegrated": false,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
  {
    "id": "word-train",
    "title": "قطار الكلمات",
    "description": "رتّب عربات الكلمات أو الآيات ثم حرّك القطار.",
    "icon": "order",
    "category": "words",
    "categoryLabel": "الكلمات",
    "pack": "quran-core",
    "ageRange": [
      4,
      10
    ],
    "educationalGoal": "ترتيب الكلمات والآيات",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "word_order",
      "ayah_order"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/train",
    "scene": "station",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "guess-surah",
    "title": "خمّن السورة",
    "description": "تعرف على السورة من آية أو مقطع مسموع.",
    "icon": "search",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-core",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "ربط الآية بسورتها",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "surah_name"
    ],
    "requiredData": [
      "ayah_text",
      "audio",
      "surah"
    ],
    "route": "/games/guess-surah",
    "scene": "lab",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "gift-boxes",
    "title": "صناديق الهدايا",
    "description": "اختر صندوقًا واكتشف السؤال أو المكافأة.",
    "icon": "gift",
    "category": "review",
    "categoryLabel": "المراجعة",
    "pack": "quran-core",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "تعزيز الدافعية بالمفاجأة",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "mixed"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/gifts",
    "scene": "gifts",
    "status": "planned",
    "engineIntegrated": false,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "ayah-code",
    "title": "شفرة الآيات",
    "description": "حل الأسئلة لتجمع أرقام الشفرة وتفتح الخزنة.",
    "icon": "lock",
    "category": "review",
    "categoryLabel": "المراجعة",
    "pack": "quran-core",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "الاستدعاء تحت وقت",
    "difficultyLevels": [
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "surah_name",
      "ayah_number",
      "missing_word"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/code",
    "scene": "vault",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
  {
    "id": "flip-cards",
    "title": "البطاقات المقلوبة",
    "description": "طابق بدايات الآيات ونهاياتها أو السور.",
    "icon": "memory",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-core",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "الذاكرة البصرية والربط",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "matching"
    ],
    "requiredData": [
      "ayah_text",
      "surah"
    ],
    "route": "/games/flip-cards",
    "scene": "cards",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "word-hunter",
    "title": "صائد الكلمات",
    "description": "اصطد الكلمات الصحيحة التي تكمل الآية.",
    "icon": "target",
    "category": "words",
    "categoryLabel": "الكلمات",
    "pack": "quran-core",
    "ageRange": [
      6,
      12
    ],
    "educationalGoal": "سرعة استدعاء الكلمات",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "missing_word"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/word-hunter",
    "scene": "word-field",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "ayah-matching",
    "title": "مطابقة الآيات",
    "description": "صل بداية كل آية بنهايتها الصحيحة.",
    "icon": "review",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-core",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "ربط بدايات الآيات بنهاياتها",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "beginning_ending"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/ayah-matching",
    "scene": "matching",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "surah-cards",
    "title": "البطاقات العشوائية",
    "description": "رتّب السور واعرف السابق واللاحق.",
    "icon": "order",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-core",
    "ageRange": [
      6,
      12
    ],
    "educationalGoal": "ترتيب السور",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "surah_order",
      "previous_surah",
      "next_surah"
    ],
    "requiredData": [
      "surah"
    ],
    "route": "/games/surah-cards",
    "scene": "cards",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "ayah-order",
    "title": "ترتيب الآيات",
    "description": "رتّب نطاقًا من الآيات حسب QuranData.",
    "icon": "order",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-core",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "تثبيت تسلسل السورة",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "ayah_order"
    ],
    "requiredData": [
      "ayah_text"
    ],
    "route": "/games/ayah-order",
    "scene": "library",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
  {
    "id": "quick-memory",
    "title": "الذاكرة السريعة",
    "description": "احفظ الآية لثوانٍ ثم أكمل الكلمات المفقودة.",
    "icon": "memory",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-core",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "سرعة التثبيت والاسترجاع",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "missing_word"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/quick-memory",
    "scene": "memory-room",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
  {
    "id": "complete-ayah",
    "title": "إكمال الآية",
    "description": "اختر أو اكتب الكلمة الناقصة من النص المرجعي.",
    "icon": "edit",
    "category": "words",
    "categoryLabel": "الكلمات",
    "pack": "quran-core",
    "ageRange": [
      6,
      12
    ],
    "educationalGoal": "استرجاع كلمات الآية",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard",
      "advanced"
    ],
    "supportedQuestionTypes": [
      "missing_word"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/complete-ayah",
    "scene": "workshop",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
  {
    "id": "surah-exam",
    "title": "اختبار حفظ السورة",
    "description": "اختبار شامل ينتج قائمة آيات تحتاج مراجعة.",
    "icon": "trophy",
    "category": "review",
    "categoryLabel": "المراجعة",
    "pack": "quran-core",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "قياس إتقان السورة",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "next_ayah",
      "complete_ayah",
      "ayah_beginning",
      "ayah_ending",
      "surah_name",
      "ayah_order",
      "missing_word"
    ],
    "requiredData": [
      "ayah_text",
      "words",
      "surah"
    ],
    "route": "/games/surah-exam",
    "scene": "exam-hall",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
    {
    "id": "ayah-hunter",
    "title": "صائد الآية",
    "description": "التقط الآية الصحيحة من أوراق متحركة قبل أن تختفي.",
    "icon": "target",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-expansion",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "الاستدعاء وتسلسل الآيات",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "next_ayah"
    ],
    "requiredData": [
      "ayah_text",
      "surah"
    ],
    "route": "/games/ayah-hunter",
    "scene": "star-forest",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
    {
    "id": "where-start",
    "title": "من أين أبدأ؟",
    "description": "افتح البوابة التي تحمل بداية الآية الصحيحة واصعد البرج.",
    "icon": "lock",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-expansion",
    "ageRange": [
      6,
      12
    ],
    "educationalGoal": "استدعاء بدايات الآيات",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "ayah_beginning"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/where-start",
    "scene": "lavender-tower",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
    {
    "id": "what-next",
    "title": "ماذا يأتي بعد؟",
    "description": "اختر مسار الآية التالية لتحرك الشخصية على الطريق.",
    "icon": "arrow",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-expansion",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "تثبيت التسلسل القرآني",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "next_ayah"
    ],
    "requiredData": [
      "ayah_text"
    ],
    "route": "/games/what-next",
    "scene": "three-roads",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
    {
    "id": "build-ayah",
    "title": "ابنِ الآية",
    "description": "حرّك قطع الكلمات حتى تبني الآية كاملة.",
    "icon": "puzzle",
    "category": "words",
    "categoryLabel": "الكلمات",
    "pack": "quran-expansion",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "ترتيب كلمات الآية",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "word_order"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/build-ayah",
    "scene": "puzzle-table",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
    {
    "id": "memory-race",
    "title": "سباق الذاكرة",
    "description": "تقدم في طريق متغير كلما استدعيت الآية التالية.",
    "icon": "bolt",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-expansion",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "الاستدعاء السريع",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "next_ayah",
      "missing_word"
    ],
    "requiredData": [
      "ayah_text"
    ],
    "route": "/games/memory-race",
    "scene": "memory-race",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
    {
    "id": "surah-treasure",
    "title": "كنز السورة",
    "description": "افتح محطات خريطة السورة حتى تصل إلى صندوق الكنز.",
    "icon": "gift",
    "category": "review",
    "categoryLabel": "المراجعة",
    "pack": "quran-expansion",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "مراجعة السورة عبر مهام قصيرة",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "next_ayah",
      "ayah_beginning",
      "missing_word"
    ],
    "requiredData": [
      "ayah_text",
      "surah"
    ],
    "route": "/games/surah-treasure",
    "scene": "treasure-map",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
    {
    "id": "similarity-mirror",
    "title": "مرآة المتشابهات",
    "description": "قارن مقطعين واكتشف الكلمات المختلفة داخل المرآتين.",
    "icon": "search",
    "category": "similarities",
    "categoryLabel": "المتشابهات",
    "pack": "quran-expansion",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "تمييز التشابه والاختلاف اللفظي",
    "difficultyLevels": [
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "similar_words"
    ],
    "requiredData": [
      "ayah_text",
      "words",
      "similarity_database"
    ],
    "route": "/games/similarity-mirror",
    "scene": "mirror-room",
    "status": "blocked_content",
    "engineIntegrated": false,
    "rewards": {
      "completion": true
    }
  },
    {
    "id": "where-mentioned",
    "title": "أين وردت؟",
    "description": "اربط المقطع بالسورة الصحيحة من السور التي درستها.",
    "icon": "quran",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "quran-expansion",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "ربط الآيات بسورها",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "surah_name"
    ],
    "requiredData": [
      "ayah_text",
      "surah"
    ],
    "route": "/games/where-mentioned",
    "scene": "surah-gates",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
    {
    "id": "similarity-boxes",
    "title": "صندوق المتشابهات",
    "description": "اختر صندوقًا وافتح تحديًا قصيرًا متغيرًا.",
    "icon": "gift",
    "category": "similarities",
    "categoryLabel": "المتشابهات",
    "pack": "quran-expansion",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "مراجعة المتشابهات بطريقة متنوعة",
    "difficultyLevels": [
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "next_ayah"
    ],
    "requiredData": [
      "ayah_text",
      "similarity_database"
    ],
    "route": "/games/similarity-boxes",
    "scene": "mystery-boxes",
    "status": "blocked_content",
    "engineIntegrated": false,
    "rewards": {
      "completion": true
    }
  },
    {
    "id": "missing-word-adventure",
    "title": "كلمة ضائعة",
    "description": "ابحث عن الكلمة المفقودة بين كلمات متحركة.",
    "icon": "search",
    "category": "words",
    "categoryLabel": "الكلمات",
    "pack": "quran-expansion",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "استدعاء كلمات الآية",
    "difficultyLevels": [
      "easy",
      "medium",
      "hard"
    ],
    "supportedQuestionTypes": [
      "missing_word"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/missing-word-adventure",
    "scene": "word-field",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true,
      "mastery": true
    }
  },
    {
    "id": "word-box",
    "title": "صندوق الكلمات",
    "description": "فتش داخل الصندوق عن كلمة موجودة في الآية.",
    "icon": "gift",
    "category": "words",
    "categoryLabel": "الكلمات",
    "pack": "quran-expansion",
    "ageRange": [
      4,
      9
    ],
    "educationalGoal": "الانتباه للكلمات القرآنية",
    "difficultyLevels": [
      "easy",
      "medium"
    ],
    "supportedQuestionTypes": [
      "missing_word",
      "word_order"
    ],
    "requiredData": [
      "ayah_text",
      "words"
    ],
    "route": "/games/word-box",
    "scene": "word-box",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "classic-memory",
    "title": "لعبة الذاكرة",
    "description": "طابق البطاقات المتشابهة بأقل عدد من المحاولات.",
    "icon": "brain",
    "category": "memory",
    "categoryLabel": "الذاكرة",
    "pack": "classic",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "الذاكرة البصرية",
    "difficultyLevels": [
      "easy"
    ],
    "supportedQuestionTypes": [
      "matching"
    ],
    "requiredData": [
      "symbols"
    ],
    "route": "/games/memory",
    "scene": "classic",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "classic-surah-order",
    "title": "رتّب السور",
    "description": "اختبر معرفتك بترتيب السور في المصحف.",
    "icon": "puzzle",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "classic",
    "ageRange": [
      6,
      12
    ],
    "educationalGoal": "ترتيب السور",
    "difficultyLevels": [
      "easy"
    ],
    "supportedQuestionTypes": [
      "surah_order"
    ],
    "requiredData": [
      "surah"
    ],
    "route": "/games/order",
    "scene": "classic",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "classic-surah-quiz",
    "title": "اختبار السور",
    "description": "خمسة أسئلة سريعة عن السور وأرقامها.",
    "icon": "bolt",
    "category": "memorization",
    "categoryLabel": "الحفظ",
    "pack": "classic",
    "ageRange": [
      7,
      12
    ],
    "educationalGoal": "معرفة بيانات السور",
    "difficultyLevels": [
      "easy"
    ],
    "supportedQuestionTypes": [
      "surah_number",
      "ayah_count"
    ],
    "requiredData": [
      "surah"
    ],
    "route": "/games/quiz",
    "scene": "classic",
    "status": "live",
    "engineIntegrated": true,
    "rewards": {
      "completion": true
    }
  },
  {
    "id": "xo",
    "title": "XO",
    "description": "استراحة قصيرة ضد الكمبيوتر.",
    "icon": "game",
    "category": "recreational",
    "categoryLabel": "ألعاب ترفيهية",
    "pack": "recreational",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "استراحة ترفيهية قصيرة",
    "difficultyLevels": [
      "easy"
    ],
    "supportedQuestionTypes": [],
    "requiredData": [],
    "route": "/games/fun/xo",
    "scene": "playground",
    "status": "planned",
    "engineIntegrated": false,
    "rewards": {
      "completion": false
    }
  },
  {
    "id": "balloon-pop",
    "title": "فرقعة البالونات",
    "description": "اضغط البالونات قبل أن تختفي.",
    "icon": "target",
    "category": "recreational",
    "categoryLabel": "ألعاب ترفيهية",
    "pack": "recreational",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "استراحة ترفيهية قصيرة",
    "difficultyLevels": [
      "easy"
    ],
    "supportedQuestionTypes": [],
    "requiredData": [],
    "route": "/games/fun/balloons",
    "scene": "playground",
    "status": "planned",
    "engineIntegrated": false,
    "rewards": {
      "completion": false
    }
  },
  {
    "id": "picture-memory",
    "title": "ذاكرة الصور",
    "description": "ابحث عن أزواج الصور المتطابقة.",
    "icon": "memory",
    "category": "recreational",
    "categoryLabel": "ألعاب ترفيهية",
    "pack": "recreational",
    "ageRange": [
      4,
      12
    ],
    "educationalGoal": "استراحة ترفيهية قصيرة",
    "difficultyLevels": [
      "easy"
    ],
    "supportedQuestionTypes": [],
    "requiredData": [],
    "route": "/games/fun/picture-memory",
    "scene": "playground",
    "status": "planned",
    "engineIntegrated": false,
    "rewards": {
      "completion": false
    }
  },
  {
    "id": "flashlight",
    "title": "لعبة المصباح",
    "description": "حرك الضوء واكتشف الصورة المخفية.",
    "icon": "search",
    "category": "recreational",
    "categoryLabel": "ألعاب ترفيهية",
    "pack": "recreational",
    "ageRange": [
      4,
      10
    ],
    "educationalGoal": "استراحة ترفيهية قصيرة",
    "difficultyLevels": [
      "easy"
    ],
    "supportedQuestionTypes": [],
    "requiredData": [],
    "route": "/games/fun/flashlight",
    "scene": "playground",
    "status": "planned",
    "engineIntegrated": false,
    "rewards": {
      "completion": false
    }
  },
  {
    "id": "hidden-picture",
    "title": "الصورة المخفية",
    "description": "اكشف أقل عدد من المربعات وخمّن الصورة.",
    "icon": "search",
    "category": "recreational",
    "categoryLabel": "ألعاب ترفيهية",
    "pack": "recreational",
    "ageRange": [
      4,
      10
    ],
    "educationalGoal": "استراحة ترفيهية قصيرة",
    "difficultyLevels": [
      "easy"
    ],
    "supportedQuestionTypes": [],
    "requiredData": [],
    "route": "/games/fun/hidden-picture",
    "scene": "playground",
    "status": "planned",
    "engineIntegrated": false,
    "rewards": {
      "completion": false
    }
  }
];

export const GAME_REGISTRY = Object.freeze(registry.map(game => Object.freeze(game)));
export const LIVE_GAME_DEFINITIONS = GAME_REGISTRY.filter(game => game.status === GAME_STATUS.LIVE);
export const PLANNED_GAME_DEFINITIONS = GAME_REGISTRY.filter(game => game.status === GAME_STATUS.PLANNED);
export const BLOCKED_CONTENT_GAME_DEFINITIONS = GAME_REGISTRY.filter(game => game.status === GAME_STATUS.BLOCKED_CONTENT);
export const DEPRECATED_GAME_DEFINITIONS = GAME_REGISTRY.filter(game => game.status === GAME_STATUS.DEPRECATED);

export function gameDefinition(id) { return GAME_REGISTRY.find(game => game.id === id) || null; }
export function gameByRoute(route) { return GAME_REGISTRY.find(game => game.route === route) || null; }
export function gamesBy({ category = null, pack = null, status = null, age = null } = {}) {
  return GAME_REGISTRY.filter(game => {
    if (category && game.category !== category) return false;
    if (pack && game.pack !== pack) return false;
    if (status && game.status !== status) return false;
    if (age != null && !(Number(age) >= Number(game.ageRange?.[0]) && Number(age) <= Number(game.ageRange?.[1]))) return false;
    return true;
  });
}

export const liveGamesByPack = pack => gamesBy({ pack, status: GAME_STATUS.LIVE });
export const liveGamesByCategory = category => gamesBy({ category, status: GAME_STATUS.LIVE });
export const isGameLive = id => gameDefinition(id)?.status === GAME_STATUS.LIVE;
