import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const app = path.join(root, "netlify-app");
const src = path.join(app, "src");
const scripts = path.join(app, "scripts");

async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
async function read(file) { return fs.readFile(file, "utf8"); }
async function write(file, content) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content, "utf8"); }
async function replace(file, fn) { const before = await read(file); const after = fn(before); if (after === before) throw new Error(`Expected transformation did not change ${file}`); await write(file, after); }

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

// 1) Rename Quran modules without changing their contents.
const oldCorpus = path.join(src, "QuranData.js");
const oldCatalog = path.join(src, "quranData.js");
const corpus = path.join(src, "quranCorpus.js");
const catalog = path.join(src, "surahCatalog.js");
if (await exists(oldCorpus)) { await fs.copyFile(oldCorpus, corpus); await fs.rm(oldCorpus); }
if (await exists(oldCatalog)) { await fs.copyFile(oldCatalog, catalog); await fs.rm(oldCatalog); }

for (const file of await walk(src)) {
  if (!/\.(?:js|jsx|mjs)$/.test(file)) continue;
  let text = await read(file);
  text = text.replaceAll('./QuranData.js', './quranCorpus.js').replaceAll('./quranData.js', './surahCatalog.js');
  await write(file, text);
}

// 2) Build a single registry from the definitions that existed before this stabilization.
const oldDefsPath = path.join(src, "gameDefinitions.js");
const oldDefs = await import(`${pathToFileURL(oldDefsPath).href}?stabilize=${Date.now()}`);
const blocked = new Set(["listen-memorize", "page-lines", "quran-detective"]);
const categories = {
  "quran-wheel":"review", "forgetfulness-dungeon":"review", "listen-memorize":"listening", "page-lines":"visual",
  "knowledge-bridge":"memorization", "ayah-burger":"words", "quran-detective":"similarities", "word-train":"words",
  "guess-surah":"memorization", "gift-boxes":"review", "ayah-code":"review", "flip-cards":"memorization",
  "word-hunter":"words", "ayah-matching":"memorization", "surah-cards":"memorization", "ayah-order":"memorization",
  "quick-memory":"memorization", "complete-ayah":"words", "surah-exam":"review",
  "classic-memory":"memory", "classic-surah-order":"memorization", "classic-surah-quiz":"memorization",
  "ayah-hunter":"memorization", "where-start":"memorization", "what-next":"memorization", "build-ayah":"words",
  "memory-race":"memorization", "surah-treasure":"review", "similarity-mirror":"similarities", "where-mentioned":"memorization",
  "similarity-boxes":"similarities", "missing-word-adventure":"words", "word-box":"words",
  "xo":"recreational", "balloon-pop":"recreational", "picture-memory":"recreational", "flashlight":"recreational", "hidden-picture":"recreational",
};
const categoryLabels = {
  memorization:"الحفظ", review:"المراجعة", words:"الكلمات", similarities:"المتشابهات", listening:"الاستماع",
  visual:"الحفظ البصري", memory:"الذاكرة", recreational:"ألعاب ترفيهية",
};
const rows = oldDefs.ALL_GAME_DEFINITIONS.map(game => {
  const status = blocked.has(game.id) ? "blocked_content" : game.status === "implemented" ? "live" : "planned";
  const category = categories[game.id] || "review";
  return {
    id: game.id,
    title: game.title,
    description: game.description || "",
    icon: game.icon || "game",
    category,
    categoryLabel: categoryLabels[category] || category,
    pack: game.group || "quran-core",
    ageRange: game.ageRange || [4,12],
    educationalGoal: game.educationalGoal || (category === "recreational" ? "استراحة ترفيهية قصيرة" : "تدريب تعليمي"),
    difficultyLevels: game.difficultyLevels || ["easy"],
    supportedQuestionTypes: game.supportedQuestionTypes || [],
    requiredData: game.requiredData || [],
    route: game.route,
    scene: game.scene || "default",
    status,
    engineIntegrated: Boolean(game.engineIntegrated),
    rewards: game.rewards || { completion: false },
  };
});

