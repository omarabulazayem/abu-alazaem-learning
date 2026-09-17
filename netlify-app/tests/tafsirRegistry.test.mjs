import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TAFSIR_GAME_DEFINITIONS, TAFSIR_STATUS } from "../src/tafsirRegistry.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");

test("Tafsir World keeps the requested 20 concepts with unique ids and routes",()=>{
  assert.equal(TAFSIR_GAME_DEFINITIONS.length,20);
  assert.equal(new Set(TAFSIR_GAME_DEFINITIONS.map(x=>x.id)).size,20);
  assert.equal(new Set(TAFSIR_GAME_DEFINITIONS.map(x=>x.route)).size,20);
});

test("all Tafsir concepts remain content-blocked until reviewed data exists",()=>{
  for(const game of TAFSIR_GAME_DEFINITIONS){
    assert.equal(game.status,TAFSIR_STATUS.BLOCKED_CONTENT,game.id);
    assert.equal(game.requiresApprovedContent,true,game.id);
  }
});

test("first four mechanics keep their canonical ids",()=>{
  assert.deepEqual(TAFSIR_GAME_DEFINITIONS.slice(0,4).map(x=>x.id),[
    "what-does-ayah-mean","key-word","meaning-boxes","meaning-or-not"
  ]);
});

test("source-sensitive concepts preserve explicit evidence constraints",()=>{
  const byId=Object.fromEntries(TAFSIR_GAME_DEFINITIONS.map(x=>[x.id,x]));
  assert.match(byId["where-did-it-happen"].mechanic,/دليل معتبر/);
  assert.match(byId.why.mechanic,/سبب موثق/);
  assert.match(byId["cause-and-result"].mechanic,/واضحة وموثقة/);
  assert.match(byId["ayah-story"].mechanic,/موثق/);
});

test("database migration enforces approval and does not seed tafsir prose",async()=>{
  const sql=await fs.readFile(path.resolve(root,"..","patches-live/supabase/migrations/20260918_tafsir_world_foundation.sql"),"utf8");
  for(const token of ["approval_status = 'approved'","content_not_approved","source_reference","child_friendly_explanation","record_tafsir_game_event","tafsir_review_queue"])assert.ok(sql.includes(token),token);
  assert.equal(/insert\s+into\s+public\.tafsir_content/i.test(sql),false,"migration must not seed tafsir content");
  assert.equal(/insert\s+into\s+public\.tafsir_questions/i.test(sql),false,"migration must not seed tafsir questions");
});
