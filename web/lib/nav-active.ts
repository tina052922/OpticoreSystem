/** True if this nav href is the most specific match for pathname (avoids /admin/college highlighting every child route). */
export function isNavItemActive(pathname: string, href: string, allHrefs: string[]): boolean {
  const exactOrChild = pathname === href || pathname.startsWith(`${href}/`);
  if (!exactOrChild) return false;
  const moreSpecific = allHrefs.some(
    (h) => h !== href && h.length > href.length && (pathname === h || pathname.startsWith(`${h}/`)),
  );
  return !moreSpecific;
}
