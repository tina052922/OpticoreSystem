import { normalizeLocationImageSrc, PUBLIC_IMAGE_PLACEHOLDER } from './publicAssetUrl';

/**
 * Filename index only — do not `?url`-import photos (that emits `/src/...` img URLs that die with the Vite tab).
 * Files are served from `/campus-photos/<filename>` (dev middleware + build copy).
 */
const photoGlob = import.meta.glob('../assets/images/Images/**/*');

/** Disk filename as exported in the Images dump (preserves real case / punctuation). */
const originalByLower = new Map<string, string>();
const originalByStem = new Map<string, string>();
/**
 * Hand-maintained aliases for known filename discrepancies between the official tables and the actual asset files.
 * Key and value are *filenames only* (no directories). Matching is case-insensitive.
 */
const FILE_ALIASES: Record<string, string> = {
  // Catalog may use .JPG; file on disk is .jpg (public/images/landmark/). Keys match basename lowercased.
  'maincampusentrance.jpg': 'MainCampusEntrance.jpg',
  'maincampusentrance.jpeg': 'MainCampusEntrance.jpg',
  // Official table uses UtilityOffice.JPG, actual asset is misspelled.
  'utilityoffice.jpg': 'UitilityOffice.JPG',
  'utilityoffice.jpeg': 'UitilityOffice.JPG',
  'utilityoffice.JPG': 'UitilityOffice.JPG',
  // Official table uses IMG_4473.JPG for Garments Room; asset folder contains GarmentsRoom.jpg.
  'img_4473.jpg': 'GarmentsRoom.jpg',
  'img_4473.jpeg': 'GarmentsRoom.jpg',
  'img_4473.JPG': 'GarmentsRoom.jpg',
  // Official table uses SharedServiceFacilityForHandbloomWeaving.JPG, asset contains comma-separated variant.
  'sharedservicefacilityforhandbloomweaving.jpg': 'SharedService,FacilityForHandbloomWeaving.jpg',
  'sharedservicefacilityforhandbloomweaving.JPG': 'SharedService,FacilityForHandbloomWeaving.jpg',
};

function stemKey(filename: string): string {
  const base = filename.replace(/\.(jpe?g|png)$/i, '');
  return base.toLowerCase().replace(/[^a-z0-9]/g, '');
}

for (const importPath of Object.keys(photoGlob)) {
  const segment = importPath.split('/').pop() ?? '';
  if (!segment || segment.startsWith('.')) continue;
  if (!/\.(jpe?g|png|webp)$/i.test(segment)) continue;
  originalByLower.set(segment.toLowerCase(), segment);
  const stem = stemKey(segment);
  if (stem && !originalByStem.has(stem)) originalByStem.set(stem, segment);
}

function campusPhotoUrl(fileName: string): string {
  return normalizeLocationImageSrc(`/campus-photos/${fileName}`);
}

function basenameFromCatalogPath(catalogPath: string): string {
  const t = catalogPath.trim();
  const last = t.includes('/') ? (t.split('/').pop() ?? t) : t;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/**
 * Map JSON image path (any subfolder) to a bundled Vite URL when present, else a `public/` URL, else placeholder.
 */
export function resolveCatalogImageToUrl(catalogPath: string): string {
  const trimmed = catalogPath.trim();
  if (!trimmed) return normalizeLocationImageSrc(PUBLIC_IMAGE_PLACEHOLDER);

  const name = basenameFromCatalogPath(trimmed);
  const alias = FILE_ALIASES[name.toLowerCase()] ?? FILE_ALIASES[name];
  const targetName = alias ?? name;
  const originalName =
    originalByLower.get(targetName.toLowerCase()) ?? originalByStem.get(stemKey(targetName));
  if (originalName) return campusPhotoUrl(originalName);

  /** `public/images/...` files are not in the glob; serve by site path (apply basename alias when set). */
  if (trimmed.startsWith('/')) {
    const publicPath =
      alias != null && trimmed.includes('/')
        ? `${trimmed.slice(0, trimmed.lastIndexOf('/'))}/${alias}`
        : trimmed;
    return normalizeLocationImageSrc(publicPath);
  }
  return normalizeLocationImageSrc(PUBLIC_IMAGE_PLACEHOLDER);
}

export function resolveCatalogImageList(paths: string[]): string[] {
  return [...new Set(paths.map(resolveCatalogImageToUrl))];
}
