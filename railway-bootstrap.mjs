import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

if (!existsSync("source.tgz")) {
  throw new Error("source.tgz is missing");
}

console.log("Extracting application source...");
execFileSync("tar", ["-xzf", "source.tgz"], { stdio: "inherit" });

if (existsSync("patches-live")) {
  console.log("Applying live source patches...");
  for (const entry of readdirSync("patches-live")) {
    cpSync(path.join("patches-live", entry), entry, { recursive: true, force: true });
  }
}

console.log("Application source is ready.");