const registry = `// Canonical game metadata registry. Do not create parallel definition lists.\n// UI, routing validation, GameEngine and teacher reports read game metadata from here.\n\nexport const GAME_STATUS = Object.freeze({\n  LIVE: "live",\n  PLANNED: "planned",\n  BLOCKED_CONTENT: "blocked_content",\n  DEPRECATED: "deprecated",\n});\n\nconst registry = ${JSON.stringify(rows, null, 2)};\n\nexport const GAME_REGISTRY = Object.freeze(registry.map(game => Object.freeze(game)));\nexport const LIVE_GAME_DEFINITIONS = GAME_REGISTRY.filter(game => game.status === GAME_STATUS.LIVE);\nexport const PLANNED_GAME_DEFINITIONS = GAME_REGISTRY.filter(game => game.status === GAME_STATUS.PLANNED);\nexport const BLOCKED_CONTENT_GAME_DEFINITIONS = GAME_REGISTRY.filter(game => game.status === GAME_STATUS.BLOCKED_CONTENT);\nexport const DEPRECATED_GAME_DEFINITIONS = GAME_REGISTRY.filter(game => game.status === GAME_STATUS.DEPRECATED);\n\nexport function gameDefinition(id) {\n  return GAME_REGISTRY.find(game => game.id === id) || null;\n}\n\nexport function gameByRoute(route) {\n  return GAME_REGISTRY.find(game => game.route === route) || null;\n}\n\nexport function gamesBy({ category = null, pack = null, status = null, age = null } = {}) {\n  return GAME_REGISTRY.filter(game => {\n    if (category && game.category !== category) return false;\n    if (pack && game.pack !== pack) return false;\n    if (status && game.status !== status) return false;\n    if (age != null && !(Number(age) >= Number(game.ageRange?.[0]) && Number(age) <= Number(game.ageRange?.[1]))) return false;\n    return true;\n  });\n}\n\nexport const liveGamesByPack = pack => gamesBy({ pack, status: GAME_STATUS.LIVE });\nexport const liveGamesByCategory = category => gamesBy({ category, status: GAME_STATUS.LIVE });\nexport const isGameLive = id => gameDefinition(id)?.status === GAME_STATUS.LIVE;\n`;
await write(path.join(src, "gameRegistry.js"), registry);

// Update references to the old registry path before removing it.
for (const file of await walk(src)) {
  if (!/\.(?:js|jsx|mjs)$/.test(file) || file.endsWith("gameRegistry.js")) continue;
  let text = await read(file);
  text = text.replaceAll('./gameDefinitions.js', './gameRegistry.js');
  await write(file, text);
}

await fs.rm(path.join(src, "gameDefinitions.js"), { force: true });
await fs.rm(path.join(src, "newGameDefinitions.js"), { force: true });

// 3) GameEngine now accepts only live registry entries.
await replace(path.join(src, "gameEngine.js"), text => text.replace('this.definition.status !== "implemented"', 'this.definition.status !== "live"').replace('Game is not implemented yet', 'Game is not live'));

// 4) GamesHub uses canonical pack/status helpers.
await replace(path.join(src, "GamesHub.jsx"), text => text
  .replace('import { implementedGamesByGroup, PLANNED_GAME_DEFINITIONS } from "./gameRegistry.js";', 'import { liveGamesByPack, PLANNED_GAME_DEFINITIONS, BLOCKED_CONTENT_GAME_DEFINITIONS } from "./gameRegistry.js";')
  .replaceAll('implementedGamesByGroup(', 'liveGamesByPack(')
  .replace('{PLANNED_GAME_DEFINITIONS.length}</b> ألعاب مخططة وغير معروضة', '{PLANNED_GAME_DEFINITIONS.length + BLOCKED_CONTENT_GAME_DEFINITIONS.length}</b> ألعاب غير متاحة حاليًا')
  .replace('Game Definitions؛ اللعبة المخططة لا تظهر هنا باعتبارها متاحة.', 'Game Registry؛ ولا تظهر أي لعبة إلا عندما تكون حالتها live.')
  .replace('تأتي من Game Definitions نفسها.', 'تأتي من Game Registry الموحد نفسه.')
);

