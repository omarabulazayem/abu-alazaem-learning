import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"..");

test("CMS compatibility migration maps editorial concepts without replacing learning domain tables",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_cms_compatibility_layer.sql"),"utf8");
  for(const table of ["cms_content","cms_content_meta","cms_terms","cms_taxonomies","cms_term_relationships","cms_media","cms_options","cms_navigation"])assert.ok(sql.includes(`public.${table}`),table);
  for(const domain of ["child_profiles","game_sessions","game_ayah_events","learning_progress","review_queue"])assert.equal(new RegExp(`alter\\s+table\\s+public\\.${domain}\\s+rename`,"i").test(sql),false,domain);
  assert.match(sql,/WordPress mapping: wp_posts-like/);
  assert.match(sql,/Media Library/);
});

test("WordPress migration guide keeps telemetry in dedicated domain tables",async()=>{
  const doc=await fs.readFile(path.join(repo,"docs/WORDPRESS_MIGRATION.md"),"utf8");
  for(const term of ["wp_posts","wp_postmeta","wp_terms","wp_term_taxonomy","wp_term_relationships","wp_options","game_sessions","game_ayah_events","review_queue"])assert.ok(doc.includes(term),term);
  assert.match(doc,/custom WordPress tables/i);
});

test("site visual system is loaded after feature styles",async()=>{
  const main=await fs.readFile(path.join(root,"src/main.jsx"),"utf8");
  const imports=[...main.matchAll(/import\s+["'](\.\/[^"']+\.css)["']/g)].map(m=>m[1]);
  assert.equal(imports.at(-1),"./design-system.css");
  for(const legacy of ["./site-design.css","./kids-light-ui.css","./child-worlds.css","./illustrated-child-world.css","./real-child-art-fix.css"]){
    assert.equal(imports.includes(legacy),false,`legacy visual import: ${legacy}`);
  }
});

test("online visual assets have explicit attribution documentation",async()=>{
  const doc=await fs.readFile(path.join(repo,"docs/VISUAL_ASSETS.md"),"utf8");
  assert.match(doc,/CC BY 2\.0/);
  assert.match(doc,/CC BY-SA 4\.0/);
  assert.match(doc,/el7bara/);
  assert.match(doc,/Historian128/);
  assert.match(doc,/Ahmedalbadawy/);
});
