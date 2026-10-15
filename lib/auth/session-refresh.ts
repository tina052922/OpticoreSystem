/**
 * How long before an access token expires that the browser renews it.
 *
 * The token lives an hour, so renewing at fifty minutes leaves ten minutes of slack for a sleeping
 * laptop, a slow network or a tab that was throttled in the background. Renewal is on a timer and
 * owes nothing to activity: a session should end when someone logs out, not when they stop typing.
 */
export const SESSION_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

/** Cookie the browser sends as proof of an active session. */
export const ACCESS_TOKEN_COOKIE = "oc_at";

/** Cookie that outlives the access token and can mint a new one. */
export const REFRESH_TOKEN_COOKIE = "oc_rt";

/**
 * What to do with a request for a protected page.
 *
 * The access cookie expires after an hour, so its absence says nothing about whether the person is
 * still signed in — only that the token needs renewing. Redirecting on that alone is what turned a
 * quiet hour into a logout. While a refresh cookie is present the session is alive and the request
 * is served after renewing; only when both are gone is there genuinely nothing to renew.
 */
export type SessionGate = "allow" | "refresh" | "login";

export function sessionGateFor(cookies: {
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
}): SessionGate {
  if (cookies.hasAccessToken) return "allow";
  if (cookies.hasRefreshToken) return "refresh";
  return "login";
}