// 5) New pack hub reads only live expansion games from the registry.
const newPackHub = `import React from "react";\nimport Icon from "./Icon.jsx";\nimport { gamesBy, GAME_STATUS } from "./gameRegistry.js";\n\nfunction routePath(){return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;}\nfunction go(p){if(routePath()!==p){history.pushState({},"",p);window.dispatchEvent(new PopStateEvent("popstate"));}}\nconst toneByScene={"star-forest":"sky","lavender-tower":"lavender","three-roads":"mint","puzzle-table":"rose","memory-race":"sky","treasure-map":"sun","mirror-room":"lavender","surah-gates":"sky","mystery-boxes":"rose","word-field":"mint","word-box":"sun"};\n\nexport default function NewGamePackHub(){\n  const games=gamesBy({pack:"quran-expansion",status:GAME_STATUS.LIVE});\n  const unavailable=gamesBy({pack:"quran-expansion"}).filter(game=>game.status!==GAME_STATUS.LIVE);\n  return <div className="app game-shell game-shell-v2 game-world" dir="rtl"><header className="game-topbar"><div className="wrap nav"><button className="brand" onClick={()=>go("/games")}><span className="logo"><Icon name="game" size={24}/></span><span><b>الحزمة الجديدة</b><small>مغامرات الحفظ والاستدعاء</small></span></button><button className="secondary" onClick={()=>go("/games")}>كل الألعاب</button></div></header><main className="wrap page"><section className="game-world-hero"><div><span className="game-kicker">✨ توسعة عالم أبو العزايم</span><h1>ألعاب قصيرة تتحول فيها المراجعة إلى مغامرة</h1><p>هذه الصفحة تعرض فقط الألعاب المصنفة live في Game Registry. الألعاب التي تحتاج استكمالًا أو محتوى موثق تبقى خارج واجهة الطفل.</p><div className="game-world-stats"><span><b>{games.length}</b> ألعاب متاحة الآن</span><span><b>{unavailable.length}</b> قيد الاستكمال</span><span><b>RTL</b> هاتف وكمبيوتر</span></div></div><div className="world-orbit" aria-hidden="true"><span>🍃</span><span>🚪</span><span>🎁</span><span>🪞</span></div></section><section className="world-section"><div className="world-heading"><div><span>المتاح الآن</span><h2>الحفظ والاستدعاء + الكلمات</h2><p>كل بطاقة هنا لها Route وتنفيذ فعلي وحالة live في المصدر الموحد.</p></div></div>{games.length?<div className="world-map-grid">{games.map((g,i)=><button key={g.id} className={\`world-zone \${toneByScene[g.scene]||"sky"}\`} onClick={()=>go(g.route)}><span className="zone-number">{String(i+1).padStart(2,"0")}</span><span className="zone-icon"><Icon name={g.icon||"game"} size={40}/></span><span className="zone-copy"><small>{g.categoryLabel}</small><b>{g.title}</b><p>{g.description}</p></span><span className="zone-progress">ابدأ اللعب <Icon name="arrow" size={18}/></span></button>)}</div>:<div className="msg">لا توجد ألعاب live في هذه الحزمة حاليًا.</div>}</section></main><footer><div className="wrap">أبو العزايم للحفظ الممتع • توفر الألعاب يأتي من Game Registry الموحد.</div></footer></div>;\n}\n`;
await write(path.join(src, "NewGamePackHub.jsx"), newPackHub);

// 6) Teacher reports: registry + category metadata + renamed surah catalog.
await replace(path.join(src, "TeacherGameReports.jsx"), text => text
  .replace('import { gameDefinition } from "./gameRegistry.js";', 'import { gameDefinition } from "./gameRegistry.js";')
  .replace('<h3>{gameTitle(g.game_id)}</h3><div className="game-report-metrics">', '<h3>{gameTitle(g.game_id)}</h3><small>{def?.categoryLabel||def?.category||"لعبة"}</small><div className="game-report-metrics">')
);

