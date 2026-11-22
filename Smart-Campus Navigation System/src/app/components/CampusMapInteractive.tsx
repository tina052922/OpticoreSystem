import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Minus, Plus, RefreshCcw } from 'lucide-react';
import type { PathNode } from '../types/campus';
import type { LocationRecord } from '../types/locationRecord';
import { buildWalkabilityGraphFromSvg, routeToSmoothSvgPath } from '../services/walkabilityGraph';
import { isPinDebugEnabled, resolveLocationSvgCenter } from '../utils/svgLocationCenter';
import { getSvgElementByLayerId, getSvgGraphicsByLayerId } from '../utils/svgIdResolver';
import { warnSvgCatalogAgainstDom } from '../utils/validateSvgCatalog';
import { MapSVGLoader } from './MapSVGLoader';
import { EXTRA_MAP_LABELS } from '../data/extraMapLabels';

interface CampusMapInteractiveProps {
  selectedLocation: LocationRecord | null;
  routePath: PathNode[];
  /** All catalog points for map tap-to-select (nearest within threshold). */
  locationRecords: LocationRecord[];
  /** Fired once per SVG load with nodes derived from map geometry (roads, open areas; gates excluded). */
  onWalkGraphReady?: (nodes: PathNode[]) => void;
  /** Bbox center of the selected `svgId` element in SVG user space (for pin + routing). */
  onDestinationCenterResolved?: (locationId: string, x: number, y: number) => void;
  onLocationClick: (location: LocationRecord) => void;
  /** Places of the chosen category chip, marked with dots (empty for All). */
  categoryRecords?: LocationRecord[];
}

const MAP_W = 1728;
const MAP_H = 1117;
const TAP_RADIUS = 56;
/** Zoom range 50%–200%. The map opens at the minimum, and Reset returns to it. */
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const DEFAULT_SCALE = MIN_SCALE;

