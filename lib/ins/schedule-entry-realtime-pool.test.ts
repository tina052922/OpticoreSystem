import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These tests pin the two properties that stop the duplicate-request storm:
 *
 *   1. N subscribers for the same term share ONE timer and ONE fetch per tick.
 *   2. Hidden tabs skip work entirely and catch up once on refocus.
 *
 * `catalogApi` is mocked because the pool imports it dynamically inside the
 * poll function; the mock lets us count network calls precisely.
 */

/** Typed so `mock.calls[i][0]` is known to be the period id. */
const scheduleEntries = vi.fn(
  async (_periodId: string, _opts?: { forceRefresh?: boolean }) => ({
    entries: [],
  }),
);

vi.mock("@/lib/api/client", () => ({
  catalogApi: { scheduleEntries },
}));

/**
 * Captures the pool's SSE handler so tests can drive server-pushed events
 * directly, and asserts the subscription is released when the pool empties.
 */
let realtimeHandler: ((event: unknown) => void) | null = null;
const realtimeUnsubscribe = vi.fn();

vi.mock("@/lib/realtime/realtime-client", () => ({
  subscribeRealtime: (handler: (event: unknown) => void) => {
    realtimeHandler = handler;
    return realtimeUnsubscribe;
  },
}));

/** Minimal `document` stub so the pool's visibility gating is exercisable in the node env. */
function installDocument(initial: "visible" | "hidden") {
  const listeners = new Set<() => void>();
  const doc = {
    visibilityState: initial,
    addEventListener: (type: string, fn: () => void) => {
      if (type === "visibilitychange") listeners.add(fn);
    },
    removeEventListener: (type: string, fn: () => void) => {
      if (type === "visibilitychange") listeners.delete(fn);
    },
  };
  (globalThis as unknown as { document: unknown }).document = doc;
  return {
    setVisibility(next: "visible" | "hidden") {
      doc.visibilityState = next;
      for (const fn of [...listeners]) fn();
    },
    listenerCount: () => listeners.size,
  };
}

/** Must track POLL_INTERVAL_MS in the implementation (realtime-era fallback cadence). */
const POLL_MS = 180_000;

/**
 * Drains pending microtasks.
 *
 * `pollPeriodEntries` awaits a dynamic `import()` before it fetches, so several
 * concurrent refreshes need more microtask turns than `advanceTimersByTimeAsync`
 * yields on its own.
 */
async function flushMicrotasks(turns = 20): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve();
}

let subscribe: typeof import("./schedule-entry-realtime-pool").subscribeScheduleEntryRealtimePool;

beforeEach(async () => {
  vi.useFakeTimers();
  scheduleEntries.mockClear();
  realtimeUnsubscribe.mockClear();
  realtimeHandler = null;
  // Fresh module registry per test so the module-level pool never leaks between tests.
  vi.resetModules();
  ({ subscribeScheduleEntryRealtimePool: subscribe } = await import(
    "./schedule-entry-realtime-pool"
  ));
});

afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as unknown as { document?: unknown }).document;
});

