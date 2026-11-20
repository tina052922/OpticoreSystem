"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Rows drawn at first, and added each time the list is scrolled to its end. */
export const INCREMENTAL_PAGE_SIZE = 20;

/**
 * Draw a long list a page at a time.
 *
 * A table of 500 audit entries or 300 faculty rows (each with its own inputs) is slow to draw even
 * when the data is already here. This shows the first 20 and adds 20 more whenever the end of the
 * list scrolls into view (or "Show more" is clicked). Searching or filtering starts again at 20.
 *
 * `resetKey` should change whenever the list is a different list (a new search, filter or scope).
 */
export function useIncrementalList<T>(items: readonly T[], resetKey: unknown, pageSize = INCREMENTAL_PAGE_SIZE) {
  const [count, setCount] = useState(pageSize);

  useEffect(() => {
    setCount(pageSize);
  }, [resetKey, pageSize]);

  const showMore = useCallback(() => setCount((c) => c + pageSize), [pageSize]);
  const visible = items.length > count ? items.slice(0, count) : items;
  return { visible, hasMore: items.length > count, shown: visible.length, total: items.length, showMore };
}

/**
 * Placed after the last row: loads the next page when it scrolls into view, with a button for
 * keyboards, screen readers and browsers without IntersectionObserver.
 */
export function ShowMoreRows({
  hasMore,
  shown,
  total,
  onMore,
  colSpan,
}: {
  hasMore: boolean;
  shown: number;
  total: number;
  onMore: () => void;
  /** Set when used inside a <tbody>: renders a table row. */
  colSpan?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) onMore();
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onMore, shown]);

  if (!hasMore) return null;
  const inner = (
    <button
      type="button"
      onClick={onMore}
      className="rounded-md border border-black/15 bg-white px-3 py-1.5 text-[12px] font-semibold text-black/70 hover:bg-black/[0.03]"
    >
      Show more ({shown} of {total})
    </button>
  );
  if (colSpan) {
    return (
      <tr ref={(el) => { ref.current = el; }}>
        <td colSpan={colSpan} className="px-3 py-3 text-center">
          {inner}
        </td>
      </tr>
    );
  }
  return (
    <div ref={(el) => { ref.current = el; }} className="py-3 text-center">
      {inner}
    </div>
  );
}
