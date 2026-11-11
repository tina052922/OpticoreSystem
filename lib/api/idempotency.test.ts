import { describe, expect, it } from "vitest";
import { isWriteMethod, newIdempotencyKey, shouldRetryWrite, writeDedupeKey } from "./idempotency";

describe("client idempotency helpers", () => {
  it("makes a new key every time, in the format the server accepts", () => {
    const a = newIdempotencyKey();
    expect(a).not.toBe(newIdempotencyKey());
    expect(a).toMatch(/^[A-Za-z0-9_\-:.]{8,128}$/);
  });

  it("only treats writes as writes", () => {
    expect(["POST", "put", "PATCH", "delete"].every(isWriteMethod)).toBe(true);
    expect(isWriteMethod("GET")).toBe(false);
  });

  it("retries only unanswered requests and in-progress duplicates, a limited number of times", () => {
    expect(shouldRetryWrite({ status: 0 }, 0)).toBe(true);
    expect(shouldRetryWrite({ status: 409, code: "IDEMPOTENCY_IN_PROGRESS" }, 1)).toBe(true);
    expect(shouldRetryWrite({ status: 409, code: "CONFLICT" }, 0)).toBe(false);
    expect(shouldRetryWrite({ status: 500 }, 0)).toBe(false);
    expect(shouldRetryWrite({ status: 0 }, 2)).toBe(false);
  });

  it("collapses identical JSON writes but never uploads", () => {
    expect(writeDedupeKey("post", "/a", { x: 1 })).toBe(writeDedupeKey("POST", "/a", { x: 1 }));
    expect(writeDedupeKey("POST", "/a", { x: 1 })).not.toBe(writeDedupeKey("POST", "/a", { x: 2 }));
    expect(writeDedupeKey("POST", "/a", new Blob(["x"]))).toBeNull();
  });
});
