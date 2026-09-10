/** Served from `public/images/...` at dev and build time. */
export const PUBLIC_IMAGE_PLACEHOLDER = '/images/placeholders/default.svg';

/**
 * Prefix with Vite `base` when the app is not hosted at domain root (e.g. GitHub Pages).
 * Absolute paths from the catalog (`/images/...`) become `/base/images/...` when needed.
 */
export function withBasePath(pathFromSiteRoot: string): string {
  const path = pathFromSiteRoot.startsWith('/') ? pathFromSiteRoot : `/${pathFromSiteRoot}`;
  const base = import.meta.env.BASE_URL ?? '/';
  if (!base || base === '/') return path;
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}${path}`;
}

/** Encode each path segment so `&`, `#`, spaces in filenames still request the right file. */
function encodeSiteRootPath(absFromRoot: string): string {
  const parts = absFromRoot.split('/').filter(Boolean);
  return '/' + parts.map((p) => encodeURIComponent(p)).join('/');
}

/** True when `src` is already a usable URL (hashed Vite asset, data URI, or encoded site path). */
function isFinalAssetUrl(src: string): boolean {
  if (src.startsWith('data:') || src.startsWith('blob:')) return true;
  if (src.startsWith('http://') || src.startsWith('https://')) return true;
  /** Hashed build output, e.g. `/assets/COTEBuilding1-Ab12.jpg` */
  if (/^\/assets\/[^/]+$/.test(src.split('?')[0] ?? '')) return true;
  return false;
}

/** Normalize catalog image paths for `<img src>` (public folder, optional subpath-only). */
export function normalizeLocationImageSrc(src: string): string {
  const t = String(src).trim();
  if (!t || t === '-') return withBasePath(encodeSiteRootPath(PUBLIC_IMAGE_PLACEHOLDER));
  if (isFinalAssetUrl(t)) return t;
  const pathOnly = t.split('?')[0] ?? t;
  /** Dev glob sometimes emits `/src/.../file.jpg?url` — never use that as <img src>. */
  if (pathOnly.startsWith('/src/')) {
    const file = pathOnly.split('/').pop() ?? '';
    return withBasePath(encodeSiteRootPath(`/campus-photos/${file}`));
  }
  if (t.startsWith('/')) return withBasePath(encodeSiteRootPath(pathOnly));
  return withBasePath(encodeSiteRootPath(`/${pathOnly}`));
}
