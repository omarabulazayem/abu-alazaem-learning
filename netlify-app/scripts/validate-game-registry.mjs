import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_REGISTRY, GAME_STATUS, LIVE_GAME_DEFINITIONS } from "../src/gameRegistry.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const src=path.join(root,"src");
const required=["id","title","description","icon","category","pack","ageRange","educationalGoal","difficultyLevels","supportedQuestionTypes","requiredData","route","scene","status"];
const allowed=new Set(Object.values(GAME_STATUS));
function fail(message){console.error(`GAME REGISTRY VALIDATION FAILED: ${message}`);process.exitCode=1;}
async function walk(dir){const out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(full));else out.push(full);}return out;}

const ids=new Set(),routes=new Set();
for(const game of GAME_REGISTRY){
  for(const field of required) if(game[field]==null||game[field]==="") fail(`${game.id||"unknown"} missing ${field}`);
  if(ids.has(game.id))fail(`duplicate game id ${game.id}`); ids.add(game.id);
  if(routes.has(game.route))fail(`duplicate game route ${game.route}`); routes.add(game.route);
  if(!allowed.has(game.status))fail(`${game.id} invalid status ${game.status}`);
  if(game.status===GAME_STATUS.LIVE&&!game.engineIntegrated)fail(`${game.id} is live without GameEngine integration`);
}

const [router,expansion,hub,newHub]=await Promise.all([
  fs.readFile(path.join(src,"RootRouter.jsx"),"utf8"),
  fs.readFile(path.join(src,"NewQuranGamePack.jsx"),"utf8"),
  fs.readFile(path.join(src,"GamesHub.jsx"),"utf8"),
  fs.readFile(path.join(src,"NewGamePackHub.jsx"),"utf8"),
]);
for(const game of LIVE_GAME_DEFINITIONS){if(!router.includes(game.route)&&!expansion.includes(game.route))fail(`live game ${game.id} has no route/component mapping for ${game.route}`);}
const discovered=new Set([...router.matchAll(/["'](\/games\/[^"']+)["']/g),...expansion.matchAll(/["'](\/games\/[^"']+)["']/g)].map(m=>m[1]));
discovered.delete("/games/new-pack");
for(const route of discovered)if(!routes.has(route))fail(`game route ${route} exists in code but not in registry`);
if(!hub.includes('from "./gameRegistry.js"'))fail("GamesHub does not import canonical gameRegistry");
if(!newHub.includes('from "./gameRegistry.js"'))fail("NewGamePackHub does not import canonical gameRegistry");
if(/newGameDefinitions|gameDefinitions/.test(hub+newHub))fail("hub still references a retired definitions source");

const files=await walk(src);const lower=new Map();
for(const file of files){const rel=path.relative(src,file).replaceAll(path.sep,"/");const key=rel.toLowerCase();if(lower.has(key)&&lower.get(key)!==rel)fail(`case-insensitive filename collision: ${lower.get(key)} vs ${rel}`);else lower.set(key,rel);if(/\.(?:js|jsx|mjs)$/.test(file)){const text=await fs.readFile(file,"utf8");if(text.includes("./QuranData.js")||text.includes("./quranData.js"))fail(`legacy QuranData import remains in ${rel}`);}}
for(const retired of ["QuranData.js","quranData.js","gameDefinitions.js","newGameDefinitions.js"]){try{await fs.access(path.join(src,retired));fail(`retired source still exists: ${retired}`);}catch{}}
const adaptiveSource=await fs.readFile(path.join(src,"adaptiveGameSession.js"),"utf8");
const adaptiveLearningSource=await fs.readFile(path.join(src,"adaptiveLearning.js"),"utf8");
const adaptiveCss=await fs.readFile(path.join(src,"adaptive-games.css"),"utf8");
const mainSource=await fs.readFile(path.join(src,"main.jsx"),"utf8");
const engineSource=await fs.readFile(path.join(src,"gameEngine.js"),"utf8");
for(const token of ["GameEngine.dueReview","GameEngine.latestIncomplete","GameEngine.recentEvents","nextEngine.save","nextEngine.attach","GameEngine.abandonSession"])if(!adaptiveSource.includes(token))fail(`adaptive session missing ${token}`);
if(adaptiveLearningSource.includes("Math.random"))fail("adaptive question selection must not use Math.random");
for(const token of ["onPointerDown","onPointerMove","onPointerUp","onKeyDown"])if(!expansion.includes(token))fail(`Build Ayah missing ${token}`);
if(!adaptiveCss.includes("touch-action:none"))fail("adaptive puzzle CSS is not touch-safe");
if(!mainSource.includes("./adaptive-games.css"))fail("adaptive game CSS is not loaded");
for(const token of ["attach(session)","recentEvents(childId, gameId","abandonSession(sessionId)","if (this.teacherPreview) return { ...this.local }"])if(!engineSource.includes(token))fail(`GameEngine missing ${token}`);
const migration=await fs.readFile(path.resolve(root,"..","patches-live/supabase/migrations/20260918_adaptive_game_abandon.sql"),"utf8");
if(!migration.includes("abandon_game_session")||!migration.includes("reward_awarded = false"))fail("adaptive abandon migration is incomplete");
if(!router.includes("<NotFoundPage/>"))fail("RootRouter has no explicit NotFound page");
if(process.exitCode)process.exit(process.exitCode);
console.log(`Game registry OK: ${GAME_REGISTRY.length} total, ${LIVE_GAME_DEFINITIONS.length} live. Routes, statuses and case-safe Quran modules validated.`);
