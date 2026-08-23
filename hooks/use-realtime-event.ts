"use client";

/**
 * React bindings for the realtime stream.
 *
 * Consumers get a filtered, referentially-stable subscription so an inline
 * arrow callback doesn't tear down and re-open the shared connection on every
 * render.
 */

import { useEffect, useRef, useState } from "react";
import {
  subscribeRealtime,
  subscribeRealtimeStatus,
  type RealtimeEvent,
  type RealtimeEventName,
  type RealtimeStatus,
} from "@/lib/realtime/realtime-client";

/**
 * Runs `handler` when any of `names` arrives.
 *
 * `handler` is held in a ref, so only `names` (compared by value) can restart
 * the subscription.
 */
export function useRealtimeEvent(
  names: RealtimeEventName | RealtimeEventName[],
  handler: (event: RealtimeEvent) => void,
  options: { enabled?: boolean } = {},
): void {
  const { enabled = true } = options;

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  // Join into a primitive so a fresh array literal per render doesn't
  // re-subscribe. Order is preserved by the caller.
  const nameList = Array.isArray(names) ? names : [names];
  const nameKey = nameList.join("|");

  useEffect(() => {
    if (!enabled) return;
    const wanted = new Set(nameKey.split("|") as RealtimeEventName[]);
    return subscribeRealtime((event) => {
      if (!wanted.has(event.name)) return;
      handlerRef.current(event);
    });
  }, [nameKey, enabled]);
}

/** Current connection status, for an offline / reconnecting indicator. */
export function useRealtimeStatus(): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  useEffect(() => subscribeRealtimeStatus(setStatus), []);
  return status;
}
