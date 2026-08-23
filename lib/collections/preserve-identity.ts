/**
 * Referential-identity preservation for polled list state.
 *
 * Why this exists
 * ───────────────
 * Pollers re-fetch the same resource every N seconds and call
 * `setState(freshArray)`. Even when the payload is byte-identical, the parsed
 * array is a brand-new object, so React sees changed state and every downstream
 * `useMemo` keyed on it recomputes.
 *
 * That is usually cheap. It is NOT cheap when the derived value feeds
 * `@react-pdf/renderer`: `PDFViewer` re-renders on `children` identity
 * (`useEffect(..., [children])`), so a no-op poll silently regenerates the whole
 * document and the open preview flashes.
 *
 * Passing the fresh rows through {@link preserveListIdentity} keeps the previous
 * array instance whenever the contents are equal, which stops the cascade at the
 * source instead of patching each consumer.
 *
 * Cost: one shallow field-by-field comparison per row per poll — O(rows × fields)
 * on a list that is already being JSON-parsed. Negligible next to a PDF render.
 */

/** Compares two records by their own enumerable keys using `Object.is`. */
function shallowEqualRecord(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    // Guard against `b` merely inheriting the key.
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

/** True when both lists hold shallow-equal records in the same order. */
export function listsAreShallowEqual<T>(prev: readonly T[], next: readonly T[]): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;

  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (Object.is(a, b)) continue;
    if (
      a === null ||
      b === null ||
      typeof a !== "object" ||
      typeof b !== "object"
    ) {
      return false;
    }
    if (
      !shallowEqualRecord(
        a as Record<string, unknown>,
        b as Record<string, unknown>,
      )
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Returns `prev` when `next` is content-equal, otherwise `next`.
 *
 * Intended for the updater form of `setState` so the comparison always runs
 * against the current value without needing it as an effect dependency:
 *
 * ```ts
 * setEntries((prev) => preserveListIdentity(prev, data.entries ?? []));
 * ```
 *
 * Order-sensitive by design: reordered rows are a real change for a schedule
 * grid. The server sorts deterministically so a stable payload stays stable.
 */
export function preserveListIdentity<T>(prev: readonly T[], next: readonly T[]): readonly T[] {
  return listsAreShallowEqual(prev, next) ? prev : next;
}
