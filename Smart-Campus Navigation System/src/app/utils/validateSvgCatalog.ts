import type { LocationRecord } from '../types/locationRecord';
import { getSvgElementByLayerId } from './svgIdResolver';

/** Dev-only: duplicate `svgId`, per-row DOM binding, missing elements. */
export function warnSvgCatalogAgainstDom(svg: SVGSVGElement, records: LocationRecord[]): void {
  if (!import.meta.env.DEV) return;

  const bySvg = new Map<string, string[]>();
  for (const r of records) {
    const sid = r.svgId?.trim();
    if (!sid) continue;
    const list = bySvg.get(sid) ?? [];
    list.push(r.id);
    bySvg.set(sid, list);
  }

  for (const [sid, ids] of bySvg) {
    if (ids.length > 1) {
      console.warn('[svg-map] duplicate svgId:', sid, '→', ids.join(', '));
    }
  }

  for (const loc of records) {
    const sid = loc.svgId?.trim();
    if (!sid) continue;
    if (sid.startsWith('pattern') || sid.startsWith('image')) continue;

    const byId = (loc.svgId && svg.getElementById(loc.svgId)) ?? svg.getElementById(sid);
    const el = getSvgElementByLayerId(svg, loc.svgId);
    if (!el) {
      console.warn(
        '[svg-map] MISSING SVG element for catalog row',
        loc.id,
        loc.name,
        'svgId=',
        loc.svgId,
        '(export map layers as matching id= attributes)'
      );
    }
    if (el && byId && el !== byId) {
      console.warn('[svg-map] CSS layer / id mismatch: getElementById vs resolver for', loc.id, loc.svgId);
    }
  }
}
