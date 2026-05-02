/**
 * Path portion of a sidebar href (drops `?tab=` etc.) so `/faculty/ins?tab=faculty` matches pathname `/faculty/ins`.
 */
export function navHrefPathname(href: string): string {
  const q = href.indexOf("?");
  const base = q >= 0 ? href.slice(0, q) : href;
  const h = base.indexOf("#");
  return h >= 0 ? base.slice(0, h) : base;
}

/**
 * Instructor home is `/faculty` while other shell pages live under `/faculty/ins`, `/faculty/schedule`, …
 * Without an exact-only rule, `/faculty` would stay highlighted on every child route (pathname still starts with `/faculty/`).
 */
const NAV_PATHNAME_EXACT_ONLY = new Set<string>(["/faculty"]);

/**
 * True if this nav href is the best match for `pathname`: longest matching base path wins; query strings on `href` ignored.
 */
export function isNavItemActive(pathname: string, href: string, allHrefs: string[]): boolean {
  const path = navHrefPathname(href);
  const bases = allHrefs.map(navHrefPathname);

  if (NAV_PATHNAME_EXACT_ONLY.has(path)) {
    return pathname === path || pathname === `${path}/`;
  }

  const candidates = bases.filter((h) => pathname === h || pathname.startsWith(`${h}/`));
  if (candidates.length === 0) return false;
  const best = candidates.reduce((a, b) => (a.length >= b.length ? a : b));
  return path === best;
}
