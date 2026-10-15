"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { authApi } from "@/lib/api/client";
import { SESSION_REFRESH_INTERVAL_MS } from "@/lib/auth/session-refresh";

/** Pages where nobody is signed in, so there is nothing to keep alive. */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/campus-navigation")
  );
}

/**
 * Renews the signed-in session on a timer, whether or not anyone is using the page.
 *
 * Sessions used to end an hour after sign-in because nothing ever exchanged the refresh token, and
 * reading a long report without clicking looked exactly like being logged out. Renewal is on a
 * clock and owes nothing to activity: the session ends when the person logs out.
 *
 * A failure here is deliberately silent. The session is still valid until its refresh token runs
 * out, the request will be retried at the next tick, and anything that truly needs a live token
 * reports it where the person is actually looking.
 */
export function SessionKeepAlive() {
  const pathname = usePathname() ?? "";
  const publicPath = isPublicPath(pathname);

  useEffect(() => {
    if (publicPath) return;

    let cancelled = false;
    const renew = () => {
      if (cancelled || typeof document === "undefined") return;
      // A hidden tab's timers are throttled anyway; the visible one does the work.
      if (document.visibilityState === "hidden") return;
      void authApi.refresh().catch(() => {});
    };

    const timer = window.setInterval(renew, SESSION_REFRESH_INTERVAL_MS);

    /*
     * A laptop that slept through the interval wakes with an expired token and a timer that never
     * fired. Renewing when the tab comes back is what covers that gap.
     */
    const onVisible = () => {
      if (document.visibilityState === "visible") renew();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [publicPath]);

  return null;
}
