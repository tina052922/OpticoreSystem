import { describe, expect, it } from "vitest";
import { SESSION_REFRESH_INTERVAL_MS, sessionGateFor } from "./session-refresh";

describe("sessionGateFor", () => {
  it("serves the page while the access token is live", () => {
    expect(sessionGateFor({ hasAccessToken: true, hasRefreshToken: true })).toBe("allow");
  });

  /**
   * The bug this exists for: the access cookie expires every hour, and treating that as a logout
   * threw out anyone who had been reading rather than clicking.
   */
  it("renews rather than logs out when only the access token has expired", () => {
    expect(sessionGateFor({ hasAccessToken: false, hasRefreshToken: true })).toBe("refresh");
  });

  it("sends a signed-out visitor to the login page", () => {
    expect(sessionGateFor({ hasAccessToken: false, hasRefreshToken: false })).toBe("login");
  });

  /** After logging out both cookies are gone, so there is nothing left to renew from. */
  it("does not renew from an access token alone", () => {
    expect(sessionGateFor({ hasAccessToken: true, hasRefreshToken: false })).toBe("allow");
  });
});

describe("SESSION_REFRESH_INTERVAL_MS", () => {
  /** Must leave slack before the one-hour token expires, or the renewal races the expiry. */
  it("renews before the token expires", () => {
    expect(SESSION_REFRESH_INTERVAL_MS).toBeLessThan(60 * 60 * 1000);
    expect(SESSION_REFRESH_INTERVAL_MS).toBeGreaterThan(30 * 60 * 1000);
  });
});
