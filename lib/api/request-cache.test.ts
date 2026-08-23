import { beforeEach, describe, expect, it } from "vitest";
import {
  buildCacheKey,
  clearApiCache,
  defaultInvalidationPrefix,
  invalidateApiCache,
  readApiCache,
  readInFlight,
  trackInFlight,
  writeApiCache,
} from "./request-cache";

describe("buildCacheKey", () => {
  it("sorts query params so param order does not fragment the cache", () => {
    expect(buildCacheKey("GET", "/api/x?b=2&a=1")).toBe(
      buildCacheKey("GET", "/api/x?a=1&b=2"),
    );
  });

  it("keeps different values on the same param distinct", () => {
    expect(buildCacheKey("GET", "/api/e?periodId=a")).not.toBe(
      buildCacheKey("GET", "/api/e?periodId=b"),
    );
  });

  it("normalizes method casing", () => {
    expect(buildCacheKey("get", "/api/x")).toBe(buildCacheKey("GET", "/api/x"));
  });
});

describe("readApiCache / writeApiCache", () => {
  beforeEach(() => clearApiCache());

  it("misses on an unknown key", () => {
    expect(readApiCache("GET /api/nope").hit).toBe(false);
  });

  it("returns a stored value before the TTL elapses", () => {
    writeApiCache("k", { a: 1 }, 10_000);
    expect(readApiCache<{ a: number }>("k")).toEqual({ hit: true, value: { a: 1 } });
  });

  it("distinguishes a cached undefined from a miss", () => {
    writeApiCache("k", undefined, 10_000);
    expect(readApiCache("k")).toEqual({ hit: true, value: undefined });
  });

  it("expires entries once the TTL passes", async () => {
    writeApiCache("k", 1, 1);
    await new Promise((r) => setTimeout(r, 5));
    expect(readApiCache("k").hit).toBe(false);
  });

  it("ignores non-positive TTLs", () => {
    writeApiCache("k", 1, 0);
    expect(readApiCache("k").hit).toBe(false);
  });

  it("clones on read so consumers cannot corrupt the cached copy", () => {
    writeApiCache("k", { list: [1, 2] }, 10_000);
    const first = readApiCache<{ list: number[] }>("k").value!;
    first.list.push(999);
    expect(readApiCache<{ list: number[] }>("k").value!.list).toEqual([1, 2]);
  });
});

describe("in-flight de-duplication", () => {
  beforeEach(() => clearApiCache());

  it("shares one promise across concurrent callers", async () => {
    let calls = 0;
    const run = () => {
      const existing = readInFlight<number>("k");
      if (existing) return existing;
      return trackInFlight(
        "k",
        (async () => {
          calls += 1;
          await new Promise((r) => setTimeout(r, 10));
          return 42;
        })(),
      );
    };

    const results = await Promise.all([run(), run(), run()]);
    expect(results).toEqual([42, 42, 42]);
    expect(calls).toBe(1);
  });

  it("clears the in-flight slot after rejection so failures are not pinned", async () => {
    await expect(
      trackInFlight("k", Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");
    await new Promise((r) => setTimeout(r, 0));
    expect(readInFlight("k")).toBeNull();
  });
});

describe("invalidateApiCache", () => {
  beforeEach(() => clearApiCache());

  it("drops only keys under the given path prefix", () => {
    writeApiCache("GET /api/catalog/programs", 1, 10_000);
    writeApiCache("GET /api/catalog/schedule-entries?academicPeriodId=x", 2, 10_000);
    writeApiCache("GET /api/semesters", 3, 10_000);

    invalidateApiCache("/api/catalog");

    expect(readApiCache("GET /api/catalog/programs").hit).toBe(false);
    expect(readApiCache("GET /api/catalog/schedule-entries?academicPeriodId=x").hit).toBe(false);
    expect(readApiCache("GET /api/semesters").hit).toBe(true);
  });
});

describe("defaultInvalidationPrefix", () => {
  it("derives the first two path segments", () => {
    expect(defaultInvalidationPrefix("/api/catalog/schedule-entries-upsert")).toBe(
      "/api/catalog",
    );
  });

  it("strips the query string", () => {
    expect(defaultInvalidationPrefix("/api/notifications/12/read?x=1")).toBe(
      "/api/notifications",
    );
  });

  it("returns null when there are too few segments to scope safely", () => {
    expect(defaultInvalidationPrefix("/api")).toBeNull();
  });
});
