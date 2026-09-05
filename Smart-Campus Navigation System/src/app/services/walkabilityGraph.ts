import type { PathNode } from '../types/campus';

type Point = { x: number; y: number };

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nodeId(x: number, y: number) {
  return `n-${Math.round(x)}-${Math.round(y)}`;
}

/** Sample an SVG path element at fixed arc length (handles curves, subpaths). */
function samplePathElement(pathEl: SVGPathElement, step: number): Point[] {
  const pts: Point[] = [];
  try {
    const total = pathEl.getTotalLength();
    if (!total || !isFinite(total)) return pts;
    for (let s = 0; s < total; s += step) {
      const p = pathEl.getPointAtLength(s);
      pts.push({ x: p.x, y: p.y });
    }
    const end = pathEl.getPointAtLength(total);
    if (pts.length === 0 || dist(pts[pts.length - 1], end) > 0.5) pts.push({ x: end.x, y: end.y });
  } catch {
    return [];
  }
  return pts;
}

/** True if p lies in the interior of an axis-aligned rect shrunk by `inset` (reduces false positives from rotated-building AABBs). */
function pointInShrunkRect(p: Point, r: DOMRect, inset: number): boolean {
  const left = r.left + inset;
  const right = r.right - inset;
  const top = r.top + inset;
  const bottom = r.bottom - inset;
  if (right <= left + 2 || bottom <= top + 2) return false;
  return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
}

function pointInExpandedRect(p: Point, r: DOMRect, pad: number): boolean {
  return p.x >= r.left - pad && p.x <= r.right + pad && p.y >= r.top - pad && p.y <= r.bottom + pad;
}

function segmentIntersectsRect(a: Point, b: Point, r: DOMRect): boolean {
  const xmin = r.left;
  const xmax = r.right;
  const ymin = r.top;
  const ymax = r.bottom;

  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else if (p > 0) {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };

  if (!clip(-dx, a.x - xmin)) return false;
  if (!clip(dx, xmax - a.x)) return false;
  if (!clip(-dy, a.y - ymin)) return false;
  if (!clip(dy, ymax - a.y)) return false;

  return t1 >= t0;
}

function simplifyPath(points: PathNode[], minAngleDeg = 10): PathNode[] {
  if (points.length <= 2) return points;
  const out: PathNode[] = [points[0]];

  const angleBetween = (a: Point, b: Point, c: Point) => {
    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const m1 = Math.hypot(v1.x, v1.y);
    const m2 = Math.hypot(v2.x, v2.y);
    if (m1 < 1e-6 || m2 < 1e-6) return 180;
    const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
    return (Math.acos(cos) * 180) / Math.PI;
  };

  for (let i = 1; i < points.length - 1; i++) {
    const prev = out[out.length - 1];
    const cur = points[i];
    const next = points[i + 1];
    const ang = angleBetween(prev, cur, next);
    if (180 - ang > minAngleDeg) out.push(cur);
  }
  out.push(points[points.length - 1]);
  return out;
}

type CellKey = string;

function cellKey(ix: number, iy: number): CellKey {
  return `${ix},${iy}`;
}

function addToSpatialMap(map: Map<CellKey, PathNode[]>, cellSize: number, node: PathNode) {
  const ix = Math.floor(node.x / cellSize);
  const iy = Math.floor(node.y / cellSize);
  const k = cellKey(ix, iy);
  if (!map.has(k)) map.set(k, []);
  map.get(k)!.push(node);
}

function neighborsInCells(
  map: Map<CellKey, PathNode[]>,
  cellSize: number,
  node: PathNode,
  radiusCells: number
): PathNode[] {
  const ix = Math.floor(node.x / cellSize);
  const iy = Math.floor(node.y / cellSize);
  const out: PathNode[] = [];
  for (let dx = -radiusCells; dx <= radiusCells; dx++) {
    for (let dy = -radiusCells; dy <= radiusCells; dy++) {
      const bucket = map.get(cellKey(ix + dx, iy + dy));
      if (bucket) out.push(...bucket);
    }
  }
  return out;
}

function countEdges(nodes: PathNode[]): number {
  let e = 0;
  for (const n of nodes) e += n.connections.length;
  return e / 2;
}

function countIsolated(nodes: PathNode[]): number {
  return nodes.filter((n) => n.connections.length === 0).length;
}

