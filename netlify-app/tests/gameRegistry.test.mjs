import test from "node:test";
import assert from "node:assert/strict";
import { GAME_REGISTRY, GAME_STATUS, LIVE_GAME_DEFINITIONS, gameDefinition, gamesBy } from "../src/gameRegistry.js";

const adaptiveKinds = {
  "ayah-hunter": ["next_ayah"],
  "where-start": ["ayah_beginning"],
  "what-next": ["next_ayah"],
  "build-ayah": ["word_order"],
  "memory-race": ["next_ayah", "missing_word"],
  "surah-treasure": ["next_ayah", "ayah_beginning", "missing_word"],
  "where-mentioned": ["surah_name"],
  "missing-word-adventure": ["missing_word"],
  "word-box": ["missing_word", "word_order"],
};

test("game ids and routes are unique",()=>{assert.equal(new Set(GAME_REGISTRY.map(g=>g.id)).size,GAME_REGISTRY.length);assert.equal(new Set(GAME_REGISTRY.map(g=>g.route)).size,GAME_REGISTRY.length);});
test("all games use supported lifecycle statuses",()=>{for(const game of GAME_REGISTRY)assert.ok(Object.values(GAME_STATUS).includes(game.status),game.id);});
test("live games are GameEngine integrated",()=>{for(const game of LIVE_GAME_DEFINITIONS)assert.equal(game.engineIntegrated,true,game.id);});
test("content-dependent concepts are blocked",()=>{for(const id of ["listen-memorize","page-lines","quran-detective","similarity-mirror","similarity-boxes"])assert.equal(gameDefinition(id)?.status,GAME_STATUS.BLOCKED_CONTENT,id);});
test("known unfinished concepts remain planned",()=>{for(const id of ["forgetfulness-dungeon","gift-boxes","xo","balloon-pop","picture-memory","flashlight","hidden-picture"])assert.equal(gameDefinition(id)?.status,GAME_STATUS.PLANNED,id);});
test("adaptive expansion games are live with matching question metadata",()=>{for(const [id,kinds] of Object.entries(adaptiveKinds)){const game=gameDefinition(id);assert.equal(game?.status,GAME_STATUS.LIVE,id);assert.equal(game?.engineIntegrated,true,id);for(const kind of kinds)assert.ok(game.supportedQuestionTypes.includes(kind),`${id}:${kind}`);}});
test("registry can filter by pack category status and age",()=>{assert.ok(gamesBy({pack:"quran-core",status:"live"}).length>0);assert.ok(gamesBy({category:"words",status:"live",age:8}).length>0);});