// 7) Explicit application-level NotFound instead of falling through to legacy App.
const notFound = `import React from "react";\nimport Icon from "./Icon.jsx";\nfunction go(path){history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}\nexport default function NotFoundPage(){return <div className="app" dir="rtl"><main className="wrap page narrow"><section className="panel focus"><span className="logo"><Icon name="search" size={28}/></span><h1>الصفحة غير موجودة</h1><p>الرابط الذي فتحته غير معروف في المنصة أو أن الميزة ليست متاحة بعد.</p><button className="primary" onClick={()=>go("/")}>العودة للرئيسية</button></section></main></div>;}\n`;
await write(path.join(src, "NotFoundPage.jsx"), notFound);
await replace(path.join(src, "RootRouter.jsx"), text => text
  .replace('import { gameDefinition } from "./gameRegistry.js";', 'import { gameByRoute } from "./gameRegistry.js";\nimport NotFoundPage from "./NotFoundPage.jsx";')
  .replace(/const NewGame=NEW_GAME_ROUTES\[path\];\n  let page;\n  if\(NewGame\)\{[\s\S]*?\n  \}\n  else if\(path==="\/"\)/, 'const NewGame=NEW_GAME_ROUTES[path];\n  let page;\n  if(NewGame){\n    const definition=gameByRoute(path);\n    page=definition?.status==="live"?<NewGame/>:<NotFoundPage/>;\n  }\n  else if(path==="/")')
  .replace('else page=<App/>;', 'else if(path==="/login")page=<App/>;\n  else page=<NotFoundPage/>;')
);

// 8) Strong registry + routing + filename validator.
const validator = `import fs from "node:fs/promises";\nimport path from "node:path";\nimport { fileURLToPath } from "node:url";\nimport { GAME_REGISTRY, GAME_STATUS, LIVE_GAME_DEFINITIONS } from "../src/gameRegistry.js";\n\nconst here=path.dirname(fileURLToPath(import.meta.url));\nconst root=path.resolve(here,"..");\nconst src=path.join(root,"src");\nconst required=["id","title","description","icon","category","pack","ageRange","educationalGoal","difficultyLevels","supportedQuestionTypes","requiredData","route","scene","status"];\nconst allowed=new Set(Object.values(GAME_STATUS));\nfunction fail(message){console.error(\`GAME REGISTRY VALIDATION FAILED: \${message}\`);process.exitCode=1;}\nasync function walk(dir){const out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(full));else out.push(full);}return out;}\n\nconst ids=new Set(),routes=new Set();\nfor(const game of GAME_REGISTRY){\n  for(const field of required) if(game[field]==null||game[field]==="") fail(\`\${game.id||"unknown"} missing \${field}\`);\n  if(ids.has(game.id))fail(\`duplicate game id \${game.id}\`); ids.add(game.id);\n  if(routes.has(game.route))fail(\`duplicate game route \${game.route}\`); routes.add(game.route);\n  if(!allowed.has(game.status))fail(\`\${game.id} invalid status \${game.status}\`);\n  if(game.status===GAME_STATUS.LIVE&&!game.engineIntegrated)fail(\`\${game.id} is live without GameEngine integration\`);\n}\n\nconst [router,expansion,hub,newHub]=await Promise.all([\n  fs.readFile(path.join(src,"RootRouter.jsx"),"utf8"),\n  fs.readFile(path.join(src,"NewQuranGamePack.jsx"),"utf8"),\n  fs.readFile(path.join(src,"GamesHub.jsx"),"utf8"),\n  fs.readFile(path.join(src,"NewGamePackHub.jsx"),"utf8"),\n]);\nfor(const game of LIVE_GAME_DEFINITIONS){if(!router.includes(game.route)&&!expansion.includes(game.route))fail(\`live game \${game.id} has no route/component mapping for \${game.route}\`);}\nconst discovered=new Set([...router.matchAll(/["'](\\/games\\/[^"']+)["']/g),...expansion.matchAll(/["'](\\/games\\/[^"']+)["']/g)].map(m=>m[1]));\ndiscovered.delete("/games/new-pack");\nfor(const route of discovered)if(!routes.has(route))fail(\`game route \${route} exists in code but not in registry\`);\nif(!hub.includes('from "./gameRegistry.js"'))fail("GamesHub does not import canonical gameRegistry");\nif(!newHub.includes('from "./gameRegistry.js"'))fail("NewGamePackHub does not import canonical gameRegistry");\nif(/newGameDefinitions|gameDefinitions/.test(hub+newHub))fail("hub still references a retired definitions source");\n\nconst files=await walk(src);const lower=new Map();\nfor(const file of files){const rel=path.relative(src,file).replaceAll(path.sep,"/");const key=rel.toLowerCase();if(lower.has(key)&&lower.get(key)!==rel)fail(\`case-insensitive filename collision: \${lower.get(key)} vs \${rel}\`);else lower.set(key,rel);if(/\\.(?:js|jsx|mjs)$/.test(file)){const text=await fs.readFile(file,"utf8");if(text.includes("./QuranData.js")||text.includes("./quranData.js"))fail(\`legacy QuranData import remains in \${rel}\`);}}\nfor(const retired of ["QuranData.js","quranData.js","gameDefinitions.js","newGameDefinitions.js"]){try{await fs.access(path.join(src,retired));fail(\`retired source still exists: \${retired}\`);}catch{}}\nif(!router.includes("<NotFoundPage/>"))fail("RootRouter has no explicit NotFound page");\nif(process.exitCode)process.exit(process.exitCode);\nconsole.log(\`Game registry OK: \${GAME_REGISTRY.length} total, \${LIVE_GAME_DEFINITIONS.length} live. Routes, statuses and case-safe Quran modules validated.\`);\n`;
await write(path.join(scripts, "validate-game-registry.mjs"), validator);
await fs.rm(path.join(scripts, "check-game-registry.mjs"), { force: true });

