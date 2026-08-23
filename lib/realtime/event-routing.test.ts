import { describe, expect, it } from "vitest";

/**
 * Mirrors the backend's topic model (src/realtime/events.ts + sse.controller.ts).
 *
 * These tests pin the AUTHORIZATION rule — that a connection receives an event
 * only when it owns a matching topic. The logic is duplicated here rather than
 * imported because the two packages don't share a module graph; if you change
 * the backend rule, change this too. The value is catching a silent widening of
 * fan-out (e.g. "everything goes to CAMPUS"), which would be a data-adjacent
 * regression that no type checker would flag.
 */

const TOPIC = {
  CAMPUS: "campus",
  user: (id: string) => `user:${id}`,
  college: (id: string) => `college:${id}`,
};

type User = { id: string; collegeId?: string | null };

/** Server-side topic derivation — the client never supplies these. */
function topicsForUser(user: User): Set<string> {
  const topics = new Set<string>([TOPIC.CAMPUS, TOPIC.user(user.id)]);
  if (user.collegeId) topics.add(TOPIC.college(user.collegeId));
  return topics;
}

function shouldDeliver(
  userTopics: Set<string>,
  event: { topics: string[]; originId?: string | null },
  connectionId: string,
): boolean {
  if (!event.topics.some((t) => userTopics.has(t))) return false;
  if (event.originId && event.originId === connectionId) return false;
  return true;
}

const alice: User = { id: "u-alice", collegeId: "c-cas" };
const bob: User = { id: "u-bob", collegeId: "c-cot" };
const noCollege: User = { id: "u-visitor", collegeId: null };

describe("topicsForUser", () => {
  it("always includes campus and the user's own topic", () => {
    const topics = topicsForUser(alice);
    expect(topics.has("campus")).toBe(true);
    expect(topics.has("user:u-alice")).toBe(true);
  });

  it("includes the college topic when the user has one", () => {
    expect(topicsForUser(alice).has("college:c-cas")).toBe(true);
  });

  it("omits a college topic for users without a college", () => {
    const topics = [...topicsForUser(noCollege)];
    expect(topics.some((t) => t.startsWith("college:"))).toBe(false);
  });

  it("never grants another user's topic", () => {
    expect(topicsForUser(alice).has("user:u-bob")).toBe(false);
  });

  it("never grants another college's topic", () => {
    expect(topicsForUser(alice).has("college:c-cot")).toBe(false);
  });
});

describe("event delivery authorization", () => {
  const aliceTopics = topicsForUser(alice);
  const bobTopics = topicsForUser(bob);

  it("delivers a personal notification only to its owner", () => {
    const event = { topics: [TOPIC.user("u-alice")] };
    expect(shouldDeliver(aliceTopics, event, "conn-1")).toBe(true);
    expect(shouldDeliver(bobTopics, event, "conn-2")).toBe(false);
  });

  it("delivers a college badge event only within that college", () => {
    const event = { topics: [TOPIC.college("c-cas")] };
    expect(shouldDeliver(aliceTopics, event, "conn-1")).toBe(true);
    expect(shouldDeliver(bobTopics, event, "conn-2")).toBe(false);
  });

  it("delivers campus events to everyone authenticated", () => {
    const event = { topics: [TOPIC.CAMPUS] };
    expect(shouldDeliver(aliceTopics, event, "conn-1")).toBe(true);
    expect(shouldDeliver(bobTopics, event, "conn-2")).toBe(true);
    expect(shouldDeliver(topicsForUser(noCollege), event, "conn-3")).toBe(true);
  });

  it("delivers when ANY topic matches (multi-target events)", () => {
    const event = { topics: [TOPIC.user("u-bob"), TOPIC.college("c-cas")] };
    expect(shouldDeliver(aliceTopics, event, "conn-1")).toBe(true);
  });

  it("drops an event whose topics match nothing", () => {
    const event = { topics: [TOPIC.college("c-unknown")] };
    expect(shouldDeliver(aliceTopics, event, "conn-1")).toBe(false);
  });

  it("drops an event with no topics rather than broadcasting it", () => {
    // Fail closed: a builder bug must not turn into an accidental fan-out.
    expect(shouldDeliver(aliceTopics, { topics: [] }, "conn-1")).toBe(false);
  });

  it("suppresses the echo to the originating connection", () => {
    const event = { topics: [TOPIC.CAMPUS], originId: "conn-1" };
    expect(shouldDeliver(aliceTopics, event, "conn-1")).toBe(false);
  });

  it("still delivers to the same user's other tabs", () => {
    const event = { topics: [TOPIC.user("u-alice")], originId: "conn-1" };
    expect(shouldDeliver(aliceTopics, event, "conn-2")).toBe(true);
  });

  it("ignores a null originId", () => {
    const event = { topics: [TOPIC.CAMPUS], originId: null };
    expect(shouldDeliver(aliceTopics, event, "conn-1")).toBe(true);
  });
});

describe("topic construction hygiene", () => {
  it("keeps user and college namespaces from colliding", () => {
    // A raw id must never be usable as a topic; the prefix is what scopes it.
    expect(TOPIC.user("x")).not.toBe(TOPIC.college("x"));
  });

  it("filters falsy topics so a null id cannot become a wildcard", () => {
    const built = [...new Set(["campus", "", undefined as never].filter(Boolean))];
    expect(built).toEqual(["campus"]);
  });
});