export function CampusMapInteractive({
  selectedLocation,
  routePath,
  locationRecords,
  onWalkGraphReady,
  onDestinationCenterResolved,
  onLocationClick,
  categoryRecords = [],
}: CampusMapInteractiveProps) {
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  /** Resolved visual center of `selectedLocation.svgId` in SVG user space; falls back to catalog x/y. */
  const [destinationPinCenter, setDestinationPinCenter] = useState<{ x: number; y: number } | null>(null);
  const stylingAppliedRef = useRef(false);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  /** The box sized to the scaled map; used to keep the point under the fingers still while zooming. */
  const sizedBoxRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  /** Screen point + fraction of the map under it, applied after the next scale change. */
  const zoomAnchorRef = useRef<{ clientX: number; clientY: number; fx: number; fy: number } | null>(null);
  /** A pinch just ended: ignore the click it produces so it does not select a place. */
  const suppressClickUntilRef = useRef(0);
  const handleSVGLoad = useCallback((svg: SVGSVGElement) => {
    setSvgElement(svg);
  }, []);

  useEffect(() => {
    if (!svgElement || !onWalkGraphReady) return;
    try {
      const nodes = buildWalkabilityGraphFromSvg(svgElement);
      onWalkGraphReady(nodes);
    } catch {
      // keep fallback graph from App if extraction fails
    }
  }, [svgElement, onWalkGraphReady]);

  useEffect(() => {
    if (!svgElement) return;
    warnSvgCatalogAgainstDom(svgElement, locationRecords);
  }, [svgElement, locationRecords]);

  useLayoutEffect(() => {
    if (!svgElement || !selectedLocation) {
      setDestinationPinCenter(null);
      return;
    }
    const c = resolveLocationSvgCenter(svgElement, selectedLocation);
    setDestinationPinCenter(c);
    onDestinationCenterResolved?.(selectedLocation.id, c.x, c.y);
  }, [svgElement, selectedLocation, onDestinationCenterResolved]);


  const clampScale = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(v * 100) / 100));

  /** Zoom to `next`, keeping the map point under (clientX, clientY) where it is on screen. */
  const zoomAt = useCallback((next: number, clientX: number, clientY: number) => {
    const box = sizedBoxRef.current;
    const target = clampScale(next);
    if (box && target !== scaleRef.current) {
      const rect = box.getBoundingClientRect();
      zoomAnchorRef.current = {
        clientX,
        clientY,
        fx: rect.width ? (clientX - rect.left) / rect.width : 0.5,
        fy: rect.height ? (clientY - rect.top) / rect.height : 0.5,
      };
    }
    setScale(target);
  }, []);

  const zoomAtCenter = (next: number) => {
    const host = mapScrollRef.current;
    if (!host) return setScale(clampScale(next));
    const r = host.getBoundingClientRect();
    zoomAt(next, r.left + r.width / 2, r.top + r.height / 2);
  };
  const zoomIn = () => zoomAtCenter(scaleRef.current + 0.15);
  const zoomOut = () => zoomAtCenter(scaleRef.current - 0.15);
  /** Back to 50%, centered on campus. */
  const zoomReset = () => {
    const host = mapScrollRef.current;
    setScale(DEFAULT_SCALE);
    requestAnimationFrame(() => {
      if (!host) return;
      host.scrollLeft = Math.max(0, (host.scrollWidth - host.clientWidth) / 2);
      host.scrollTop = Math.max(0, (host.scrollHeight - host.clientHeight) / 2);
    });
  };

  // Open on the middle of campus (when 50% is larger than the screen, it would start at the top-left).
  const centeredOnceRef = useRef(false);
  useLayoutEffect(() => {
    const host = mapScrollRef.current;
    if (!svgElement || !host || centeredOnceRef.current) return;
    centeredOnceRef.current = true;
    host.scrollLeft = Math.max(0, (host.scrollWidth - host.clientWidth) / 2);
    host.scrollTop = Math.max(0, (host.scrollHeight - host.clientHeight) / 2);
  }, [svgElement]);

  // After a scale change, scroll so the anchored point stays under the fingers / cursor.
  useLayoutEffect(() => {
    const a = zoomAnchorRef.current;
    const host = mapScrollRef.current;
    const box = sizedBoxRef.current;
    zoomAnchorRef.current = null;
    if (!a || !host || !box) return;
    const rect = box.getBoundingClientRect();
    host.scrollLeft += rect.left + a.fx * rect.width - a.clientX;
    host.scrollTop += rect.top + a.fy * rect.height - a.clientY;
  }, [scale]);

  // Gestures: two-finger pinch (phones), ctrl/⌘ + wheel or trackpad pinch (desktop), double-tap.
  useEffect(() => {
    const host = mapScrollRef.current;
    if (!host) return;
    let pinch: { dist: number; scale: number } | null = null;
    let frame = 0;
    let pending: { scale: number; x: number; y: number } | null = null;
    const flush = () => {
      frame = 0;
      if (pending) zoomAt(pending.scale, pending.x, pending.y);
      pending = null;
    };
    const queue = (scale: number, x: number, y: number) => {
      pending = { scale, x, y };
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch = { dist: dist(e.touches), scale: scaleRef.current };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault(); // keep the page itself from zooming
      const m = mid(e.touches);
      queue(pinch.scale * (dist(e.touches) / pinch.dist), m.x, m.y);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (pinch && e.touches.length < 2) {
        pinch = null;
        suppressClickUntilRef.current = Date.now() + 350;
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // plain wheel keeps scrolling the map
      e.preventDefault();
      queue(scaleRef.current * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    };
    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
      zoomAt(scaleRef.current * 1.6, e.clientX, e.clientY);
    };

    // Mouse: press and drag the map to pan; a drag never selects a place.
    let drag: { x: number; y: number; left: number; top: number; moved: boolean; id: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, left: host.scrollLeft, top: host.scrollTop, moved: false, id: e.pointerId };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      if (!drag.moved) {
        drag.moved = true;
        host.setPointerCapture(e.pointerId);
        host.classList.add('map-dragging');
      }
      host.scrollLeft = drag.left - dx;
      host.scrollTop = drag.top - dy;
    };
    const endDrag = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) suppressClickUntilRef.current = Date.now() + 120;
      if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
      host.classList.remove('map-dragging');
      drag = null;
    };
    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', endDrag);
    host.addEventListener('pointercancel', endDrag);

    host.addEventListener('touchstart', onTouchStart, { passive: true });
    host.addEventListener('touchmove', onTouchMove, { passive: false });
    host.addEventListener('touchend', onTouchEnd, { passive: true });
    host.addEventListener('touchcancel', onTouchEnd, { passive: true });
    host.addEventListener('wheel', onWheel, { passive: false });
    host.addEventListener('dblclick', onDblClick);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      host.removeEventListener('touchstart', onTouchStart);
      host.removeEventListener('touchmove', onTouchMove);
      host.removeEventListener('touchend', onTouchEnd);
      host.removeEventListener('touchcancel', onTouchEnd);
      host.removeEventListener('wheel', onWheel);
      host.removeEventListener('dblclick', onDblClick);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', endDrag);
      host.removeEventListener('pointercancel', endDrag);
    };
  }, [zoomAt]);

  // Theme + interactive base styles (does not change SVG geometry).
  useEffect(() => {
    if (!svgElement || stylingAppliedRef.current) return;

    const existingStyle = svgElement.querySelector('#campus-map-interactive-styles');
    if (!existingStyle) {
      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.setAttribute('id', 'campus-map-interactive-styles');
      styleEl.textContent = `
        :root {
          --land-soft: #d9f0d3;
          --lawn: #7fcf88;
          --road: #bfc1c4;
          --road-edge: #f7f7f7;
          --path: #d8dadf;
          --building: #d6d7da;
          --building-alt: #c7c9cd;
          --building-stroke: #7f8a93;
          --roof: #a6a9ad;
        }
        rect[fill="#E3FFEE"] { fill: var(--land-soft) !important; }
        [fill="#A9E9C1"] { fill: var(--lawn) !important; }
        rect[fill="#C5C3C3"] {
          fill: var(--building) !important;
          stroke: var(--building-stroke) !important;
          stroke-width: 0.65 !important;
        }
        rect[fill="#D9D9D9"] {
          fill: var(--building-alt) !important;
          stroke: var(--building-stroke) !important;
          stroke-width: 0.65 !important;
        }
        rect[fill="#A1A1A1"] {
          fill: var(--roof) !important;
          stroke: var(--building-stroke) !important;
          stroke-width: 0.65 !important;
        }
        [fill="#6E6D6D"] {
          fill: var(--road) !important;
          opacity: 0.92 !important;
          stroke: var(--road-edge) !important;
          stroke-width: 2.25 !important;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        [stroke="#B4BEC7"] {
          stroke: var(--road) !important;
          stroke-width: 12 !important;
          opacity: 0.92 !important;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        [stroke="#3BB4FF"] {
          stroke: var(--path) !important;
          stroke-width: 8 !important;
          opacity: 0.95 !important;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        [fill="#B2B1B1"] { fill: rgba(120, 130, 140, 0.85) !important; }
        line[stroke="black"] { stroke: rgba(90, 100, 110, 0.55) !important; }
        rect[fill="#C5C3C3"],
        rect[fill="#D9D9D9"],
        rect[fill="#A1A1A1"] {
          cursor: pointer;
          transition: fill 140ms ease;
        }
        rect[fill="#C5C3C3"]:hover,
        rect[fill="#D9D9D9"]:hover,
        rect[fill="#A1A1A1"]:hover {
          fill: #ff990a !important;
          opacity: 0.96 !important;
        }
        .ctu-svg-hit {
          stroke: #780301 !important;
          stroke-width: 2.5px !important;
        }
        .destination-pin {
          pointer-events: none;
        }
        .ctu-category-dot { cursor: pointer; }
        rect[fill="#A9E9C1"] { cursor: pointer; }
      `.trim();

      svgElement.insertBefore(styleEl, svgElement.firstChild);
    }

    stylingAppliedRef.current = true;
  }, [svgElement]);

  // Make SVG responsive inside its container
  useEffect(() => {
    if (!svgElement) return;
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    // Ensure it fills the container without extra whitespace.
    svgElement.style.display = 'block';
  }, [svgElement]);

  // Tap map → nearest location.
  useEffect(() => {
    if (!svgElement) return;

    /** The building / room shapes of the map (the grey boxes). */
    const BOX_SELECTOR = 'rect[fill="#C5C3C3"], rect[fill="#D9D9D9"], rect[fill="#A1A1A1"]';
    const bySvgId = new Map<string, LocationRecord>();
    const byId = new Map<string, LocationRecord>();
    for (const loc of locationRecords) {
      byId.set(loc.id, loc);
      const sid = loc.svgId?.trim().toLowerCase();
      if (sid && !bySvgId.has(sid)) bySvgId.set(sid, loc);
    }

    const toSvg = (x: number, y: number, ctm: DOMMatrix) => {
      const pt = svgElement.createSVGPoint();
      pt.x = x;
      pt.y = y;
      return pt.matrixTransform(ctm.inverse());
    };

    /** Map shapes that can stand for a place (fields, courts, plots — not text, pins or the route). */
    const SHAPE_SELECTOR = 'rect, path, ellipse, circle, polygon';

    /**
     * What is under the pointer, top to bottom: a category dot or a shape with a catalog id (a
     * place straight away), otherwise the shapes there — grey building / room boxes first.
     */
    const hitAt = (x: number, y: number): { loc?: LocationRecord; shapes: { el: Element; building: boolean }[] } => {
      const shapes: { el: Element; building: boolean }[] = [];
      const mapRect = svgElement.getBoundingClientRect();
      const mapArea = mapRect.width * mapRect.height || 1;
      for (const el of document.elementsFromPoint(x, y)) {
        if (!svgElement.contains(el)) continue;
        const dot = (el as SVGElement).dataset?.locId;
        if (dot && byId.has(dot)) return { loc: byId.get(dot), shapes };
        for (let n: Element | null = el; n && n !== svgElement; n = n.parentElement) {
          const hit = n.id ? bySvgId.get(n.id.trim().toLowerCase()) : undefined;
          if (hit) return { loc: hit, shapes };
        }
        if (el.closest('#route-overlay, #selection-marker, #ctu-destination-glow, #category-markers')) continue;
        if (!el.matches(SHAPE_SELECTOR)) continue;
        const br = el.getBoundingClientRect();
        // Skip the campus ground, lawns around everything, and long roads.
        if ((br.width * br.height) / mapArea > 0.06) continue;
        shapes.push({ el, building: el.matches(BOX_SELECTOR) });
      }
      shapes.sort((a, b) => Number(b.building) - Number(a.building));
      return { shapes };
    };

    /** The place a clicked shape stands for, or null. */
    const placeInShape = (shape: Element, building: boolean, clientX: number, clientY: number, ctm: DOMMatrix) => {
      const r = shape.getBoundingClientRect();
      const a = toSvg(r.left, r.top, ctm);
      const b = toSvg(r.right, r.bottom, ctm);
      const p = toSvg(clientX, clientY, ctm);
      const [x0, x1] = [Math.min(a.x, b.x) - 4, Math.max(a.x, b.x) + 4];
      const [y0, y1] = [Math.min(a.y, b.y) - 4, Math.max(a.y, b.y) + 4];
      // The place inside the clicked box (closest to the click when a building holds several).
      let best: LocationRecord | null = null;
      let bestD = Infinity;
      for (const loc of locationRecords) {
        if (loc.x < x0 || loc.x > x1 || loc.y < y0 || loc.y > y1) continue;
        const d = Math.hypot(loc.x - p.x, loc.y - p.y);
        if (d < bestD) {
          bestD = d;
          best = loc;
        }
      }
      // A building box whose catalog point sits just outside it: the nearest place within reach.
      // (Other shapes must contain the point, so a stray click on a plot selects nothing.)
      if (!best && building) {
        const reach = Math.hypot(x1 - x0, y1 - y0) / 2 + TAP_RADIUS / 2;
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        for (const loc of locationRecords) {
          const d = Math.hypot(loc.x - cx, loc.y - cy);
          if (d < reach && d < bestD) {
            bestD = d;
            best = loc;
          }
        }
      }
      return best;
    };

    const onClick = (e: MouseEvent) => {
      if (Date.now() < suppressClickUntilRef.current) return; // the end of a drag or pinch
      const hit = hitAt(e.clientX, e.clientY);
      if (hit.loc) return onLocationClick(hit.loc);
      const ctm = svgElement.getScreenCTM();
      if (!ctm) return;
      for (const { el, building } of hit.shapes) {
        const place = placeInShape(el, building, e.clientX, e.clientY, ctm);
        if (place) return onLocationClick(place);
      }
      // Nothing that stands for a place here: empty ground, just the map.
    };

    svgElement.addEventListener('click', onClick);
    return () => svgElement.removeEventListener('click', onClick);
  }, [svgElement, locationRecords, onLocationClick]);

  // Optional DOM highlight when a real SVG id exists (preserve IDs in source).
  useEffect(() => {
    let applied: Element | null = null;
    if (!svgElement || !selectedLocation?.svgId) return () => undefined;
    const id = selectedLocation.svgId;
    const probe = id.trim();
    if (!probe || probe.startsWith('pattern') || probe.startsWith('image')) return () => undefined;
    applied = getSvgElementByLayerId(svgElement, id);
    if (applied) applied.classList.add('ctu-svg-hit');
    return () => {
      applied?.classList.remove('ctu-svg-hit');
    };
  }, [svgElement, selectedLocation]);

  // Soft destination glow (does not alter base map geometry).
  useEffect(() => {
    if (!svgElement) return;
    const old = svgElement.querySelector('#ctu-destination-glow');
    if (old) old.remove();

    if (!selectedLocation) return;

    const cx = destinationPinCenter?.x ?? selectedLocation.x;
    const cy = destinationPinCenter?.y ?? selectedLocation.y;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'ctu-destination-glow');
    g.setAttribute('transform', `translate(${cx} ${cy})`);

    const r = selectedLocation.type === 'building' ? 120 : 72;
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse.setAttribute('cx', '0');
    ellipse.setAttribute('cy', '0');
    ellipse.setAttribute('rx', String(r));
    ellipse.setAttribute('ry', String(r * 0.72));
    ellipse.setAttribute('fill', '#ff990a');
    ellipse.setAttribute('opacity', '0.14');


    g.appendChild(ellipse);
    svgElement.appendChild(g);
  }, [svgElement, selectedLocation, destinationPinCenter]);

  // Labels the drawing leaves out (Basketball Court, Green House, the BIT labs, …).
  useEffect(() => {
    if (!svgElement || svgElement.querySelector('#extra-labels')) return;
    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('id', 'extra-labels');
    g.setAttribute('pointer-events', 'none');
    for (const label of EXTRA_MAP_LABELS) {
      const loc = locationRecords.find((l) => l.name.toLowerCase() === label.name.toLowerCase());
      if (!loc) continue;
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('x', String(loc.x));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', 'Inter, "Segoe UI", system-ui, sans-serif');
      text.setAttribute('font-weight', '600');
      text.setAttribute('font-size', String(label.size));
      text.setAttribute('fill', '#111827');
      text.setAttribute('stroke', '#ffffff');
      text.setAttribute('stroke-width', String(Math.max(1.2, label.size * 0.28)));
      text.setAttribute('stroke-linejoin', 'round');
      text.setAttribute('paint-order', 'stroke');
      // Center the block of lines on the place (plus any offset).
      const lineH = label.size * 1.15;
      const top = loc.y + (label.dy ?? 0) - ((label.lines.length - 1) * lineH) / 2 + label.size * 0.35;
      label.lines.forEach((line, i) => {
        const span = document.createElementNS(NS, 'tspan');
        span.setAttribute('x', String(loc.x));
        span.setAttribute('y', String(top + i * lineH));
        span.textContent = line;
        text.appendChild(span);
      });
      g.appendChild(text);
    }
    svgElement.appendChild(g);
  }, [svgElement, locationRecords]);

  // Category dots: where every place of the chosen chip is (tap one to select it).
  useEffect(() => {
    if (!svgElement) return;
    svgElement.querySelector('#category-markers')?.remove();
    if (categoryRecords.length === 0) return;
    const colors: Record<string, string> = {
      building: '#780301',
      room: '#047857',
      office: '#6d28d9',
      facility: '#0f766e',
      cr: '#be123c',
      landmark: '#b45309',
    };
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'category-markers');
    for (const loc of categoryRecords) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', String(loc.x));
      c.setAttribute('cy', String(loc.y));
      c.setAttribute('r', '7');
      c.setAttribute('fill', colors[loc.type] ?? '#780301');
      c.setAttribute('stroke', '#fff');
      c.setAttribute('stroke-width', '2.5');
      c.setAttribute('data-loc-id', loc.id);
      c.setAttribute('class', 'ctu-category-dot');
      g.appendChild(c);
    }
    svgElement.appendChild(g);
    // Keep the route and the destination pin above the dots.
    for (const id of ['#route-overlay', '#selection-marker']) {
      const el = svgElement.querySelector(id);
      if (el) svgElement.appendChild(el);
    }
  }, [svgElement, categoryRecords]);

  // Route overlay
  useEffect(() => {
    if (!svgElement) return;

    const existingRoute = svgElement.querySelector('#route-overlay');
    if (existingRoute) existingRoute.remove();

    if (routePath.length > 1) {
      const pathData = routeToSmoothSvgPath(routePath);

      const routeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      routeGroup.setAttribute('id', 'route-overlay');
      routeGroup.setAttribute('pointer-events', 'none');

      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      glow.setAttribute('d', pathData);
      glow.setAttribute('stroke', '#ffb347');
      glow.setAttribute('stroke-width', '22');
      glow.setAttribute('fill', 'none');
      glow.setAttribute('opacity', '0.22');
      glow.setAttribute('stroke-linecap', 'round');
      glow.setAttribute('stroke-linejoin', 'round');

      const routeLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      routeLine.setAttribute('d', pathData);
      routeLine.setAttribute('stroke', '#de0602');
      routeLine.setAttribute('stroke-width', '9');
      routeLine.setAttribute('fill', 'none');
      routeLine.setAttribute('opacity', '0.92');
      routeLine.setAttribute('stroke-linecap', 'round');
      routeLine.setAttribute('stroke-linejoin', 'round');

      // No blur filter: it re-rendered the whole route on every frame of the dash animation.

      const animatedLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      animatedLine.setAttribute('d', pathData);
      animatedLine.setAttribute('stroke', '#ff990a');
      animatedLine.setAttribute('stroke-width', '4');
      animatedLine.setAttribute('fill', 'none');
      animatedLine.setAttribute('stroke-dasharray', '10 10');
      animatedLine.setAttribute('stroke-linecap', 'round');
      animatedLine.setAttribute('stroke-linejoin', 'round');

      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate.setAttribute('attributeName', 'stroke-dashoffset');
      animate.setAttribute('from', '0');
      animate.setAttribute('to', '20');
      animate.setAttribute('dur', '1.6s');
      animate.setAttribute('repeatCount', 'indefinite');
      animatedLine.appendChild(animate);

      const startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      startMarker.setAttribute('cx', String(routePath[0].x));
      startMarker.setAttribute('cy', String(routePath[0].y));
      startMarker.setAttribute('r', '9');
      startMarker.setAttribute('fill', '#15803d');
      startMarker.setAttribute('stroke', '#FFF');
      startMarker.setAttribute('stroke-width', '3');

      const endMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const endX = destinationPinCenter?.x ?? routePath[routePath.length - 1].x;
      const endY = destinationPinCenter?.y ?? routePath[routePath.length - 1].y;
      endMarker.setAttribute('cx', String(endX));
      endMarker.setAttribute('cy', String(endY));
      endMarker.setAttribute('r', '9');
      endMarker.setAttribute('fill', '#de0602');
      endMarker.setAttribute('stroke', '#FFF');
      endMarker.setAttribute('stroke-width', '3');

      routeGroup.appendChild(glow);
      routeGroup.appendChild(routeLine);
      routeGroup.appendChild(animatedLine);
      routeGroup.appendChild(startMarker);
      routeGroup.appendChild(endMarker);

      svgElement.appendChild(routeGroup);
      const pin = svgElement.querySelector('#selection-marker');
      if (pin) svgElement.appendChild(pin);
      const dbg = svgElement.querySelector('#ctu-pin-debug');
      if (dbg) svgElement.appendChild(dbg);
    }
  }, [svgElement, routePath, destinationPinCenter]);

  // Destination pin — visual center in SVG space (translate = center, circles at origin).
  useEffect(() => {
    if (!svgElement) return;

    const existingMarker = svgElement.querySelector('#selection-marker');
    if (existingMarker) existingMarker.remove();

    if (selectedLocation) {
      const cx = destinationPinCenter?.x ?? selectedLocation.x;
      const cy = destinationPinCenter?.y ?? selectedLocation.y;

      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      marker.setAttribute('id', 'selection-marker');
      marker.setAttribute('class', 'destination-pin');
      marker.setAttribute('transform', `translate(${cx} ${cy})`);

      const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulseCircle.setAttribute('cx', '0');
      pulseCircle.setAttribute('cy', '0');
      pulseCircle.setAttribute('r', '18');
      pulseCircle.setAttribute('fill', '#de0602');
      pulseCircle.setAttribute('opacity', '0.35');

      const pulseAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      pulseAnimate.setAttribute('attributeName', 'r');
      pulseAnimate.setAttribute('from', '14');
      pulseAnimate.setAttribute('to', '32');
      pulseAnimate.setAttribute('dur', '1.4s');
      pulseAnimate.setAttribute('repeatCount', 'indefinite');
      pulseCircle.appendChild(pulseAnimate);

      const opacityAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      opacityAnimate.setAttribute('attributeName', 'opacity');
      opacityAnimate.setAttribute('from', '0.45');
      opacityAnimate.setAttribute('to', '0');
      opacityAnimate.setAttribute('dur', '1.4s');
      opacityAnimate.setAttribute('repeatCount', 'indefinite');
      pulseCircle.appendChild(opacityAnimate);

      const centerPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      centerPin.setAttribute('cx', '0');
      centerPin.setAttribute('cy', '0');
      centerPin.setAttribute('r', '12');
      centerPin.setAttribute('fill', '#de0602');
      centerPin.setAttribute('stroke', '#FFF');
      centerPin.setAttribute('stroke-width', '3');

      marker.appendChild(pulseCircle);
      marker.appendChild(centerPin);
      svgElement.appendChild(marker);
    }
  }, [svgElement, selectedLocation, destinationPinCenter]);

  // Optional: `?debugPin=1` or `localStorage.setItem('ctu-debug-pin','1')` — bbox, clamp rect, center crosshair.
  useEffect(() => {
    if (!svgElement) return;
    svgElement.querySelector('#ctu-pin-debug')?.remove();
    if (!isPinDebugEnabled() || !selectedLocation?.svgId) return;
    const probe = selectedLocation.svgId.trim();
    if (!probe || probe.startsWith('pattern') || probe.startsWith('image')) return;
    const el = getSvgGraphicsByLayerId(svgElement, selectedLocation.svgId);
    const gfx = el as unknown as SVGGraphicsElement;
    if (!el || typeof gfx.getBBox !== 'function') return;
    let bbox: DOMRect;
    try {
      bbox = gfx.getBBox();
    } catch {
      return;
    }
    const inset = Math.min(18, Math.max(2.5, Math.min(bbox.width, bbox.height) * 0.06));

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'ctu-pin-debug');
    g.setAttribute('pointer-events', 'none');

    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    outer.setAttribute('x', String(bbox.x));
    outer.setAttribute('y', String(bbox.y));
    outer.setAttribute('width', String(bbox.width));
    outer.setAttribute('height', String(bbox.height));
    outer.setAttribute('fill', 'none');
    outer.setAttribute('stroke', '#d946ef');
    outer.setAttribute('stroke-width', '1.25');
    outer.setAttribute('stroke-dasharray', '6 4');

    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    inner.setAttribute('x', String(bbox.x + inset));
    inner.setAttribute('y', String(bbox.y + inset));
    inner.setAttribute('width', String(Math.max(0, bbox.width - inset * 2)));
    inner.setAttribute('height', String(Math.max(0, bbox.height - inset * 2)));
    inner.setAttribute('fill', 'none');
    inner.setAttribute('stroke', '#f97316');
    inner.setAttribute('stroke-width', '1');
    inner.setAttribute('stroke-dasharray', '3 3');

    g.appendChild(outer);
    g.appendChild(inner);

    const pc = destinationPinCenter;
    if (pc) {
      const L = 12;
      const h = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      h.setAttribute('x1', String(pc.x - L));
      h.setAttribute('y1', String(pc.y));
      h.setAttribute('x2', String(pc.x + L));
      h.setAttribute('y2', String(pc.y));
      h.setAttribute('stroke', '#22d3ee');
      h.setAttribute('stroke-width', '2');
      const v = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      v.setAttribute('x1', String(pc.x));
      v.setAttribute('y1', String(pc.y - L));
      v.setAttribute('x2', String(pc.x));
      v.setAttribute('y2', String(pc.y + L));
      v.setAttribute('stroke', '#22d3ee');
      v.setAttribute('stroke-width', '2');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', String(pc.x));
      dot.setAttribute('cy', String(pc.y));
      dot.setAttribute('r', '3');
      dot.setAttribute('fill', '#22d3ee');
      g.appendChild(h);
      g.appendChild(v);
      g.appendChild(dot);
    }

    svgElement.appendChild(g);
  }, [svgElement, selectedLocation, destinationPinCenter]);

  // Pan scroll area to focus route or selected destination.
  useEffect(() => {
    if (!mapScrollRef.current || !focusRef.current) return;
    let x: number | null = null;
    let y: number | null = null;
    if (routePath.length > 1) {
      let sx = 0;
      let sy = 0;
      for (const n of routePath) {
        sx += n.x;
        sy += n.y;
      }
      x = sx / routePath.length;
      y = sy / routePath.length;
    } else if (selectedLocation) {
      x = destinationPinCenter?.x ?? selectedLocation.x;
      y = destinationPinCenter?.y ?? selectedLocation.y;
    }
    if (x == null || y == null) return;
    const el = focusRef.current;
    el.style.left = `${Math.min(Math.max(x, 0), MAP_W)}px`;
    el.style.top = `${Math.min(Math.max(y, 0), MAP_H)}px`;
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [selectedLocation, routePath, destinationPinCenter]);

  return (
    <div className="w-full h-full min-h-0 min-w-0 bg-card rounded-lg sm:rounded-xl shadow-lg border border-border overflow-hidden relative flex flex-col isolation-isolate touch-pan-x touch-pan-y">
      <div
        ref={mapScrollRef}
        className="map-pan-surface flex-1 min-h-0 min-w-0 w-full overflow-auto overscroll-contain bg-gradient-to-br from-opticore-bg via-card to-muted/80 p-2 sm:p-4 md:p-6 lg:p-8"
      >
        {/* 
          Important: transform: scale() does NOT affect layout size.
          So we keep an outer box sized to the *scaled* dimensions,
          and scale an inner fixed-size map. This way, zooming out
          truly reduces scrollable area and the whole UI stays visible.
        */}
        {/*
          Centering: smaller than the screen → the map sits in the middle (m-auto in a full-size
          flex box); larger → it starts at the edge and scrolls, so no side is ever cut off.
        */}
        <div className="flex min-h-full min-w-full w-max">
        <div
          ref={sizedBoxRef}
          className="relative m-auto shrink-0"
          style={{
            width: Math.round(MAP_W * scale),
            height: Math.round(MAP_H * scale),
          }}
        >
          <div
            ref={contentRef}
            className="absolute inset-0"
            style={{
              width: MAP_W,
              height: MAP_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <div
              ref={focusRef}
              className="absolute w-px h-px pointer-events-none opacity-0 z-10"
              aria-hidden
            />
            {/* Flat map: a 3D tilt and CSS filters made every pan/zoom repaint expensive on phones. */}
            <div className="absolute inset-0 z-0 rounded-sm shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)]">
              <MapSVGLoader onLoad={handleSVGLoad} />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute left-2 sm:left-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] sm:bottom-4 z-20 flex items-center gap-1 sm:gap-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg sm:rounded-xl shadow-lg p-1.5 sm:p-2 max-w-[calc(100%-1rem)]">
        <button
          type="button"
          onClick={zoomOut}
          className="p-2 rounded-lg hover:bg-muted text-foreground min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="px-1 sm:px-2 text-[11px] font-semibold text-foreground tabular-nums min-w-[52px] sm:min-w-[58px] text-center">
          {Math.round(scale * 100)}%
        </div>
        <button
          type="button"
          onClick={zoomIn}
          className="p-2 rounded-lg hover:bg-muted text-foreground min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={zoomReset}
          className="p-2 rounded-lg hover:bg-muted text-foreground min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Reset zoom to 50%"
          title="Reset zoom (50%)"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute left-2 right-2 sm:left-auto sm:right-4 bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:bottom-4 z-20 max-w-none sm:max-w-[220px] bg-card/95 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-3 border border-border text-[11px] text-muted-foreground pointer-events-none">
        <div className="font-semibold text-foreground mb-2 text-xs">Legend</div>
        <div className="space-y-1.5 flex flex-row sm:flex-col flex-wrap gap-x-4 gap-y-1 sm:gap-x-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-1 rounded shrink-0 bg-opticore-red-2" /> Route
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-opticore-red-2 ring-2 ring-card shrink-0" /> Destination
          </div>
        </div>
      </div>

      <div className="absolute top-2 left-10 right-2 sm:left-auto sm:right-3 md:top-3 z-10 hidden sm:block max-w-[min(100%-2.75rem,20rem)] md:max-w-[22rem] bg-card/95 border border-border rounded-lg px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-sm truncate">
        Drag to move · Pinch or double-tap to zoom · Click a building or room
      </div>
      <span className="sr-only">
        Zoom 50% to 200% · Drag to pan · Select a building or room to see its details
      </span>
    </div>
  );
}