// 9) Replace tests with registry semantics.
const tests = `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { GAME_REGISTRY, GAME_STATUS, LIVE_GAME_DEFINITIONS, gameDefinition, gamesBy } from "../src/gameRegistry.js";\n\ntest("game ids and routes are unique",()=>{assert.equal(new Set(GAME_REGISTRY.map(g=>g.id)).size,GAME_REGISTRY.length);assert.equal(new Set(GAME_REGISTRY.map(g=>g.route)).size,GAME_REGISTRY.length);});\ntest("all games use supported lifecycle statuses",()=>{for(const game of GAME_REGISTRY)assert.ok(Object.values(GAME_STATUS).includes(game.status),game.id);});\ntest("live games are GameEngine integrated",()=>{for(const game of LIVE_GAME_DEFINITIONS)assert.equal(game.engineIntegrated,true,game.id);});\ntest("content-dependent concepts are blocked",()=>{for(const id of ["listen-memorize","page-lines","quran-detective"])assert.equal(gameDefinition(id)?.status,GAME_STATUS.BLOCKED_CONTENT,id);});\ntest("known unfinished concepts remain planned",()=>{for(const id of ["forgetfulness-dungeon","gift-boxes","xo","balloon-pop","picture-memory","flashlight","hidden-picture","ayah-hunter","where-start","what-next","memory-race","surah-treasure","similarity-mirror","where-mentioned","similarity-boxes","word-box"])assert.equal(gameDefinition(id)?.status,GAME_STATUS.PLANNED,id);});\ntest("registry can filter by pack category status and age",()=>{assert.ok(gamesBy({pack:"quran-core",status:"live"}).length>0);assert.ok(gamesBy({category:"words",status:"live",age:8}).length>0);});\n`;
await write(path.join(app, "tests/gameRegistry.test.mjs"), tests);

// 10) Package scripts: validation is also part of build, not CI-only.
const pkgPath=path.join(app,"package.json");
const pkg=JSON.parse(await read(pkgPath));
pkg.scripts.check="node scripts/validate-game-registry.mjs && node scripts/check-teacher-access.mjs";
pkg.scripts.build="npm run check && node scripts/build-quran-data.mjs && vite build";
await write(pkgPath, JSON.stringify(pkg,null,2)+"\n");

