export const TAFSIR_STATUS=Object.freeze({BLOCKED_CONTENT:"blocked_content",LIVE:"live"});

const concepts=[
  ["what-does-ayah-mean","ماذا تعني الآية؟","garden","حديقة المعاني","/games/tafsir/what-does-ayah-mean","اختيار صورة أو موقف يعبّر عن المعنى","meaning_choice",4],
  ["key-word","الكلمة المفتاح","garden","حديقة المعاني","/games/tafsir/key-word","اختيار معنى كلمة ثم فتح مفتاح السياق","keyword_meaning",6],
  ["meaning-boxes","صندوق المعاني","garden","حديقة المعاني","/games/tafsir/meaning-boxes","صناديق كلمة ومعنى وصورة وسؤال","meaning_boxes",4],
  ["meaning-or-not","صح أم ليس من معنى الآية؟","garden","حديقة المعاني","/games/tafsir/meaning-or-not","سحب العبارات إلى من المعنى أو ليس من المعنى","meaning_sort",7],
  ["ayah-and-situation","الآية والموقف","garden","حديقة المعاني","/games/tafsir/ayah-and-situation","مطابقة معنى الآية بموقف مناسب","situation_match",6],
  ["guidance-treasure","كنز الهداية","treasure","كنز الهدايات","/games/tafsir/guidance-treasure","غرف آيات وجواهر هدايات موثقة","guidance",7],
  ["ayah-story","قصة الآية","stories","مدينة القصص","/games/tafsir/ayah-story","مشاهد وسياق موثق فقط","story_context",6],
  ["what-happened-first","ماذا حدث أولًا؟","stories","مدينة القصص","/games/tafsir/what-happened-first","ترتيب مشاهد موثقة","story_order",6],
  ["complete-story","أكمل القصة","stories","مدينة القصص","/games/tafsir/complete-story","اختيار الحدث التالي من سياق موثق","story_next",6],
  ["who-is-meant","من المقصود؟","stories","مدينة القصص","/games/tafsir/who-is-meant","تحديد المقصود من النص أو التفسير الموثق","who_is_meant",8],
  ["where-did-it-happen","أين حدث هذا؟","stories","مدينة القصص","/games/tafsir/where-did-it-happen","اختيار المكان فقط عند وجود دليل معتبر","where",8],
  ["who-said-it","من قالها؟","stories","مدينة القصص","/games/tafsir/who-said-it","ربط القول بصاحبه وفق مصدر موثق","who_said",7],
  ["who-did-what","من يفعل ماذا؟","lab","مختبر التدبر والفهم","/games/tafsir/who-did-what","سحب الفعل إلى الشخصية الصحيحة","actor_action",7],
  ["cause-and-result","اربط السبب بالنتيجة","lab","مختبر التدبر والفهم","/games/tafsir/cause-and-result","وصل السبب بالنتيجة عندما تكون العلاقة واضحة وموثقة","cause_result",8],
  ["why","لماذا؟","lab","مختبر التدبر والفهم","/games/tafsir/why","اختيار السبب الصحيح فقط عند وجود سبب موثق","why",8],
  ["surah-journey","رحلة داخل السورة","lab","مختبر التدبر والفهم","/games/tafsir/surah-journey","خريطة موضوعات السورة في محطات مترابطة","surah_theme",8],
  ["word-changes-meaning","كلمة تغيّر المعنى","lab","مختبر التدبر والفهم","/games/tafsir/word-changes-meaning","تمييز أثر السياق بين كلمات متقاربة","context_word",10],
  ["find-meaning-error","اكتشف الخطأ","lab","مختبر التدبر والفهم","/games/tafsir/find-meaning-error","ثلاث بطاقات ومعنى واحد خاطئ","meaning_error",8],
  ["tafsir-maze","متاهة التفسير","lab","مختبر التدبر والفهم","/games/tafsir/tafsir-maze","أبواب فهم صحيحة تفتح الطريق وخطأ يعيد خطوة مع تلميح","tafsir_maze",8],
  ["meaning-ladder","سلم المعنى","treasure","كنز الهدايات","/games/tafsir/meaning-ladder","اقرأ ثم الكلمة ثم المعنى ثم الموقف ثم الهداية","meaning_ladder",8],
];

export const TAFSIR_GAME_DEFINITIONS=Object.freeze(concepts.map(([id,title,world,worldLabel,route,mechanic,questionType,ageMin])=>Object.freeze({id,title,world,worldLabel,route,mechanic,questionType,ageRange:[ageMin,12],status:TAFSIR_STATUS.BLOCKED_CONTENT,requiresApprovedContent:true})));
export function tafsirGameDefinition(id){return TAFSIR_GAME_DEFINITIONS.find(game=>game.id===id)||null;}
export function tafsirGamesByWorld(world){return TAFSIR_GAME_DEFINITIONS.filter(game=>game.world===world);}
