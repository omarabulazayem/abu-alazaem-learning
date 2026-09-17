import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const src=path.resolve(here,"../src");
const emoji=/\p{Extended_Pictographic}/gu;
// Two transitional data-level exceptions only. NewQuranGamePack literals are visually suppressed
// by visual-cleanup.css; api.js keeps the historical stored avatar default until the profile
// migration removes it. No other application source may introduce pictographic emoji.
const allowedFiles=new Set(["NewQuranGamePack.jsx","api.js"]);

async function walk(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else if(/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name))out.push(full);
  }
  return out;
}

const findings=[];
for(const file of await walk(src)){
  const rel=path.relative(src,file).replaceAll(path.sep,"/");
  if(allowedFiles.has(rel))continue;
  const text=await fs.readFile(file,"utf8");
  const lines=text.split(/\r?\n/);
  lines.forEach((line,index)=>{
    const matches=[...line.matchAll(emoji)].map(match=>match[0]);
    if(matches.length)findings.push(`${rel}:${index+1} ${[...new Set(matches)].join(" ")}`);
  });
}

if(findings.length){
  console.error("DECORATIVE EMOJI VALIDATION FAILED. Replace pictographic emoji with Icon/SVG/media:\n"+findings.join("\n"));
  process.exit(1);
}
console.log("Decorative emoji audit OK outside two documented legacy data files.");