// 11) Architecture and status documentation.
const architecture = `# Platform architecture\n\nThis document describes the repository as it actually operates today. It is intentionally explicit because the repository contains two deployment lineages.\n\n## Primary application: netlify-app\n\n\`netlify-app/\` is the canonical source for the current child/family/teacher learning UI and Quran games. It is a React 19 + Vite application. \`netlify.toml\` builds this directory directly with \`npm run build\` and publishes \`netlify-app/dist\`. GitHub Pages also builds this same application as a secondary static deployment.\n\nThe Netlify application talks directly to Supabase through \`netlify-app/src/api.js\` using Supabase Auth, REST and RPC. Durable learning state, children, game sessions, review queues, rewards and teacher data live in Supabase PostgreSQL. Browser storage is used only for client session/active-child selection where appropriate; it is not the durable learning database.\n\n## Quran data\n\nThe generated Quran corpus is \`netlify-app/public/quran/quran-data.json\`, produced by \`netlify-app/scripts/build-quran-data.mjs\`. Application code reads it through \`src/quranCorpus.js\`. Static surah names/order/count metadata lives separately in \`src/surahCatalog.js\`. Do not manually edit Quran text in components or generated data.\n\n## Games\n\n\`netlify-app/src/gameRegistry.js\` is the single metadata source of truth for every known game. A game is visible to children only when its status is \`live\`. Runtime session/progress/review behavior is handled by \`src/gameEngine.js\`. Game components remain grouped in the existing Quran game component files; the registry describes their public availability and metadata.\n\n## Supabase and migrations\n\nSupabase is the active database/authentication backend for the Netlify application. SQL migrations are source-controlled under \`patches-live/supabase/migrations/\`. That location is historical: it is also part of the Railway overlay described below. A migration file in Git is a record of intended schema; production migrations must still be applied to the connected Supabase project through the migration workflow/tooling.\n\n## Legacy/secondary full-stack path: source.tgz + patches-live\n\n\`source.tgz\` is an archived base full-stack application. \`railway-bootstrap.mjs\` extracts it into the repository root at build time, then recursively overlays \`patches-live/\`. The root \`package.json\` then installs/builds that extracted application. \`Dockerfile\` performs the same extract-and-overlay process.\n\nThis path is separate from \`netlify-app\` and is not the canonical source for the current Netlify learning UI. Do not duplicate a feature into both paths automatically. Changes to \`patches-live/client\` or \`patches-live/server\` should be intentional maintenance of the legacy/secondary full-stack deployment.\n\n## Railway / Render\n\nThe repository contains Railway bootstrap infrastructure at the root. Render is also configured through \`render.yaml\` to build the root Dockerfile, currently from the older \`supabase-integration\` branch. That makes Render a legacy/staging configuration, not the current source of truth for the Netlify UI. Changing that branch/deployment target is a deployment decision and is deliberately outside this architecture-cleanup change.\n\n## Authentication\n\nFor \`netlify-app\`, authentication is Supabase Auth. \`api.js\` manages sign-in/sign-up/recovery/session refresh and reads profile roles from Supabase. Parent/teacher/child durable records are database-backed.\n\n## Deployment source-of-truth table\n\n| Concern | Source of truth |\n| --- | --- |\n| Current web UI | \`netlify-app/\` |\n| Netlify deploy | \`netlify.toml\` → \`netlify-app/dist\` |\n| GitHub Pages deploy | \`.github/workflows/deploy-github-pages.yml\` → \`netlify-app/dist\` |\n| Auth + DB | Supabase Auth + PostgreSQL |\n| Game metadata | \`netlify-app/src/gameRegistry.js\` |\n| Game runtime | \`netlify-app/src/gameEngine.js\` + game components |\n| Quran generated corpus | \`netlify-app/public/quran/quran-data.json\` |\n| Supabase migration files | \`patches-live/supabase/migrations/\` |\n| Railway/root legacy app | \`source.tgz\` + \`patches-live/\` overlay |\n| Render legacy staging | root \`Dockerfile\`, configured on \`supabase-integration\` |\n\n## Rule for future development\n\nNew current-platform features belong in \`netlify-app\` and must use the existing Supabase/GameEngine/Quran layers. Do not create a parallel game registry, Quran text source, reward system, or review system. If the root Railway application is intentionally being maintained, treat that as a separate deployment target and document the synchronization decision explicitly.\n`;
await write(path.join(root,"docs/ARCHITECTURE.md"),architecture);

