/**
 * Scrolls an element into view inside the app shell's scroll container.
 *
 * `Element.scrollIntoView()` walks up and scrolls every scrollable ancestor, including `<body>`. The
 * shell locks the body with `overflow: clip` so it cannot scroll, but before that lock an
 * `overflow: hidden` body was still scrollable by script — the shell slid up, taking the header off
 * screen and showing page background underneath. Scrolling the marked container directly keeps the
 * shell itself fixed, whatever the browser would otherwise do.
 */

/** Offset so the target does not sit flush against the top edge. */
const TOP_GAP_PX = 12;

export function scrollIntoAppView(
  element: HTMLElement | null | undefined,
  options: { behavior?: ScrollBehavior; gap?: number } = {},
): void {
  if (!element) return;
  const behavior = options.behavior ?? "smooth";
  const gap = options.gap ?? TOP_GAP_PX;

  const container = element.closest<HTMLElement>("[data-app-scroll]");
  if (!container) {
    // No shell (standalone page): the document is the scroller, so the default behaviour is right.
    element.scrollIntoView({ behavior, block: "start" });
    return;
  }

  // Rect deltas rather than offsetTop: correct regardless of positioned ancestors in between.
  const elementTop = element.getBoundingClientRect().top;
  const containerTop = container.getBoundingClientRect().top;
  const top = container.scrollTop + (elementTop - containerTop) - gap;

  container.scrollTo({ top: Math.max(0, top), behavior });
}
