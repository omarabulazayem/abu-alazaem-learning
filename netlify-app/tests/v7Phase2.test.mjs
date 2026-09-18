import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"..");

test("V7 Phase 2 uses append-only point accounting and a global wallet",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase2_wallet_ledger.sql"),"utf8");
  for(const table of ["student_wallets","point_ledger","game_store_items","game_unlocks"]){
    assert.ok(sql.includes(`public.${table}`),table);
  }
  for(const type of ["GAME_PURCHASE","POINT_REVERSAL","LEGACY_REWARD","LEGACY_BALANCE_IMPORT"]){
    assert.ok(sql.includes(`'${type}'`),type);
  }
  assert.match(sql,/before update or delete on public\.point_ledger/i);
  assert.match(sql,/insufficient_wallet_balance/i);
  assert.match(sql,/lifetime_points_cannot_be_negative/i);
});

test("game purchase price is server authoritative and unlock is permanent",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_v7_phase2_wallet_ledger.sql"),"utf8");
  assert.match(sql,/from public\.game_store_items/i);
  assert.match(sql,/wallet_delta.*-v_item\.wallet_price/is);
  assert.match(sql,/unique\(student_id,game_id\)/i);
  assert.equal(/insert\s+into\s+public\.game_store_items\s*\(/i.test(sql),false,"Phase 2 must not invent game prices");
});

test("child and family surfaces read V7 wallet values rather than legacy points",async()=>{
  const [child,family,api]=await Promise.all([
    fs.readFile(path.join(root,"src/ChildHub.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/FamilyPage.jsx"),"utf8"),
    fs.readFile(path.join(root,"src/api.js"),"utf8"),
  ]);
  assert.ok(child.includes("getStudentWallet"));
  assert.ok(child.includes("wallet_balance"));
  assert.equal(child.includes("child?.points"),false);
  assert.ok(family.includes("listStudentWallets"));
  assert.ok(family.includes("activeWallet.wallet_balance"));
  for(const fn of ["getStudentWallet","listStudentWallets","listGameStoreItems","listGameUnlocks","purchaseGameUnlock"]){
    assert.ok(api.includes(`function ${fn}`)||api.includes(`async function ${fn}`),fn);
  }
});

test("game store preserves free games until server-side prices are activated",async()=>{
  const hub=await fs.readFile(path.join(root,"src/GamesHub.jsx"),"utf8");
  assert.ok(hub.includes("storeMap.has(g.id)"));
  assert.ok(hub.includes("purchaseGameUnlock"));
  assert.ok(hub.includes("teacher?0"));
  assert.ok(hub.includes("الأسعار لم تُفعّل بعد"));
  assert.ok(hub.includes("teacherPreview"));
});
