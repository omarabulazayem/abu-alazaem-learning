import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALL_GAME_DEFINITIONS,
  IMPLEMENTED_GAME_DEFINITIONS,
  PLANNED_GAME_DEFINITIONS,
} from "../src/gameDefinitions.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const [router, expansionRoutes, hub] = await Promise.all([
  fs.readFile(path.join(root, "src/RootRouter.jsx"), "utf8"),
  fs.readFile(path.join(root, "src/NewQuranGamePack.jsx"), "utf8"),
  fs.readFile(path.join(root, "src/GamesHub.jsx"), "utf8"),
]);

function fail(message) {
  console.error(`GAME REGISTRY CHECK FAILED: ${message}`);
  process.exitCode = 1;
}

const ids = new Set();
const routes = new Set();
for (const game of ALL_GAME_DEFINITIONS) {
  if (!game.id) fail("A game definition has no id");
  if (!game.route) fail(`${game.id} has no route`);
  if (ids.has(game.id)) fail(`Duplicate game id: ${game.id}`);
  if (routes.has(game.route)) fail(`Duplicate game route: ${game.route}`);
  ids.add(game.id);
  routes.add(game.route);
  if (!["implemented", "planned"].includes(game.status)) fail(`${game.id} has invalid status ${game.status}`);
}

for (const game of IMPLEMENTED_GAME_DEFINITIONS) {
  if (!game.engineIntegrated) fail(`${game.id} is marked implemented but is not integrated with GameEngine`);
  if (!router.includes(game.route) && !expansionRoutes.includes(`\"${game.route}\"`)) {
    fail(`${game.id} is implemented but no route implementation was found for ${game.route}`);
  }
}

if (/const\s+quranWorld\s*=/.test(hub) || /const\s+classicGames\s*=\s*\[/.test(hub)) {
  fail("GamesHub contains a manually maintained game list instead of reading the registry");
}
if (!hub.includes("implementedGamesByGroup")) {
  fail("GamesHub is not reading from the canonical game registry");
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Game registry OK: ${ALL_GAME_DEFINITIONS.length} total, ${IMPLEMENTED_GAME_DEFINITIONS.length} implemented, ${PLANNED_GAME_DEFINITIONS.length} planned.`);
