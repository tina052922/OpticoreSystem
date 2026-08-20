"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { saveLastPath } from "@/lib/utils/storage";

/** Saves the current pathname so login can redirect back. */
export function PathSaver() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/login") {
      saveLastPath(pathname);
    }
  }, [pathname]);

  return null;
}