export function logNavigationGraphStats(label: string, nodes: PathNode[]) {
  const edges = countEdges(nodes);
  const isolated = countIsolated(nodes);
  // eslint-disable-next-line no-console
  console.log(`[nav-graph] ${label}: nodes=${nodes.length} edges≈${Math.round(edges)} isolated=${isolated}`);
}

/** Connect nodes with no edges to the nearest node (prefer obstacle-free segment). */
function attachIsolatedNodes(
  nodes: Map<string, PathNode>,
  segmentBlocked: (a: Point, b: Point) => boolean,
  addEdge: (a: Point, b: Point) => void
) {
  const arr = Array.from(nodes.values());
  for (const n of arr) {
    if (n.connections.length > 0) continue;
    let best: PathNode | null = null;
    let bestD = Infinity;
    let bestBlocked: PathNode | null = null;
    let bestDBlocked = Infinity;
    for (const o of arr) {
      if (o.id === n.id) continue;
      const d = dist(n, o);
      if (d > 520) continue;
      if (d < bestDBlocked) {
        bestDBlocked = d;
        bestBlocked = o;
      }
      if (d < 420 && !segmentBlocked(n, o) && d < bestD) {
        bestD = d;
        best = o;
      }
    }
    const pick = best ?? bestBlocked;
    if (pick) addEdge(n, pick);
  }
}

function computeComponents(byId: Map<string, PathNode>): Set<string>[] {
  const seen = new Set<string>();
  const comps: Set<string>[] = [];
  for (const id of byId.keys()) {
    if (seen.has(id)) continue;
    const comp = new Set<string>();
    const q = [id];
    seen.add(id);
    comp.add(id);
    while (q.length) {
      const cur = q.pop()!;
      const node = byId.get(cur);
      if (!node) continue;
      for (const nb of node.connections) {
        if (seen.has(nb)) continue;
        seen.add(nb);
        comp.add(nb);
        q.push(nb);
      }
    }
    comps.push(comp);
  }
  return comps;
}

/** Merge disconnected components with short bridges (prefer unobstructed segments). */
function mergeComponentsBridges(
  byId: Map<string, PathNode>,
  segmentBlocked: (a: Point, b: Point) => boolean,
  addEdge: (a: Point, b: Point) => void,
  maxBridges: number
) {
  let bridges = 0;
  while (bridges < maxBridges) {
    const comps = computeComponents(byId);
    if (comps.length <= 1) return;

    let bestA: PathNode | null = null;
    let bestB: PathNode | null = null;
    let bestD = Infinity;
    let bestForced: { a: PathNode; b: PathNode; d: number } | null = null;

    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const sampleA = [...comps[i]].slice(0, 100);
        const sampleB = [...comps[j]].slice(0, 100);
        for (const ida of sampleA) {
          const na = byId.get(ida)!;
          for (const idb of sampleB) {
            const nb = byId.get(idb)!;
            const d = dist(na, nb);
            if (d < bestD && d <= 780 && !segmentBlocked(na, nb)) {
              bestD = d;
              bestA = na;
              bestB = nb;
            }
            if (!bestForced || d < bestForced.d) bestForced = { a: na, b: nb, d };
          }
        }
      }
    }

    const pair = bestA && bestB ? { a: bestA, b: bestB } : bestForced;
    if (!pair) break;
    addEdge(pair.a, pair.b);
    bridges++;
  }
}

/**
 * Build a walkability graph from the live SVG DOM (no geometry edits).
 * Gates (#6E6D6D): never nodes; bbox blocks shortcuts.
 */
