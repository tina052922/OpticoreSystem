"use client";

import { useEffect, useRef } from "react";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";

/**
 * Global connection status toasts:
 * - Offline: persistent toast (no auto-dismiss)
 * - Online restore: dismiss offline toast + brief success toast
 *
 * Keep this lightweight: one event listener pair per mounted caller.
 */
export function useConnectionStatusToasts(args?: { scopeLabel?: string }) {
  const toast = useOpticoreToast();
  const wasOnlineRef = useRef<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const offlineId = "opticore-conn-offline";
    const onOffline = () => {
      wasOnlineRef.current = false;
      toast.notify({
        id: offlineId,
        variant: "error",
        title: "Connection lost. Working in offline mode.",
        description: "Changes will be saved when online.",
        durationMs: 0,
      });
    };
    const onOnline = () => {
      const firstRestore = wasOnlineRef.current === false;
      wasOnlineRef.current = true;
      toast.dismiss(offlineId);
      if (firstRestore) {
        toast.success("Connection restored. Syncing changes…", args?.scopeLabel ?? null);
      }
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    /** On mount: if already offline, show immediately. */
    if (typeof navigator !== "undefined" && navigator.onLine === false) onOffline();

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [toast, args?.scopeLabel]);
}

