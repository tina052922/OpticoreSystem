import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Minus, Plus, RefreshCcw } from 'lucide-react';
import type { PathNode } from '../types/campus';
import type { LocationRecord } from '../types/locationRecord';
import { buildWalkabilityGraphFromSvg, routeToSmoothSvgPath } from '../services/walkabilityGraph';
import { isPinDebugEnabled, resolveLocationSvgCenter } from '../utils/svgLocationCenter';
import { getSvgElementByLayerId, getSvgGraphicsByLayerId } from '../utils/svgIdResolver';
import { warnSvgCatalogAgainstDom } from '../utils/validateSvgCatalog';
import { MapSVGLoader } from './MapSVGLoader';

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
}

const MAP_W = 1728;
const MAP_H = 1117;
const TAP_RADIUS = 56;
const MIN_SCALE = 0.35;
const MAX_SCALE = 2.25;

export function CampusMapInteractive({
  selectedLocation,
  routePath,
  locationRecords,
  onWalkGraphReady,
  onDestinationCenterResolved,
  onLocationClick,
}: CampusMapInteractiveProps) {
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  /** Resolved visual center of `selectedLocation.svgId` in SVG user space; falls back to catalog x/y. */
  const [destinationPinCenter, setDestinationPinCenter] = useState<{ x: number; y: number } | null>(null);
  const stylingAppliedRef = useRef(false);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [fitScale, setFitScale] = useState(1);
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

  // Fit-to-screen scaling so users don't need to browser-zoom out.
  useEffect(() => {
    const host = mapScrollRef.current;
    if (!host) return;

    const computeFit = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      const next = Math.max(MIN_SCALE, Math.min(1, Math.min(w / MAP_W, h / MAP_H)));
      setFitScale(next);
      setScale((cur) => (cur === 1 ? next : cur));
    };

    computeFit();
    const ro = new ResizeObserver(() => computeFit());
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, Math.round((s + 0.1) * 100) / 100));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, Math.round((s - 0.1) * 100) / 100));
  const zoomFit = () => setScale(fitScale);

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
          filter: drop-shadow(0px 1px 0px rgba(0,0,0,0.10)) drop-shadow(0px 3px 8px rgba(0,0,0,0.10));
        }
        rect[fill="#D9D9D9"] {
          fill: var(--building-alt) !important;
          stroke: var(--building-stroke) !important;
          stroke-width: 0.65 !important;
          filter: drop-shadow(0px 1px 0px rgba(0,0,0,0.08)) drop-shadow(0px 3px 8px rgba(0,0,0,0.10));
        }
        rect[fill="#A1A1A1"] {
          fill: var(--roof) !important;
          stroke: var(--building-stroke) !important;
          stroke-width: 0.65 !important;
          filter: drop-shadow(0px 1px 0px rgba(0,0,0,0.08)) drop-shadow(0px 3px 8px rgba(0,0,0,0.10));
        }
        [fill="#6E6D6D"] {
          fill: var(--road) !important;
          opacity: 0.92 !important;
          stroke: var(--road-edge) !important;
          stroke-width: 2.25 !important;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0px 2px 6px rgba(0,0,0,0.12));
        }
        [stroke="#B4BEC7"] {
          stroke: var(--road) !important;
          stroke-width: 12 !important;
          opacity: 0.92 !important;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0px 2px 6px rgba(0,0,0,0.12));
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
          transition: fill 140ms ease, opacity 140ms ease, filter 140ms ease;
        }
        rect[fill="#C5C3C3"]:hover,
        rect[fill="#D9D9D9"]:hover,
        rect[fill="#A1A1A1"]:hover {
          fill: #ff990a !important;
          opacity: 0.96 !important;
          filter: drop-shadow(0px 2px 0px rgba(0,0,0,0.12)) drop-shadow(0px 6px 14px rgba(0,0,0,0.18));
        }
        .ctu-svg-hit {
          filter: drop-shadow(0 0 10px #ff990a) !important;
          stroke: #780301 !important;
          stroke-width: 2.5px !important;
        }
        .destination-pin {
          pointer-events: none;
        }
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

    const onClick = (e: MouseEvent) => {
      const ctm = svgElement.getScreenCTM();
      if (!ctm) return;
      const pt = svgElement.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const p = pt.matrixTransform(ctm.inverse());

      let best: LocationRecord | null = null;
      let bestD = TAP_RADIUS;
      for (const loc of locationRecords) {
        const d = Math.hypot(loc.x - p.x, loc.y - p.y);
        if (d < bestD) {
          bestD = d;
          best = loc;
        }
      }
      if (best) onLocationClick(best);
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

    const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    anim.setAttribute('attributeName', 'opacity');
    anim.setAttribute('values', '0.08;0.18;0.08');
    anim.setAttribute('dur', '2.4s');
    anim.setAttribute('repeatCount', 'indefinite');
    ellipse.appendChild(anim);

    g.appendChild(ellipse);
    svgElement.appendChild(g);
  }, [svgElement, selectedLocation, destinationPinCenter]);

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

      let defs = svgElement.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svgElement.insertBefore(defs, svgElement.firstChild);
      }
      if (!svgElement.getElementById('ctu-route-glow-filter')) {
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'ctu-route-glow-filter');
        filter.setAttribute('x', '-40%');
        filter.setAttribute('y', '-40%');
        filter.setAttribute('width', '180%');
        filter.setAttribute('height', '180%');
        const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        blur.setAttribute('in', 'SourceGraphic');
        blur.setAttribute('stdDeviation', '5');
        blur.setAttribute('result', 'blur');
        filter.appendChild(blur);
        defs.appendChild(filter);
      }
      glow.setAttribute('filter', 'url(#ctu-route-glow-filter)');

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
        className="flex-1 min-h-0 min-w-0 w-full overflow-auto scroll-smooth overscroll-contain bg-gradient-to-br from-opticore-bg via-card to-muted/80 p-2 sm:p-4 md:p-6 lg:p-8"
      >
        {/* 
          Important: transform: scale() does NOT affect layout size.
          So we keep an outer box sized to the *scaled* dimensions,
          and scale an inner fixed-size map. This way, zooming out
          truly reduces scrollable area and the whole UI stays visible.
        */}
        <div
          className="relative mx-auto"
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
            {/* Semi-3D: perspective tilt; focusRef stays unrotated for scroll anchoring. */}
            <div
              className="absolute inset-0 z-0"
              style={{
                perspective: 'min(1400px, 85vw)',
                perspectiveOrigin: '50% 36%',
              }}
            >
              <div
                className="w-full h-full rounded-sm"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: 'rotateX(10deg) rotateY(-4deg) translateZ(0)',
                  transformOrigin: '50% 50%',
                  boxShadow: `
                    0 2px 0 rgba(255,255,255,0.45),
                    0 50px 100px -28px rgba(15, 23, 42, 0.45),
                    0 28px 56px -24px rgba(15, 23, 42, 0.28)
                  `,
                  filter: 'saturate(1.04) contrast(1.02)',
                }}
              >
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
          onClick={zoomFit}
          className="p-2 rounded-lg hover:bg-muted text-foreground min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Fit to screen"
          title="Fit to screen"
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
        Fit · Pan · Tap to pick place
      </div>
      <span className="sr-only">
        Fit-to-screen enabled · Scroll to pan · Tap map to pick nearest place
      </span>
    </div>
  );
}
