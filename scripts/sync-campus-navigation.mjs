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
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

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

/**
 * Phone-sized copies of the campus photos. The originals (2–3 MB, ~4000 px wide) stay in the
 * source folder; what is served is at most PHOTO_MAX_WIDTH wide and re-compressed, with the same
 * file name so every catalog URL keeps working. Files already small enough are left alone.
 */
const PHOTO_MAX_WIDTH = 1600;
const PHOTO_SMALL_BYTES = 400 * 1024;

async function optimizePhotosIn(dir) {
  if (!fs.existsSync(dir)) return;
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.warn("sharp is not available; campus photos are served at full size.");
    return;
  }
  let before = 0;
  let after = 0;
  let changed = 0;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (!/\.(jpe?g|png)$/i.test(name) || !fs.statSync(file).isFile()) continue;
    const input = fs.readFileSync(file);
    before += input.length;
    const meta = await sharp(input).metadata().catch(() => null);
    if (!meta || (input.length <= PHOTO_SMALL_BYTES && (meta.width ?? 0) <= PHOTO_MAX_WIDTH)) {
      after += input.length;
      continue;
    }
    const pipeline = sharp(input).rotate().resize({ width: PHOTO_MAX_WIDTH, withoutEnlargement: true });
    const output = /\.png$/i.test(name)
      ? await pipeline.png({ compressionLevel: 9, palette: true, quality: 85 }).toBuffer()
      : await pipeline.jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    if (output.length < input.length) {
      fs.writeFileSync(file, output);
      after += output.length;
      changed++;
    } else {
      after += input.length;
    }
  }
  const mb = (n) => (n / 1024 / 1024).toFixed(1);
  console.log(`Optimized ${changed} campus photos: ${mb(before)} MB → ${mb(after)} MB`);
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
  await optimizePhotosIn(path.join(publicDir, "campus-photos"));
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

await optimizePhotosIn(path.join(publicDir, "campus-photos"));

console.log(`Synced campus navigation → public/${standaloneName}`);
