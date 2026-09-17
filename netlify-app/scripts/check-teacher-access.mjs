import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve("src");

// These files are either routing/infrastructure or child-specific implementations
// that teachers never render directly because RootRouter supplies a dedicated safe preview.
const centrallyHandled = new Set([
  "App.jsx",
  "RootRouter.jsx",
  "TeacherPortal.jsx",
  "TeacherAccessBar.jsx",
  "TeacherLearningPreview.jsx",
  "TeacherQuranPreview.jsx",
  "accessPolicy.js",
  "learningViewer.js",
  "ChildHub.jsx",
  "MemorizePage.jsx",
  "AchievementsPage.jsx",
]);

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(jsx?|tsx?)$/.test(entry.name) ? [full] : [];
  });
}

// We only reject a forced role guard that immediately sends teachers away.
// Normal navigation buttons and account links to /teacher are explicitly allowed.
const forcedTeacherRedirect = /if\s*\([^)]*accountType\s*={2,3}\s*["']teacher["'][^)]*\)\s*(?:\{\s*)?(?:return\s+)?(?:navigate|go)\s*\(\s*["']\/teacher["']\s*\)/gs;

const violations = [];
for (const file of files(srcDir)) {
  if (centrallyHandled.has(path.basename(file))) continue;
  const text = fs.readFileSync(file, "utf8");
  if (forcedTeacherRedirect.test(text)) violations.push(path.relative(process.cwd(), file));
  forcedTeacherRedirect.lastIndex = 0;
}

if (violations.length) {
  console.error("Teacher-access policy violation: learning/content pages must not force teachers back to /teacher.");
  console.error("Normal teacher navigation is allowed. Restrict only through src/accessPolicy.js or a dedicated preview routed centrally.");
  for (const file of violations) console.error(` - ${file}`);
  process.exit(1);
}
console.log("Teacher-access policy check passed.");
