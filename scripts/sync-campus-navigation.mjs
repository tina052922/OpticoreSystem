/**
 * Build Smart-Campus Navigation and copy it into Next `public/`
 * so `/campus-navigation` → `/campus-navigation-standalone.html` serves the latest kiosk.
 *
 * Usage (repo root): npm run build:campus-nav
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campusDir = path.join(root, "Smart-Campus Navigation System");
const distDir = path.join(campusDir, "dist");
const publicDir = path.join(root, "public");
const photosSrc = path.join(campusDir, "src", "app", "assets", "images", "Images");
const standaloneName = "campus-navigation-standalone.html";
const photosOnly = process.argv.includes("--photos-only");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyDirIfPresent(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
}

function copyCampusPhotosFromSource() {
  const dest = path.join(publicDir, "campus-photos");
  if (!fs.existsSync(photosSrc)) {
    console.warn(`Campus photo source missing: ${photosSrc}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(photosSrc)) {
    if (name.startsWith(".")) continue;
    const src = path.join(photosSrc, name);
    if (!fs.statSync(src).isFile()) continue;
    fs.copyFileSync(src, path.join(dest, name));
  }
  console.log(`Copied campus photos → public/campus-photos`);
}

function readStandaloneAssetRefs(html) {
  const refs = new Set();
  const re = /\/assets\/([^"'?\s]+)/g;
  let match;
  while ((match = re.exec(html))) {
    refs.add(match[1]);
  }
  return refs;
}

if (photosOnly) {
  copyCampusPhotosFromSource();
  process.exit(0);
}

if (!fs.existsSync(path.join(campusDir, "package.json"))) {
  console.error(`Missing campus app at ${campusDir}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(campusDir, "node_modules"))) {
  console.log("Installing Smart-Campus Navigation dependencies...");
  run("npm", ["install"], campusDir);
}

console.log("Building Smart-Campus Navigation...");
run("npm", ["run", "build"], campusDir);

const builtHtmlPath = path.join(distDir, "index.html");
if (!fs.existsSync(builtHtmlPath)) {
  console.error(`Vite build did not write ${builtHtmlPath}`);
  process.exit(1);
}

const previousStandalone = path.join(publicDir, standaloneName);
const previousRefs = fs.existsSync(previousStandalone)
  ? readStandaloneAssetRefs(fs.readFileSync(previousStandalone, "utf8"))
  : new Set();

const builtHtml = fs.readFileSync(builtHtmlPath, "utf8");
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, standaloneName), builtHtml);

copyDirIfPresent(path.join(distDir, "assets"), path.join(publicDir, "assets"));
copyDirIfPresent(path.join(distDir, "campus-photos"), path.join(publicDir, "campus-photos"));
copyDirIfPresent(path.join(distDir, "images"), path.join(publicDir, "images"));
copyDirIfPresent(path.join(distDir, "maps"), path.join(publicDir, "maps"));

const nextRefs = readStandaloneAssetRefs(builtHtml);
const publicAssets = path.join(publicDir, "assets");
for (const name of previousRefs) {
  if (nextRefs.has(name)) continue;
  const stale = path.join(publicAssets, name);
  if (fs.existsSync(stale) && fs.statSync(stale).isFile()) {
    fs.unlinkSync(stale);
  }
}

console.log(`Synced campus navigation → public/${standaloneName}`);
