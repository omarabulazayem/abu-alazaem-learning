import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"..");

test("legacy App shell is removed and login route uses focused page",async()=>{
  await assert.rejects(fs.access(path.join(root,"src/App.jsx")));
  const router=await fs.readFile(path.join(root,"src/RootRouter.jsx"),"utf8");
  assert.match(router,/LoginPage/);
  assert.match(router,/path===\"\/login\"\)page=<LoginPage\/>/);
  assert.equal(router.includes('from "./App.jsx"'),false);
});

test("child avatar migration removes emoji defaults at database boundary",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_normalize_child_avatar.sql"),"utf8");
  assert.match(sql,/alter column avatar drop default/);
  assert.match(sql,/normalize_child_avatar_trigger/);
  assert.match(sql,/new\.avatar := null/);
});

test("login page is image and SVG-icon based",async()=>{
  const source=await fs.readFile(path.join(root,"src/LoginPage.jsx"),"utf8");
  assert.match(source,/Icon/);
  assert.equal(/\p{Extended_Pictographic}/u.test(source),false);
  const css=await fs.readFile(path.join(root,"src/login-page.css"),"utf8");
  assert.match(css,/commons\.wikimedia\.org/);
});
