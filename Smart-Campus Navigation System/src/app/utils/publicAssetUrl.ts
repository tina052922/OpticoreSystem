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

/** Normalize catalog image paths for `<img src>` (public folder, optional subpath-only). */
export function normalizeLocationImageSrc(src: string): string {
  const t = String(src).trim();
  if (!t || t === '-') return withBasePath(encodeSiteRootPath(PUBLIC_IMAGE_PLACEHOLDER));
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  /** Vite-emitted hashed assets from `import.meta.glob(..., { as: 'url' })` — do not re-encode. */
  if (t.startsWith('/assets/') || t.startsWith('/src/') || t.startsWith('data:')) return t;
  if (t.startsWith('/')) return withBasePath(encodeSiteRootPath(t));
  return withBasePath(encodeSiteRootPath(`/${t}`));
}