const projectStatus = `# Project status\n\nCurrent primary application: \`netlify-app\` (React + Vite) backed by Supabase Auth/PostgreSQL/RPC.\n\n- Game metadata is centralized in \`netlify-app/src/gameRegistry.js\`.\n- Live games use the existing GameEngine; unfinished/content-blocked games are not exposed as live.\n- Quran text is generated into \`netlify-app/public/quran/quran-data.json\` and consumed through \`quranCorpus.js\`.\n- Supabase migrations are tracked under \`patches-live/supabase/migrations\`.\n- \`source.tgz + patches-live\` remains a separate Railway/Render legacy full-stack build path.\n\nSee [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the authoritative repository/deployment map.\n`;
await write(path.join(root,"PROJECT_STATUS.md"),projectStatus);

const readme = `# أبو العزايم للحفظ الممتع\n\nمنصة عربية لحفظ ومراجعة القرآن للأطفال، مع حساب أسرة، وضع طفل، لوحة معلم، ألعاب تعليمية، مراجعة ذكية، نقاط ونجوم وإنجازات.\n\n## النسخة الحالية\n\nالمسار الأساسي الحالي هو \`netlify-app/\`:\n\n- React 19 + Vite\n- Supabase Auth\n- Supabase PostgreSQL / REST / RPC\n- GameEngine موحد للجلسات والإجابات والتقدم والمراجعة والمكافآت\n- Quran corpus مولد مركزيًا ولا تُكتب الآيات داخل مكونات الألعاب\n\nNetlify يبني \`netlify-app\` مباشرة. GitHub Pages يبني نفس التطبيق كمسار نشر ثانوي.\n\n## تشغيل نسخة Netlify محليًا\n\n\`\`\`bash\ncd netlify-app\nnpm install\nnpm run check\nnpm test\nnpm run build\nnpm run dev\n\`\`\`\n\nتحتاج نسخة التطوير إلى متغيرات Supabase العامة المناسبة (URL + publishable/anon key). لا تضع service-role key داخل Vite أو المتصفح.\n\n## بنية المستودع\n\n- \`netlify-app/\`: المصدر الأساسي للواجهة الحالية والألعاب.\n- \`patches-live/supabase/migrations/\`: سجل migrations الخاصة بـSupabase.\n- \`source.tgz + patches-live/\`: مسار full-stack قديم/ثانوي يستخدمه bootstrap الخاص بـRailway/Docker؛ ليس المصدر الأساسي لواجهة Netlify.\n- \`docs/ARCHITECTURE.md\`: شرح تفصيلي لمصادر الحقيقة ومسارات النشر.\n- \`PROJECT_STATUS.md\`: ملخص الحالة الحالية.\n\n## قواعد مهمة\n\n- \`netlify-app/src/gameRegistry.js\` هو المصدر الوحيد لتعريف وتوفر الألعاب.\n- اللعبة لا تظهر للطفل إلا إذا كانت \`status: live\`.\n- \`quranCorpus.js\` هو API قراءة corpus القرآن الكامل، و\`surahCatalog.js\` للـmetadata البسيطة للسور.\n- لا تعدل نص القرآن داخل Components، ولا تنشئ مصدر قرآن أو GameEngine أو Rewards/Review system موازٍ.\n\nللتفاصيل: [Architecture](docs/ARCHITECTURE.md).\n`;
await write(path.join(root,"README.md"),readme);

// Remove this one-shot automation before committing its generated changes.
await fs.rm(path.join(root,"scripts/architecture-stabilize-once.mjs"),{force:true});
await fs.rm(path.join(root,".github/workflows/architecture-stabilize-once.yml"),{force:true});

console.log(`Architecture stabilization generated: ${rows.length} games in canonical registry.`);
