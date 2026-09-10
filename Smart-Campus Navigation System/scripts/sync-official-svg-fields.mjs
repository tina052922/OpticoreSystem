/**
 * Ensures each catalog row has official `svg_id` (= SVG layer id, same as `svgId`)
 * and normalizes image paths to `.JPG` per campus asset naming.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'src', 'app', 'data', 'json');

function toJPG(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/\.jpg$/i, '.JPG');
}

function fixImages(row) {
  if (typeof row.image === 'string') row.image = toJPG(row.image);
  else if (Array.isArray(row.image)) row.image = row.image.map(toJPG);
  if (Array.isArray(row.images)) row.images = row.images.map(toJPG);
}

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.json')) continue;
  const p = path.join(dir, file);
  const raw = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) continue;
  for (const row of data) {
    if (row.svgId != null && row.svgId !== '') {
      row.svg_id = String(row.svgId).trim();
    } else {
      delete row.svg_id;
    }
    fixImages(row);
  }
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
  console.log('Updated', file);
}
