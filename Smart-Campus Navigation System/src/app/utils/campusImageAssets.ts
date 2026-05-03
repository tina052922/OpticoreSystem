import { normalizeLocationImageSrc, PUBLIC_IMAGE_PLACEHOLDER } from './publicAssetUrl';

/**
 * All campus photos live in one folder (no buildings/rooms/ subdirs).
 * Match catalog basename (e.g. from `/images/buildings/Foo.JPG`) to a file in that folder.
 */
const bundledModules = import.meta.glob('../assets/images/Images/**/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Exact / case-insensitive basename → Vite URL */
const urlByFileName = new Map<string, string>();
/** Alphanumeric-only stem (handles `Foo_Bar` vs `FooBar`, `DTLab1&2` vs `DTLab1_2`) */
const urlByStem = new Map<string, string>();
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

for (const [importPath, url] of Object.entries(bundledModules)) {
  const segment = importPath.split('/').pop() ?? '';
  if (!segment || segment.startsWith('.')) continue;
  urlByFileName.set(segment, url);
  urlByFileName.set(segment.toLowerCase(), url);
  const stem = stemKey(segment);
  if (stem && !urlByStem.has(stem)) urlByStem.set(stem, url);
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
  const hit =
    urlByFileName.get(targetName) ??
    urlByFileName.get(targetName.toLowerCase()) ??
    urlByStem.get(stemKey(targetName));
  if (hit) return hit;

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
