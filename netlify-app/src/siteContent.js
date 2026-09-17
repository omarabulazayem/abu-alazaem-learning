import { getContentBySlug, getNavigation } from "./cmsRepository.js";

export const DEFAULT_HOME_CONTENT=Object.freeze({
  brand:{title:"أبو العزايم",subtitle:"للحفظ الممتع"},
  hero:{
    eyebrow:"رحلة يومية بسيطة",
    title:"نحوّل حفظ القرآن إلى رحلة ممتعة لطفلك",
    highlight:"رحلة ممتعة",
    description:"منصة عربية تجمع الحفظ والمراجعة والألعاب والتحديات والإنجازات في تجربة واحدة سهلة للأسرة والمعلم.",
    primaryLabel:"ابدأ الآن",
    secondaryLabel:"استكشف القرآن",
    secondaryRoute:"/quran"
  },
  sectionsHeading:{eyebrow:"اختَر وجهتك",title:"كل ما يحتاجه الطفل في مكان واحد",description:"كل قسم مصمم ليكون واضحًا وسهلًا وممتعًا على الكمبيوتر والموبايل."},
  sections:[
    {title:"بوابة البداية",subtitle:"ابدأ رحلتك مع القرآن",route:"/quran",icon:"mosque",tone:"mint"},
    {title:"عالم القرآن",subtitle:"اقرأ وتعرّف على السور",route:"/quran",icon:"quran",tone:"lavender"},
    {title:"مدينة الألعاب",subtitle:"العب وتعلم بدون ملل",route:"/games",icon:"game",tone:"sky"},
    {title:"جلسة الحفظ",subtitle:"خطوات قصيرة وتقدم واضح",route:"/memorize",icon:"star",tone:"green"},
    {title:"غرفة الطفل",subtitle:"مساحته وتقدمه الخاص",route:"/room",icon:"room",tone:"pink"},
    {title:"الجوائز",subtitle:"اكسب نقاطًا وميداليات",route:"/achievements",icon:"gift",tone:"violet"},
    {title:"المراجعة",subtitle:"ثبّت الحفظ باستمرار",route:"/review",icon:"review",tone:"aqua"},
    {title:"التحديات",subtitle:"أكمل مهامك اليومية",route:"/challenges",icon:"target",tone:"peach"}
  ],
  promise:{eyebrow:"رسالتنا",title:"كل خطوة صغيرة تقرّب الطفل من القرآن",description:"تقدم محفوظ، تجربة واضحة، وتشجيع مستمر بدون ضغط أو تعقيد.",buttonLabel:"ابدأ من القرآن",route:"/quran"},
  footer:{description:"منصة عربية للحفظ الممتع، المراجعة، الألعاب والمتابعة."}
});

export const DEFAULT_MAIN_NAV=Object.freeze([
  {label:"الرئيسية",url:"/",icon:"home",sort_order:0},
  {label:"القرآن",url:"/quran",icon:"quran",sort_order:10},
  {label:"الحفظ",url:"/memorize",icon:"star",sort_order:20},
  {label:"المراجعة",url:"/review",icon:"review",sort_order:30},
  {label:"الألعاب",url:"/games",icon:"game",sort_order:40},
  {label:"التحديات",url:"/challenges",icon:"target",sort_order:50},
  {label:"الإنجازات",url:"/achievements",icon:"trophy",sort_order:60}
]);

function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function validSections(value){return Array.isArray(value)?value.filter(item=>item&&item.title&&item.route):[];}

export async function loadHomeContent(locale="ar"){
  const [page,navigation]=await Promise.all([
    getContentBySlug("page","home",locale).catch(()=>null),
    getNavigation("primary",{locale}).catch(()=>[])
  ]);
  const body=object(page?.body);
  const sections=validSections(body.sections);
  return {
    ...DEFAULT_HOME_CONTENT,
    ...body,
    brand:{...DEFAULT_HOME_CONTENT.brand,...object(body.brand)},
    hero:{...DEFAULT_HOME_CONTENT.hero,...object(body.hero)},
    sectionsHeading:{...DEFAULT_HOME_CONTENT.sectionsHeading,...object(body.sectionsHeading)},
    sections:sections.length?sections:DEFAULT_HOME_CONTENT.sections,
    promise:{...DEFAULT_HOME_CONTENT.promise,...object(body.promise)},
    footer:{...DEFAULT_HOME_CONTENT.footer,...object(body.footer)},
    navigation:Array.isArray(navigation)&&navigation.length?navigation.map(item=>({label:item.label,url:item.url||"/",icon:item.metadata?.icon||"arrow",sort_order:item.sort_order||0})):DEFAULT_MAIN_NAV
  };
}
