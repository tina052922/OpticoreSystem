"use client";

import { useEffect } from "react";
import { useActionToast } from "@/components/alerts/useActionToast";
import { takeFlashToast } from "@/lib/ui/flash-toast";

/** Shows a success message parked before a reload (see `lib/ui/flash-toast.ts`). Mounted in the shells. */
export function FlashToastOnLoad() {
  const toast = useActionToast();
  useEffect(() => {
    const flash = takeFlashToast();
    if (flash) toast.ok(flash.title, flash.detail ?? undefined);
    // Once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
