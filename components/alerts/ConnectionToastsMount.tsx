"use client";

import { useConnectionStatusToasts } from "@/hooks/use-connection-status-toasts";

/** One global mount in `app/layout.tsx` so every role gets consistent connection toasts. */
export function ConnectionToastsMount() {
  useConnectionStatusToasts();
  return null;
}