describe("subscribeScheduleEntryRealtimePool", () => {
  it("does not fetch on subscribe (callers own their initial load)", () => {
    installDocument("visible");
    subscribe("term-1", () => {});
    expect(scheduleEntries).not.toHaveBeenCalled();
  });

  it("issues one fetch per tick regardless of subscriber count", async () => {
    installDocument("visible");
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();
    subscribe("term-1", a);
    subscribe("term-1", b);
    subscribe("term-1", c);

    await vi.advanceTimersByTimeAsync(POLL_MS);

    expect(scheduleEntries).toHaveBeenCalledTimes(1);
    // ...but every subscriber is still woken up.
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(c).toHaveBeenCalledTimes(1);
  });

  it("bypasses the TTL on poll ticks so the feed cannot stall", async () => {
    installDocument("visible");
    subscribe("term-1", () => {});

    await vi.advanceTimersByTimeAsync(POLL_MS);

    expect(scheduleEntries).toHaveBeenCalledWith("term-1", { forceRefresh: true });
  });

  it("keeps separate timers for distinct terms", async () => {
    installDocument("visible");
    subscribe("term-1", () => {});
    subscribe("term-2", () => {});

    await vi.advanceTimersByTimeAsync(POLL_MS);

    expect(scheduleEntries).toHaveBeenCalledTimes(2);
  });

  it("skips ticks while the tab is hidden", async () => {
    const dom = installDocument("visible");
    subscribe("term-1", () => {});
    dom.setVisibility("hidden");

    await vi.advanceTimersByTimeAsync(POLL_MS * 3);

    expect(scheduleEntries).not.toHaveBeenCalled();
  });

  it("catches up exactly once when the tab becomes visible again", async () => {
    const dom = installDocument("visible");
    const listener = vi.fn();
    subscribe("term-1", listener);

    dom.setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(scheduleEntries).not.toHaveBeenCalled();

    dom.setVisibility("visible");
    await vi.advanceTimersByTimeAsync(0);

    // Three skipped ticks collapse into a single catch-up request.
    expect(scheduleEntries).toHaveBeenCalledTimes(1);
  });

  it("does not refetch on refocus when no tick was missed", async () => {
    const dom = installDocument("visible");
    subscribe("term-1", () => {});

    dom.setVisibility("hidden");
    dom.setVisibility("visible");
    await vi.advanceTimersByTimeAsync(0);

    expect(scheduleEntries).not.toHaveBeenCalled();
  });

  it("stops polling once the last subscriber unsubscribes", async () => {
    installDocument("visible");
    const unsubA = subscribe("term-1", () => {});
    const unsubB = subscribe("term-1", () => {});

    unsubA();
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(scheduleEntries).toHaveBeenCalledTimes(1); // B still listening

    unsubB();
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(scheduleEntries).toHaveBeenCalledTimes(1); // no further work
  });

  it("releases the visibility listener when the pool empties", () => {
    const dom = installDocument("visible");
    const unsub = subscribe("term-1", () => {});
    expect(dom.listenerCount()).toBe(1);

    unsub();
    expect(dom.listenerCount()).toBe(0);
  });

  it("ignores a blank period id", async () => {
    installDocument("visible");
    const unsub = subscribe("   ", () => {});
    await vi.advanceTimersByTimeAsync(POLL_MS);

    expect(scheduleEntries).not.toHaveBeenCalled();
    expect(() => unsub()).not.toThrow();
  });

  it("keeps polling after a failed request", async () => {
    installDocument("visible");
    scheduleEntries.mockRejectedValueOnce(new Error("network down"));
    const listener = vi.fn();
    subscribe("term-1", listener);

    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(listener).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(scheduleEntries).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("realtime push", () => {
  it("refetches immediately on a schedule.changed event for a subscribed term", async () => {
    installDocument("visible");
    const listener = vi.fn();
    subscribe("term-1", listener);

    realtimeHandler?.({
      name: "schedule.changed",
      payload: { academicPeriodId: "term-1" },
    });
    await vi.advanceTimersByTimeAsync(0);

    // No timer advance needed — this is the whole point of realtime.
    expect(scheduleEntries).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reacts to schedule.published so editors lock promptly", async () => {
    installDocument("visible");
    subscribe("term-1", () => {});

    realtimeHandler?.({
      name: "schedule.published",
      payload: { academicPeriodId: "term-1" },
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(scheduleEntries).toHaveBeenCalledTimes(1);
  });

  it("ignores events for terms this client is not showing", async () => {
    installDocument("visible");
    subscribe("term-1", () => {});

    realtimeHandler?.({
      name: "schedule.changed",
      payload: { academicPeriodId: "term-OTHER" },
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(scheduleEntries).not.toHaveBeenCalled();
  });

  it("ignores unrelated event types", async () => {
    installDocument("visible");
    subscribe("term-1", () => {});

    realtimeHandler?.({ name: "notification.changed", payload: {} });
    await vi.advanceTimersByTimeAsync(0);

    expect(scheduleEntries).not.toHaveBeenCalled();
  });

  it("refreshes every subscribed term when no period is specified", async () => {
    installDocument("visible");
    subscribe("term-1", () => {});
    subscribe("term-2", () => {});

    // Defensive: a malformed event must not silently drop updates.
    realtimeHandler?.({ name: "schedule.changed", payload: {} });
    await flushMicrotasks();

    expect(scheduleEntries).toHaveBeenCalledTimes(2);
    expect(scheduleEntries.mock.calls.map((c) => c[0])).toEqual([
      "term-1",
      "term-2",
    ]);
  });

  it("releases the realtime subscription when the pool empties", () => {
    installDocument("visible");
    const unsub = subscribe("term-1", () => {});
    expect(realtimeUnsubscribe).not.toHaveBeenCalled();

    unsub();
    expect(realtimeUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
