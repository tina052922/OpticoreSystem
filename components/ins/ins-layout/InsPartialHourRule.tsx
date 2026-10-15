/**
 * Rules off the parts of an hour a class does not occupy.
 *
 * The printed grid has no row finer than the hour, so a 7:00–8:30 class has to be drawn across two
 * of them and a class starting at 8:30 begins halfway down one. Without these lines both read an
 * hour longer than they are. The area outside the class is left white, like any free cell, so the
 * next meeting's own box is what the eye picks out.
 */
export function InsPartialHourRule({
  fraction,
  startFraction = null,
}: {
  /** Where the class ends inside the cell, or `null` when it runs to the bottom. */
  fraction: number | null;
  /** Where the class begins inside the cell, or `null` when it starts at the top. */
  startFraction?: number | null;
}) {
  const hasEnd = fraction != null && fraction > 0 && fraction < 1;
  const hasStart = startFraction != null && startFraction > 0 && startFraction < 1;
  if (!hasEnd && !hasStart) return null;

  return (
    <>
      {hasStart ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-0 border-b border-neutral-900 bg-white"
          style={{ height: `${startFraction * 100}%` }}
        />
      ) : null}
      {hasEnd ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 border-t border-neutral-900 bg-white"
          style={{ top: `${fraction * 100}%` }}
        />
      ) : null}
    </>
  );
}
