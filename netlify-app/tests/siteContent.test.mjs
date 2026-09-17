import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_HOME_CONTENT, DEFAULT_MAIN_NAV } from "../src/siteContent.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");

test("homepage has safe editorial fallbacks while CMS is empty",()=>{
  assert.ok(DEFAULT_HOME_CONTENT.hero.title);
  assert.ok(DEFAULT_HOME_CONTENT.sections.length>=6);
  assert.ok(DEFAULT_MAIN_NAV.length>=6);
});

test("homepage component consumes CMS site content instead of owning editorial arrays",async()=>{
  const source=await fs.readFile(path.join(root,"src/HomePage.jsx"),"utf8");
  assert.match(source,/loadHomeContent/);
  assert.equal(source.includes("const navItems = ["),false);
  assert.equal(source.includes("const sections = ["),false);
  assert.equal(source.includes("function HeroScene"),false);
  assert.match(source,/homeHeroVisual/);
});

test("site content resolver uses WordPress-portable repository functions",async()=>{
  const source=await fs.readFile(path.join(root,"src/siteContent.js"),"utf8");
  assert.match(source,/getContentBySlug/);
  assert.match(source,/getNavigation/);
  assert.match(source,/\"page\",\"home\"/);
  assert.match(source,/\"primary\"/);
});
