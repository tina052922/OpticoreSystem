"use client";

import { usePathname, useSearchParams } from "next/navigation";

/**
 * Active state for INS inner nav links that may use either legacy paths (`/ins/faculty`) or combined `?tab=`.
 */
export function useInsInnerTabIsActive(insBasePath: string, tab: "faculty" | "section" | "room"): boolean {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const root = (insBasePath.replace(/\/(faculty|section|room)\/?$/, "").replace(/\/$/, "") || insBasePath).trim();
  const suffix = tab === "faculty" ? "/faculty" : tab === "section" ? "/section" : "/room";
  if (pathname === `${root}${suffix}`) return true;
  if (pathname === root || pathname === `${root}/`) {
    const q = searchParams.get("tab");
    const cur: "faculty" | "section" | "room" = q === "section" || q === "room" ? q : "faculty";
    return cur === tab;
  }
  return false;
}
