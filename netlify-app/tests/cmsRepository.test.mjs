import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"..");

test("CMS repository exposes WordPress-portable read operations",async()=>{
  const source=await fs.readFile(path.join(root,"src/cmsRepository.js"),"utf8");
  for(const name of ["getContentBySlug","listContent","getContentMeta","getMedia","getNavigation","getOption","listTaxonomy"])assert.ok(source.includes(`function ${name}`)||source.includes(`function ${name}(`)||source.includes(`async function ${name}`)||source.includes(`export async function ${name}`),name);
  assert.match(source,/cms_content/);
  assert.match(source,/cms_media/);
  assert.match(source,/cms_navigation/);
  assert.match(source,/is_public=eq\.true/);
});

test("public CMS migration exposes only published/public reads",async()=>{
  const sql=await fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_cms_public_read.sql"),"utf8");
  assert.match(sql,/status='publish'/);
  assert.match(sql,/is_public=true/);
  assert.match(sql,/revoke insert,update,delete/);
  assert.match(sql,/to anon, authenticated/);
});

test("global media credits accompany remotely licensed visuals",async()=>{
  const source=await fs.readFile(path.join(root,"src/SiteCredits.jsx"),"utf8");
  for(const token of ["el7bara","Historian128","Ahmedalbadawy","CC BY 2.0","CC BY-SA 4.0"])assert.ok(source.includes(token),token);
  const main=await fs.readFile(path.join(root,"src/main.jsx"),"utf8");
  assert.match(main,/SiteCredits/);
});
