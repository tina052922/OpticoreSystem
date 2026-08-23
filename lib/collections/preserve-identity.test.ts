import { describe, expect, it } from "vitest";
import { listsAreShallowEqual, preserveListIdentity } from "./preserve-identity";

type Row = { id: string; day: string; startTime?: string };

const rows = (): Row[] => [
  { id: "a", day: "Monday", startTime: "07:00" },
  { id: "b", day: "Tuesday", startTime: "09:00" },
];

describe("listsAreShallowEqual", () => {
  it("treats the same reference as equal", () => {
    const list = rows();
    expect(listsAreShallowEqual(list, list)).toBe(true);
  });

  it("treats structurally identical lists as equal", () => {
    expect(listsAreShallowEqual(rows(), rows())).toBe(true);
  });

  it("detects a differing field value", () => {
    const next = rows();
    next[1] = { ...next[1]!, startTime: "10:00" };
    expect(listsAreShallowEqual(rows(), next)).toBe(false);
  });

  it("detects length changes", () => {
    expect(listsAreShallowEqual(rows(), rows().slice(0, 1))).toBe(false);
  });

  it("detects reordering (order is meaningful for a schedule grid)", () => {
    expect(listsAreShallowEqual(rows(), [...rows()].reverse())).toBe(false);
  });

  it("detects an added key", () => {
    const next = rows();
    next[0] = { ...next[0]!, extra: 1 } as Row;
    expect(listsAreShallowEqual(rows(), next)).toBe(false);
  });

  it("detects a removed key", () => {
    const next = rows();
    const { startTime: _dropped, ...rest } = next[0]!;
    next[0] = rest as Row;
    expect(listsAreShallowEqual(rows(), next)).toBe(false);
  });

  it("does not treat an inherited key as an own key", () => {
    const proto = { id: "a" };
    const inheriting = Object.create(proto) as Record<string, unknown>;
    expect(listsAreShallowEqual([{ id: "a" }], [inheriting as never])).toBe(false);
  });

  it("handles empty lists", () => {
    expect(listsAreShallowEqual([], [])).toBe(true);
  });

  it("compares primitives by value", () => {
    expect(listsAreShallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(listsAreShallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it("does not recurse into nested objects (shallow by contract)", () => {
    const a = [{ id: "a", meta: { n: 1 } }];
    const b = [{ id: "a", meta: { n: 1 } }];
    // Nested objects differ by reference, so this is reported as changed.
    expect(listsAreShallowEqual(a, b)).toBe(false);
  });

  it("treats null entries consistently", () => {
    expect(listsAreShallowEqual([null], [null])).toBe(true);
    expect(listsAreShallowEqual([null], [{ id: "a" } as never])).toBe(false);
  });
});

describe("preserveListIdentity", () => {
  it("returns the previous array when contents are unchanged", () => {
    const prev = rows();
    const next = rows();
    expect(preserveListIdentity(prev, next)).toBe(prev);
  });

  it("returns the next array when contents changed", () => {
    const prev = rows();
    const next = rows();
    next[0] = { ...next[0]!, day: "Friday" };
    expect(preserveListIdentity(prev, next)).toBe(next);
  });

  it("keeps identity stable across repeated no-op polls", () => {
    let state: readonly Row[] = rows();
    const original = state;
    for (let i = 0; i < 10; i++) {
      state = preserveListIdentity(state, rows());
    }
    // This is the property that stops the PDF from regenerating on every tick.
    expect(state).toBe(original);
  });

  it("adopts the new array exactly once when data finally changes", () => {
    let state: readonly Row[] = rows();
    const original = state;

    state = preserveListIdentity(state, rows());
    expect(state).toBe(original);

    const changed = rows();
    changed.push({ id: "c", day: "Wednesday" });
    state = preserveListIdentity(state, changed);
    expect(state).toBe(changed);

    // ...and then re-stabilizes on the new content.
    const afterChange = state;
    state = preserveListIdentity(state, [...changed]);
    expect(state).toBe(afterChange);
  });

  it("handles the empty-to-empty case without churn", () => {
    const prev: Row[] = [];
    expect(preserveListIdentity(prev, [])).toBe(prev);
  });
});
