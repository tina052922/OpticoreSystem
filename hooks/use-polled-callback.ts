"use client";

/**
 * Shared polling primitive: interval + visibility gating + jitter.
 *
 * Why this exists
 * ───────────────
 * Every badge/feed hook used to hand-roll `setInterval(load, N)`. That had two
 * costs across ~10 call sites:
 *
 *   1. **Background tabs kept polling.** A user with several OptiCore tabs open
 *      overnight generated continuous load for output nobody could see. The
 *      backend rate limit is 300 req/min, so idle tabs ate real headroom.
 *   2. **No jitter.** Clients that loaded together (start of a workday) polled
 *      in lockstep, producing a thundering herd every 30s.
 *
 * Behaviour
 * ─────────
 *   • Ticks are skipped while `document.visibilityState === "hidden"`. The
 *     interval keeps running rather than being torn down, so we don't restart
 *     the clock on every tab switch.
 *   • On return to visible, if a tick was skipped we refetch once immediately
 *     (`refreshOnFocus`), so the user never stares at data frozen since they
 *     left. This is the piece that makes skipping ticks safe.
 *   • Each interval is offset by up to `jitterRatio` of its period, de-phasing
 *     clients that mounted simultaneously.
 *   • `callback` is held in a ref, so a caller passing an inline arrow doesn't
 *     tear down and restart the timer on every render. Only `intervalMs` /
 *     `enabled` / `jitterRatio` do that.
 */

import { useEffect, useRef } from "react";

export type PolledCallbackOptions = {
  /** Base period in ms. Ignored when `enabled` is false. */
  intervalMs: number;
  /** When false, no timer is scheduled and no listeners are attached. */
  enabled?: boolean;
  /** Fraction of `intervalMs` to randomize the phase by. 0 disables jitter. */
  jitterRatio?: number;
  /**
   * Refetch on return to a visible tab, but only when a tick was actually
   * skipped while hidden. Set false for feeds where a stale view is acceptable.
   */
  refreshOnFocus?: boolean;
};

export function usePolledCallback(
  callback: () => void | Promise<void>,
  options: PolledCallbackOptions,
): void {
  const {
    intervalMs,
    enabled = true,
    jitterRatio = 0.1,
    refreshOnFocus = true,
  } = options;

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  /** Set when a tick fires in a hidden tab; drives the catch-up on refocus. */
  const missedTickRef = useRef(false);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    if (typeof window === "undefined") return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const isHidden = () =>
      typeof document !== "undefined" && document.visibilityState === "hidden";

    const run = () => {
      if (isHidden()) {
        missedTickRef.current = true;
        return;
      }
      void callbackRef.current();
    };

    // De-phase clients that mounted at the same moment. This offsets the first
    // tick rather than adding one — callers are responsible for their own
    // initial load, so firing here would double-fetch on mount.
    const jitter =
      jitterRatio > 0 ? Math.random() * intervalMs * jitterRatio : 0;
    const startId = setTimeout(() => {
      intervalId = setInterval(run, intervalMs);
    }, jitter);

    const onVisibility = () => {
      if (isHidden()) return;
      if (!refreshOnFocus) return;
      if (!missedTickRef.current) return;
      missedTickRef.current = false;
      void callbackRef.current();
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(startId);
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs, jitterRatio, refreshOnFocus]);
}
