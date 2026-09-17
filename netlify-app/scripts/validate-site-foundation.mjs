import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"..");
function fail(message){console.error(`SITE FOUNDATION VALIDATION FAILED: ${message}`);process.exitCode=1;}

const [main,design,assetsDoc,wpDoc,cmsSql,tafsirSql,newHub,family]=await Promise.all([
  fs.readFile(path.join(root,"src/main.jsx"),"utf8"),
  fs.readFile(path.join(root,"src/site-design.css"),"utf8"),
  fs.readFile(path.join(repo,"docs/VISUAL_ASSETS.md"),"utf8"),
  fs.readFile(path.join(repo,"docs/WORDPRESS_MIGRATION.md"),"utf8"),
  fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_cms_compatibility_layer.sql"),"utf8"),
  fs.readFile(path.join(repo,"patches-live/supabase/migrations/20260918_tafsir_world_foundation.sql"),"utf8"),
  fs.readFile(path.join(root,"src/NewGamePackHub.jsx"),"utf8"),
  fs.readFile(path.join(root,"src/FamilyPage.jsx"),"utf8"),
]);

const imports=[...main.matchAll(/import\s+["'](\.\/[^"']+\.css)["']/g)].map(m=>m[1]);
if(imports.at(-1)!=="./site-design.css")fail("site-design.css must be the final CSS import so the visual system is site-wide");
for(const token of ["--site-quran-image","--site-learning-image","homeHeroVisual","game-world-hero","teacherHero","tafsir-hero"])if(!design.includes(token))fail(`site design is missing ${token}`);
for(const source of ["Opened Qur'an","Sundanese Muslim children","Sultan Hassan","CC BY 2.0","CC BY-SA 4.0"])if(!assetsDoc.includes(source))fail(`visual asset documentation missing ${source}`);
for(const table of ["cms_content","cms_content_meta","cms_terms","cms_taxonomies","cms_term_relationships","cms_media","cms_options","cms_navigation"])if(!cmsSql.includes(`public.${table}`))fail(`CMS migration missing ${table}`);
for(const mapping of ["wp_posts","wp_postmeta","wp_terms","wp_term_taxonomy","wp_term_relationships","wp_options"])if(!wpDoc.includes(mapping))fail(`WordPress migration guide missing ${mapping}`);
if(/insert\s+into\s+public\.tafsir_(content|questions)/i.test(tafsirSql))fail("Tafsir foundation must not seed religious interpretation content");
if(!tafsirSql.includes("approval_status = 'approved'")||!tafsirSql.includes("content_not_approved"))fail("Tafsir approval gate is incomplete");
for(const emoji of ["🍃","🚪","🎁","🪞","✨"])if(newHub.includes(emoji))fail(`expansion hub still contains decorative emoji ${emoji}`);
if(family.includes('avatar:child.avatar||"🧒🏻"')||family.includes('avatar: child.avatar || "🧒🏻"'))fail("Family child editing still uses an emoji avatar fallback");

if(process.exitCode)process.exit(process.exitCode);
console.log("Site foundation OK: visual system, media attribution, WordPress portability and Tafsir safety gates validated.");
