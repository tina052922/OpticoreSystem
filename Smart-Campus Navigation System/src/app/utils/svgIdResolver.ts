/**
 * Strict SVG lookup: `svgId` matches the SVG element `id` (CSS / Figma layer name).
 * Tries `getElementById`, then `#` + CSS.escape, then `[id="…"]` for ids that contain spaces or punctuation.
 * No fuzzy or parent-based resolution.
 */

function escapeForIdAttribute(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function getSvgElementByLayerId(svg: SVGSVGElement, svgId: string | null | undefined): Element | null {
  if (svgId == null || svgId === '') return null;
  const trimmed = svgId.trim();
  if (!trimmed) return null;

  /** Figma/CSS exports may use significant trailing spaces in `id` — try exact string first. */
  const candidates = svgId !== trimmed ? [svgId, trimmed] : [trimmed];

  for (const id of candidates) {
    const byId = svg.getElementById(id);
    if (byId) return byId;
  }
  for (const id of candidates) {
    try {
      const hash = svg.querySelector(`#${CSS.escape(id)}`);
      if (hash) return hash;
    } catch {
      /* invalid # selector */
    }
  }
  for (const id of candidates) {
    try {
      const el = svg.querySelector(`[id="${escapeForIdAttribute(id)}"]`);
      if (el) return el;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function getSvgGraphicsByLayerId(
  svg: SVGSVGElement,
  svgId: string | null | undefined
): SVGGraphicsElement | null {
  const el = getSvgElementByLayerId(svg, svgId);
  if (!el) return null;
  if (typeof (el as SVGGraphicsElement).getBBox === 'function') {
    return el as SVGGraphicsElement;
  }
  return null;
}