export function buildWalkabilityGraphFromSvg(svg: SVGSVGElement): PathNode[] {
  const nodes = new Map<string, PathNode>();

  const addEdge = (a: Point, b: Point) => {
    const idA = nodeId(a.x, a.y);
    const idB = nodeId(b.x, b.y);
    if (idA === idB) return;

    if (!nodes.has(idA)) nodes.set(idA, { id: idA, x: a.x, y: a.y, connections: [] });
    if (!nodes.has(idB)) nodes.set(idB, { id: idB, x: b.x, y: b.y, connections: [] });

    const na = nodes.get(idA)!;
    const nb = nodes.get(idB)!;
    if (!na.connections.includes(idB)) na.connections.push(idB);
    if (!nb.connections.includes(idA)) nb.connections.push(idA);
  };

  const buildingFills = new Set(['#C5C3C3', '#D9D9D9', '#A1A1A1']);
  const buildingRects: DOMRect[] = [];
  const gateRects: DOMRect[] = [];

  for (const el of Array.from(svg.querySelectorAll('rect'))) {
    const r = el as SVGRectElement;
    const fill = (r.getAttribute('fill') || '').trim();
    try {
      const box = r.getBBox();
      if (fill === '#6E6D6D') {
        gateRects.push(box);
        continue;
      }
      if (buildingFills.has(fill)) buildingRects.push(box);
    } catch {
      // ignore
    }
  }

  const padGate = 3;
  const segmentBlocked = (a: Point, b: Point) => {
    for (const g of gateRects) {
      const gr = new DOMRect(g.x - padGate, g.y - padGate, g.width + padGate * 2, g.height + padGate * 2);
      if (segmentIntersectsRect(a, b, gr)) return true;
    }
    for (const br of buildingRects) {
      if (segmentIntersectsRect(a, b, br)) return true;
    }
    return false;
  };

  /** For placing open-grid / lawn samples: shrunk building interior + gate buffer (not full AABB). */
  const isBadPlacementPoint = (p: Point) => {
    for (const br of buildingRects) {
      const inset = Math.min(22, 0.14 * Math.min(Math.max(br.width, 1), Math.max(br.height, 1)));
      if (pointInShrunkRect(p, br, inset)) return true;
    }
    for (const g of gateRects) {
      if (pointInExpandedRect(p, g, padGate + 2)) return true;
    }
    return false;
  };

  const openGridStep = 95;

  // 1) Stroke-aligned walk network
  const roadPaths = svg.querySelectorAll<SVGPathElement>('path[stroke="#B4BEC7"]');
  const walkPaths = svg.querySelectorAll<SVGPathElement>('path[stroke="#3BB4FF"]');
  for (const pathEl of Array.from(roadPaths)) {
    const pts = samplePathElement(pathEl, 48);
    for (let i = 0; i < pts.length - 1; i++) {
      if (!segmentBlocked(pts[i], pts[i + 1])) addEdge(pts[i], pts[i + 1]);
    }
  }
  for (const pathEl of Array.from(walkPaths)) {
    const pts = samplePathElement(pathEl, 34);
    for (let i = 0; i < pts.length - 1; i++) {
      if (!segmentBlocked(pts[i], pts[i + 1])) addEdge(pts[i], pts[i + 1]);
    }
  }

  // 2) Open-campus grid
  const vb = svg.viewBox.baseVal;
  const w = vb.width || 1728;
  const h = vb.height || 1117;
  const margin = openGridStep * 0.4;
  for (let x = margin; x < w - margin; x += openGridStep) {
    for (let y = margin; y < h - margin; y += openGridStep) {
      const p = { x, y };
      if (isBadPlacementPoint(p)) continue;
      const id = nodeId(p.x, p.y);
      if (!nodes.has(id)) nodes.set(id, { id, x: p.x, y: p.y, connections: [] });
    }
  }

  const cardinals: Point[] = [
    { x: openGridStep, y: 0 },
    { x: -openGridStep, y: 0 },
    { x: 0, y: openGridStep },
    { x: 0, y: -openGridStep },
    { x: openGridStep, y: openGridStep },
    { x: openGridStep, y: -openGridStep },
    { x: -openGridStep, y: openGridStep },
    { x: -openGridStep, y: -openGridStep },
  ];

  for (const n of nodes.values()) {
    for (const d of cardinals) {
      const q = { x: n.x + d.x, y: n.y + d.y };
      const idQ = nodeId(q.x, q.y);
      if (!nodes.has(idQ)) continue;
      if (!segmentBlocked(n, q)) addEdge(n, q);
    }
  }

  // 3) Lawn interiors
  for (const el of Array.from(svg.querySelectorAll('rect[fill="#A9E9C1"]'))) {
    const r = el as SVGRectElement;
    let box: DOMRect;
    try {
      box = r.getBBox();
    } catch {
      continue;
    }
    if (box.width < 100 || box.height < 100) continue;
    const step = 72;
    for (let x = box.left + step * 0.5; x <= box.right - step * 0.5; x += step) {
      for (let y = box.top + step * 0.5; y <= box.bottom - step * 0.5; y += step) {
        const p = { x, y };
        if (isBadPlacementPoint(p)) continue;
        const id = nodeId(p.x, p.y);
        if (!nodes.has(id)) nodes.set(id, { id, x: p.x, y: p.y, connections: [] });
      }
    }
  }

  const lawnLink = 82;
  const lawnDiag = [
    { x: lawnLink, y: 0 },
    { x: -lawnLink, y: 0 },
    { x: 0, y: lawnLink },
    { x: 0, y: -lawnLink },
    { x: lawnLink, y: lawnLink },
    { x: lawnLink, y: -lawnLink },
    { x: -lawnLink, y: lawnLink },
    { x: -lawnLink, y: -lawnLink },
  ];
  for (const n of nodes.values()) {
    for (const d of lawnDiag) {
      const q = { x: n.x + d.x, y: n.y + d.y };
      const idQ = nodeId(q.x, q.y);
      if (!nodes.has(idQ)) continue;
      if (!segmentBlocked(n, q)) addEdge(n, q);
    }
  }

  // 4) Spatial proximity (stronger cross-linking)
  const cellSize = 95;
  const spatial = new Map<CellKey, PathNode[]>();
  const all = Array.from(nodes.values());
  for (const n of all) addToSpatialMap(spatial, cellSize, n);

  const maxExtra = 16;
  const linkDist = 175;
  for (const n of all) {
    const candidates = neighborsInCells(spatial, cellSize, n, 2);
    const scored: { node: PathNode; d: number }[] = [];
    for (const o of candidates) {
      if (o.id === n.id) continue;
      const d = dist(n, o);
      if (d > linkDist) continue;
      scored.push({ node: o, d });
    }
    scored.sort((a, b) => a.d - b.d);
    let added = 0;
    for (const { node: o } of scored) {
      if (added >= maxExtra) break;
      if (n.connections.includes(o.id)) continue;
      if (segmentBlocked(n, o)) continue;
      addEdge(n, o);
      added++;
    }
  }

  attachIsolatedNodes(nodes, segmentBlocked, addEdge);
  mergeComponentsBridges(nodes, segmentBlocked, addEdge, 48);

  const out = Array.from(nodes.values());
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    logNavigationGraphStats('svg-walk', out);
  }
  return out;
}

