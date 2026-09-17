import test from "node:test";
import assert from "node:assert/strict";
import { GAME_REGISTRY, GAME_STATUS, LIVE_GAME_DEFINITIONS, gameDefinition, gamesBy } from "../src/gameRegistry.js";

test("game ids and routes are unique",()=>{assert.equal(new Set(GAME_REGISTRY.map(g=>g.id)).size,GAME_REGISTRY.length);assert.equal(new Set(GAME_REGISTRY.map(g=>g.route)).size,GAME_REGISTRY.length);});
test("all games use supported lifecycle statuses",()=>{for(const game of GAME_REGISTRY)assert.ok(Object.values(GAME_STATUS).includes(game.status),game.id);});
test("live games are GameEngine integrated",()=>{for(const game of LIVE_GAME_DEFINITIONS)assert.equal(game.engineIntegrated,true,game.id);});
test("content-dependent concepts are blocked",()=>{for(const id of ["listen-memorize","page-lines","quran-detective"])assert.equal(gameDefinition(id)?.status,GAME_STATUS.BLOCKED_CONTENT,id);});
test("known unfinished concepts remain planned",()=>{for(const id of ["forgetfulness-dungeon","gift-boxes","xo","balloon-pop","picture-memory","flashlight","hidden-picture","ayah-hunter","where-start","what-next","memory-race","surah-treasure","similarity-mirror","where-mentioned","similarity-boxes","word-box"])assert.equal(gameDefinition(id)?.status,GAME_STATUS.PLANNED,id);});
test("registry can filter by pack category status and age",()=>{assert.ok(gamesBy({pack:"quran-core",status:"live"}).length>0);assert.ok(gamesBy({category:"words",status:"live",age:8}).length>0);});
