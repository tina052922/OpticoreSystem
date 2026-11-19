import { describe, expect, it } from "vitest";
import { isSessionEvent, reactionToCurrentUser, reactionToSessionEvent } from "./session-sync";

const ev = (type: "login" | "logout", userId: string | null) => ({ type, userId, at: 1 });

describe("session sync", () => {
  it("signs a tab out when another tab signs out", () => {
    expect(reactionToSessionEvent("college-admin", ev("logout", null))).toBe("logout");
  });

  it("reloads a tab when a DIFFERENT account signs in elsewhere", () => {
    // Tab 1 shows College Admin; tab 2 signs in as Chairperson.
    expect(reactionToSessionEvent("college-admin", ev("login", "chairman"))).toBe("switch");
  });

  it("leaves a tab alone when the same account signs in again elsewhere", () => {
    expect(reactionToSessionEvent("college-admin", ev("login", "college-admin"))).toBe("none");
  });

  it("decides the same from a fresh session check", () => {
    expect(reactionToCurrentUser("college-admin", null)).toBe("logout");
    expect(reactionToCurrentUser("college-admin", "chairman")).toBe("switch");
    expect(reactionToCurrentUser("college-admin", "college-admin")).toBe("none");
    expect(reactionToCurrentUser(null, "chairman")).toBe("none");
  });

  it("only accepts well-formed events", () => {
    expect(isSessionEvent(ev("login", "x"))).toBe(true);
    expect(isSessionEvent({ type: "hack", at: 1 })).toBe(false);
    expect(isSessionEvent(null)).toBe(false);
  });
});
