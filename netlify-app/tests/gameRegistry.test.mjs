import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_GAME_DEFINITIONS,
  IMPLEMENTED_GAME_DEFINITIONS,
  PLANNED_GAME_DEFINITIONS,
  gameDefinition,
} from "../src/gameDefinitions.js";

test("game ids and routes are unique", () => {
  assert.equal(new Set(ALL_GAME_DEFINITIONS.map(game => game.id)).size, ALL_GAME_DEFINITIONS.length);
  assert.equal(new Set(ALL_GAME_DEFINITIONS.map(game => game.route)).size, ALL_GAME_DEFINITIONS.length);
});

test("every game is explicitly implemented or planned", () => {
  for (const game of ALL_GAME_DEFINITIONS) {
    assert.ok(["implemented", "planned"].includes(game.status), `${game.id} has invalid status`);
  }
  assert.equal(IMPLEMENTED_GAME_DEFINITIONS.length + PLANNED_GAME_DEFINITIONS.length, ALL_GAME_DEFINITIONS.length);
});

test("implemented games use GameEngine", () => {
  for (const game of IMPLEMENTED_GAME_DEFINITIONS) {
    assert.equal(game.engineIntegrated, true, `${game.id} must use GameEngine before it can be implemented`);
  }
});

test("known unimplemented concepts remain planned", () => {
  for (const id of ["forgetfulness-dungeon", "listen-memorize", "page-lines", "quran-detective", "gift-boxes", "xo", "balloon-pop", "picture-memory", "flashlight", "hidden-picture"]) {
    assert.equal(gameDefinition(id)?.status, "planned", `${id} must not be exposed as implemented`);
  }
});

test("expansion games with incomplete replay/session loops stay planned", () => {
  for (const id of ["ayah-hunter", "where-start", "what-next", "memory-race", "surah-treasure", "similarity-boxes", "similarity-mirror", "where-mentioned", "word-box"]) {
    assert.equal(gameDefinition(id)?.status, "planned", `${id} must stay hidden until its full loop is verified`);
  }
});

test("verified expansion games remain available", () => {
  for (const id of ["build-ayah", "missing-word-adventure"]) {
    assert.equal(gameDefinition(id)?.status, "implemented");
    assert.equal(gameDefinition(id)?.engineIntegrated, true);
  }
});

test("classic games are migrated to GameEngine", () => {
  for (const id of ["classic-memory", "classic-surah-order", "classic-surah-quiz"]) {
    assert.equal(gameDefinition(id)?.status, "implemented");
    assert.equal(gameDefinition(id)?.engineIntegrated, true);
  }
});
