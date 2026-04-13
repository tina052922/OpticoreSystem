"use client";

import { useEffect } from "react";

const FLAG = "opti_chunk_reload_once";

/**
 * After a dev server restart or HMR, the browser may still request old chunk URLs and throw ChunkLoadError.
 * One automatic reload usually fixes it. This avoids an infinite loop with a short-lived session flag.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const clearId = window.setTimeout(() => {
      sessionStorage.removeItem(FLAG);
    }, 10_000);

    function isChunkFailure(msg: string) {
      return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
        msg,
      );
    }

    function tryRecover(msg: string) {
      if (!isChunkFailure(msg)) return;
      if (sessionStorage.getItem(FLAG) === "1") return;
      sessionStorage.setItem(FLAG, "1");
      window.location.reload();
    }

    function onWindowError(e: ErrorEvent) {
      const parts = [e.message, e.error?.message, String(e.error)].filter(Boolean);
      tryRecover(parts.join(" "));
    }

    function onRejection(e: PromiseRejectionEvent) {
      const r = e.reason;
      const msg = typeof r === "object" && r && "message" in r ? String((r as Error).message) : String(r);
      tryRecover(msg);
    }

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.clearTimeout(clearId);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
