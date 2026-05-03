import type { LocationRecord } from '../types/locationRecord';
import { getSvgGraphicsByLayerId } from './svgIdResolver';

type Point = { x: number; y: number };

const MAX_GROUP_DEPTH = 28;

export function isPinDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.localStorage.getItem('ctu-debug-pin') === '1' ||
      new URLSearchParams(window.location.search).get('debugPin') === '1'
    );
  } catch {
    return false;
  }
}

function pointInPolygon(p: Point, poly: Point[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const inter = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

function bboxOfPoints(pts: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

/** Closed polygon centroid (shoelace); collinear → vertex mean. */
function polygonCentroid(vertices: Point[]): Point | null {
  const n = vertices.length;
  if (n === 0) return null;
  if (n < 3) {
    const sx = vertices.reduce((a, v) => a + v.x, 0) / n;
    const sy = vertices.reduce((a, v) => a + v.y, 0) / n;
    return { x: sx, y: sy };
  }
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    twiceArea += cross;
    cx += (vertices[i].x + vertices[j].x) * cross;
    cy += (vertices[i].y + vertices[j].y) * cross;
  }
  if (Math.abs(twiceArea) < 1e-8) {
    return {
      x: vertices.reduce((a, v) => a + v.x, 0) / n,
      y: vertices.reduce((a, v) => a + v.y, 0) / n,
    };
  }
  return { x: cx / (3 * twiceArea), y: cy / (3 * twiceArea) };
}

/** Interior mean on a coarse grid (concave / L-shapes where centroid falls outside). */
function polygonInteriorGridMean(vertices: Point[]): Point | null {
  const bb = bboxOfPoints(vertices);
  const w = bb.maxX - bb.minX;
  const h = bb.maxY - bb.minY;
  const step = Math.max(6, Math.min(w, h) / 10);
  const inside: Point[] = [];
  for (let x = bb.minX + step / 2; x <= bb.maxX; x += step) {
    for (let y = bb.minY + step / 2; y <= bb.maxY; y += step) {
      if (pointInPolygon({ x, y }, vertices)) inside.push({ x, y });
    }
  }
  if (inside.length === 0) return null;
  const sx = inside.reduce((a, p) => a + p.x, 0) / inside.length;
  const sy = inside.reduce((a, p) => a + p.y, 0) / inside.length;
  return { x: sx, y: sy };
}

function readPointsFromList(el: SVGPolygonElement | SVGPolylineElement): Point[] {
  const out: Point[] = [];
  const list = el.points;
  for (let i = 0; i < list.numberOfItems; i++) {
    const p = list.getItem(i);
    out.push({ x: p.x, y: p.y });
  }
  return out;
}

function isNearlyClosed(pts: Point[], eps = 2.5): boolean {
  if (pts.length < 3) return false;
  const a = pts[0];
  const b = pts[pts.length - 1];
  return Math.hypot(a.x - b.x, a.y - b.y) < eps;
}

function vertexMean(pts: Point[]): Point {
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p.x, 0) / n;
  const sy = pts.reduce((a, p) => a + p.y, 0) / n;
  return { x: sx, y: sy };
}

function closedPolylineVertices(pts: Point[]): Point[] {
  if (pts.length > 1 && isNearlyClosed(pts)) return pts.slice(0, -1);
  return [...pts];
}

function polygonOrPolylineCenter(el: SVGPolygonElement | SVGPolylineElement): Point | null {
  const pts = readPointsFromList(el);
  if (pts.length === 0) return null;

  if (el instanceof SVGPolygonElement) {
    const closed = [...pts];
    if (closed.length < 3) return vertexMean(closed);
    const c = polygonCentroid(closed);
    if (c && pointInPolygon(c, closed)) return c;
    return polygonInteriorGridMean(closed) ?? c ?? vertexMean(closed);
  }

  if (isNearlyClosed(pts)) {
    const closed = closedPolylineVertices(pts);
    if (closed.length < 3) return vertexMean(pts);
    const c = polygonCentroid(closed);
    if (c && pointInPolygon(c, closed)) return c;
    return polygonInteriorGridMean(closed) ?? c ?? vertexMean(pts);
  }

  return vertexMean(pts);
}

function pathSampleCenter(path: SVGPathElement, samples = 120): Point | null {
  try {
    const len = path.getTotalLength();
    if (!len || !isFinite(len)) return null;
    const n = Math.max(8, Math.min(samples, Math.ceil(len / 4)));
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < n; i++) {
      const pt = path.getPointAtLength((len * i) / Math.max(1, n - 1));
      sx += pt.x;
      sy += pt.y;
    }
    return { x: sx / n, y: sy / n };
  } catch {
    return null;
  }
}

function bboxCenter(gfx: SVGGraphicsElement): Point | null {
  try {
    const b = gfx.getBBox();
    if (!Number.isFinite(b.width) || !Number.isFinite(b.height)) return null;
    if (b.width <= 0 && b.height <= 0) return null;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  } catch {
    return null;
  }
}

