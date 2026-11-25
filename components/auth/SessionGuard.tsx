"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { ApiClientError, authApi } from "@/lib/api/client";
import {
  reactionToCurrentUser,
  reactionToSessionEvent,
  subscribeSession,
} from "@/lib/auth/session-sync";

/** Re-check the session this often while the tab is visible (backup for missed announcements). */
const RECHECK_MS = 60_000;
/** Time the notice stays up before the tab moves on. */
const NOTICE_MS = 1800;
/** Before believing "no session", ask again after this pause (another tab may be refreshing it). */
const CONFIRM_SIGNED_OUT_MS = 1500;

/**
 * Keeps this tab on the account the browser is actually signed in as.
 *
 * Mounted once in every signed-in shell (staff and student). It remembers who this tab was opened
 * as, then:
 *   • another tab signs OUT          → this tab goes to the login page;
 *   • another tab signs in as SOMEONE ELSE → this tab reloads as that account, quietly (no notice:
 *     the session check already keeps the tab on the right account);
 *   • on returning to the tab (and every minute) it asks the server who is signed in, which also
 *     catches a session that expired or was ended elsewhere.
 * Only a sign-out shows a short notice before it moves.
 *
 * Signing in on ANOTHER DEVICE never signs this one out: sessions are per device (the server ends
 * only the session that logs out). So the tab leaves only when the server confirms, twice, that
 * this browser has no session — a single 401 (two tabs refreshing the token at the same moment, a
 * restart) or a sign-out announcement is checked against the server first.
 */
export function SessionGuard() {
  const shownUserIdRef = useRef<string | null>(null);
  const actingRef = useRef(false);
  const [notice, setNotice] = useState<"logout" | null>(null);

  useEffect(() => {
    let alive = true;

    function act(kind: "logout" | "switch" | "none") {
      if (kind === "none" || actingRef.current) return;
      actingRef.current = true;
      // Full navigation: nothing from the old account's screen may survive in memory.
      if (kind === "switch") {
        // Another account signed in on this browser: reload as it straight away, without a notice.
        window.location.replace("/");
        return;
      }
      setNotice("logout");
      window.setTimeout(() => window.location.replace("/login?notice=signed_out_elsewhere"), NOTICE_MS);
    }

    async function whoIsSignedIn(): Promise<string | null | undefined> {
      try {
        const r = await authApi.me({ forceRefresh: true });
        // First-time setup not finished (code not confirmed / password not chosen): finish it first.
        const step = r.user?.firstLoginStep;
        if (step && step !== "done" && !window.location.pathname.startsWith("/account/")) {
          actingRef.current = true;
          window.location.replace("/account/change-password?first=1");
        }
        return r.user?.id ?? null;
      } catch (e) {
        // 401 = no session any more; a network hiccup tells us nothing (undefined).
        return e instanceof ApiClientError && e.status === 401 ? null : undefined;
      }
    }

    /**
     * Who is signed in, with "nobody" double-checked: a 401 is asked again after a short pause,
     * because another tab of this browser may have been refreshing the token at that moment.
     * undefined = could not tell (network): nothing happens.
     */
    async function whoIsSignedInConfirmed(): Promise<string | null | undefined> {
      const first = await whoIsSignedIn();
      if (first !== null) return first;
      await new Promise((resolve) => window.setTimeout(resolve, CONFIRM_SIGNED_OUT_MS));
      if (!alive) return undefined;
      return whoIsSignedIn();
    }

    // Who this tab was opened as.
    void whoIsSignedIn().then((id) => {
      if (alive && id) shownUserIdRef.current = id;
    });

    const unsubscribe = subscribeSession((event) => {
      const reaction = reactionToSessionEvent(shownUserIdRef.current, event);
      if (reaction !== "logout") {
        act(reaction);
        return;
      }
      // "Signed out" from another tab: leave only if the server agrees this browser has no session.
      void whoIsSignedInConfirmed().then((current) => {
        if (!alive || current === undefined) return;
        act(reactionToCurrentUser(shownUserIdRef.current, current));
      });
    });

    async function recheck() {
      if (document.visibilityState !== "visible" || !shownUserIdRef.current || actingRef.current) return;
      const current = await whoIsSignedInConfirmed();
      if (!alive || current === undefined) return;
      act(reactionToCurrentUser(shownUserIdRef.current, current));
    }

    const onVisible = () => void recheck();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const timer = window.setInterval(() => void recheck(), RECHECK_MS);

    return () => {
      alive = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  if (!notice) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-guard-title"
        className="oc-toast-enter w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#a10402] to-[#5a0201] text-white shadow-md">
          <LogOut className="h-5 w-5" aria-hidden />
        </div>
        <h2 id="session-guard-title" className="mt-4 text-lg font-bold text-[#780301]">
          You were signed out
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-black/60">
          This browser was signed out in another tab. Taking you to the sign-in page…
        </p>
      </div>
    </div>
  );
}
