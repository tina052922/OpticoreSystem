/**
 * Slims the campus map SVG for phones, without changing how it looks.
 *
 *   • The tree sprite is embedded as a 2400×2400 PNG and drawn 38 times at ~30–40 px. Phones had to
 *     decode a ~23 MB bitmap and downscale it on every repaint. It is re-encoded at 256×256 (still
 *     sharp at the map's maximum zoom); the <image> keeps its width/height, so the layout is identical.
 *   • Path / polygon / transform numbers are rounded to one decimal (0.1 map unit ≈ 0.2 px at the
 *     highest zoom), and whitespace between tags is removed.
 *
 * The untouched original is kept beside the source as `ctu-argao-campus-map.full.svg` (not served)
 * the first time this runs, and every run starts from that original.
 *
 * Usage (from opticore-web): node scripts/optimize-campus-map.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campusDir = path.join(root, "Smart-Campus Navigation System");
const sourceSvg = path.join(campusDir, "public", "maps", "ctu-argao-campus-map.svg");
const original = path.join(campusDir, "src", "imports", "ctu-argao-campus-map.full.svg");
const targets = [sourceSvg, path.join(root, "public", "maps", "ctu-argao-campus-map.svg")];

const SPRITE_MAX = 256;

if (!fs.existsSync(original)) {
  fs.copyFileSync(sourceSvg, original);
  console.log(`Kept the original map → ${path.relative(root, original)}`);
}
let svg = fs.readFileSync(original, "utf8");
const before = svg.length;

// 1. Oversized embedded PNGs → SPRITE_MAX px (the <image> width/height attributes stay as they are).
const images = [...svg.matchAll(/(href="data:image\/png;base64,)([^"]+)"/g)];
for (const m of images) {
  const buf = Buffer.from(m[2], "base64");
  const meta = await sharp(buf).metadata();
  if ((meta.width ?? 0) <= SPRITE_MAX && (meta.height ?? 0) <= SPRITE_MAX) continue;
  const small = await sharp(buf)
    .resize(SPRITE_MAX, SPRITE_MAX, { fit: "inside" })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
  svg = svg.replace(m[0], `${m[1]}${small.toString("base64")}"`);
  console.log(`Sprite ${meta.width}×${meta.height} (${buf.length} B) → ≤${SPRITE_MAX}px (${small.length} B)`);
}

// 2. Round coordinates in geometry attributes only (never inside data: URIs, never `transform`:
//    pattern images are placed with tiny scale factors like 0.0014, which rounding turned into 0 —
//    that made the trees and the basketball court disappear).
const num = /-?\d*\.\d+(?:e-?\d+)?/gi;
const round1 = (s) => {
  const t = (Math.round(Number(s) * 10) / 10).toFixed(1).replace(/\.0$/, "");
  return t === "-0" ? "0" : t;
};
svg = svg.replace(/(\s(?:d|points)=")([^"]*)"/g, (_, a, v) => `${a}${v.replace(num, round1)}"`);

// 3. Whitespace between tags.
svg = svg.replace(/>\s+</g, "><");

for (const t of targets) {
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, svg);
}
console.log(`Map ${before} B → ${svg.length} B, written to:\n  ${targets.map((t) => path.relative(root, t)).join("\n  ")}`);