function rectElementCenter(el: SVGRectElement): Point {
  const x = el.x.baseVal.value;
  const y = el.y.baseVal.value;
  const w = el.width.baseVal.value;
  const h = el.height.baseVal.value;
  return { x: x + w / 2, y: y + h / 2 };
}

function circleElementCenter(el: SVGCircleElement): Point {
  return { x: el.cx.baseVal.value, y: el.cy.baseVal.value };
}

function ellipseElementCenter(el: SVGEllipseElement): Point {
  return { x: el.cx.baseVal.value, y: el.cy.baseVal.value };
}

function groupWeightedVisualCenter(g: SVGGElement, depth: number): Point | null {
  if (depth > MAX_GROUP_DEPTH) return bboxCenter(g);

  let wSum = 0;
  let sx = 0;
  let sy = 0;

  for (let i = 0; i < g.children.length; i++) {
    const child = g.children[i];
    if (!(child instanceof SVGGraphicsElement)) continue;
    if (typeof child.getBBox !== 'function') continue;

    const c = computeVisualCenterForElement(child, depth + 1);
    if (!c) continue;

    let w = 1;
    try {
      const bb = child.getBBox();
      w = Math.sqrt(Math.max(bb.width * bb.height, 0.25));
    } catch {
      w = 1;
    }
    sx += c.x * w;
    sy += c.y * w;
    wSum += w;
  }

  if (wSum < 1e-6) return bboxCenter(g);
  return { x: sx / wSum, y: sy / wSum };
}

function computeVisualCenterForElement(el: Element, depth = 0): Point | null {
  if (!(el instanceof SVGGraphicsElement)) return null;

  if (el instanceof SVGGElement) {
    return groupWeightedVisualCenter(el, depth);
  }
  if (el instanceof SVGPolygonElement || el instanceof SVGPolylineElement) {
    return polygonOrPolylineCenter(el);
  }
  if (el instanceof SVGPathElement) {
    return pathSampleCenter(el) ?? bboxCenter(el);
  }
  if (el instanceof SVGRectElement) {
    return rectElementCenter(el);
  }
  if (el instanceof SVGCircleElement) {
    return circleElementCenter(el);
  }
  if (el instanceof SVGEllipseElement) {
    return ellipseElementCenter(el);
  }
  if (el instanceof SVGLineElement) {
    const x1 = el.x1.baseVal.value;
    const y1 = el.y1.baseVal.value;
    const x2 = el.x2.baseVal.value;
    const y2 = el.y2.baseVal.value;
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }
  if (el instanceof SVGUseElement) {
    return bboxCenter(el);
  }

  return bboxCenter(el);
}

function clampPointInsideInsetBBox(p: Point, bbox: DOMRect, inset: number): Point {
  const left = bbox.left + inset;
  const right = bbox.right - inset;
  const top = bbox.top + inset;
  const bottom = bbox.bottom - inset;
  if (right <= left + 0.5 || bottom <= top + 0.5) {
    return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
  }
  return {
    x: Math.min(right, Math.max(left, p.x)),
    y: Math.min(bottom, Math.max(top, p.y)),
  };
}

function insetForClamp(bbox: DOMRect): number {
  const m = Math.min(bbox.width, bbox.height);
  return Math.min(18, Math.max(2.5, m * 0.06));
}

/**
 * True visual center of a catalog location in SVG user space.
 * Uses polygon centroid / interior grid, path sampling, weighted group merge, then clamps inside element bbox.
 */
export function resolveLocationSvgCenter(svg: SVGSVGElement, loc: LocationRecord): { x: number; y: number } {
  const fallback = { x: loc.x, y: loc.y };
  if (!loc.svgId) return fallback;
  const probe = loc.svgId.trim();
  if (!probe || probe.startsWith('pattern') || probe.startsWith('image')) return fallback;

  const el = getSvgGraphicsByLayerId(svg, loc.svgId);
  if (!el) {
    if (import.meta.env.DEV) {
      console.warn('[svg-map] resolveLocationSvgCenter: no element for svgId', loc.svgId, 'loc', loc.id, loc.name);
    }
    return fallback;
  }

  const gfx = el as unknown as SVGGraphicsElement;
  if (typeof gfx.getBBox !== 'function') return fallback;

  let bbox: DOMRect;
  try {
    bbox = gfx.getBBox();
    if (!Number.isFinite(bbox.x) || !Number.isFinite(bbox.y)) return fallback;
    if (!Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) return fallback;
    if (bbox.width <= 0 && bbox.height <= 0) return fallback;
  } catch {
    return fallback;
  }

  const raw = computeVisualCenterForElement(el, 0);
  const candidate = raw ?? { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
  const inset = insetForClamp(bbox);
  return clampPointInsideInsetBBox(candidate, bbox, inset);
}