export function smoothRoutePath(path: PathNode[]): PathNode[] {
  if (path.length <= 2) return path.map((p) => ({ ...p, connections: [] }));
  const simplified = simplifyPath(path, 10);
  if (simplified.length <= 2) return simplified.map((p) => ({ ...p, connections: [] }));

  const chaikin = (pts: Point[], iters: number) => {
    let cur = pts.slice();
    for (let it = 0; it < iters; it++) {
      const next: Point[] = [];
      for (let i = 0; i < cur.length - 1; i++) {
        const p = cur[i];
        const q = cur[i + 1];
        next.push({ x: p.x * 0.75 + q.x * 0.25, y: p.y * 0.75 + q.y * 0.25 });
        next.push({ x: p.x * 0.25 + q.x * 0.75, y: p.y * 0.25 + q.y * 0.75 });
      }
      cur = next;
    }
    return cur;
  };

  const pts = simplified.map((p) => ({ x: p.x, y: p.y }));
  const sm = chaikin(pts, 2);
  const out: PathNode[] = [];
  const step = Math.max(1, Math.floor(sm.length / Math.min(56, simplified.length)));
  for (let i = 0; i < sm.length; i += step) {
    const p = sm[i];
    out.push({ id: nodeId(p.x, p.y), x: p.x, y: p.y, connections: [] });
  }
  const last = simplified[simplified.length - 1];
  if (out.length === 0 || dist(out[out.length - 1], last) > 0.5) {
    out.push({ id: last.id, x: last.x, y: last.y, connections: [] });
  }
  return out.length >= 2 ? out : simplified.map((p) => ({ ...p, connections: [] }));
}

/** Build a smooth SVG path d string (quadratic beziers through corners). */
export function routeToSmoothSvgPath(points: PathNode[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  const p = points;
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const m01 = mid(p[0], p[1]);
  let d = `M ${p[0].x} ${p[0].y} L ${m01.x} ${m01.y}`;
  for (let i = 1; i < p.length - 1; i++) {
    const m = mid(p[i], p[i + 1]);
    d += ` Q ${p[i].x} ${p[i].y} ${m.x} ${m.y}`;
  }
  d += ` L ${p[p.length - 1].x} ${p[p.length - 1].y}`;
  return d;
}
