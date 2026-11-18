"use client";

import { useEffect, useState } from "react";
import { DEFAULT_REPORT_FOOTER_BANNER } from "@/lib/system-configuration/campus-branding";

const cache = new Map<string, string>();

/**
 * The rankings strip as a data URL for react-pdf, so INS / Summary PDFs embed it reliably in preview,
 * download and print instead of depending on react-pdf fetching a site path. Falls back to the path.
 */
export function usePdfFooterBanner(path: string = DEFAULT_REPORT_FOOTER_BANNER): string {
  const [src, setSrc] = useState<string>(() => cache.get(path) ?? path);
  useEffect(() => {
    if (cache.has(path)) {
      setSrc(cache.get(path)!);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(new URL(path, window.location.origin).href, { cache: "force-cache" });
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => reject(fr.error);
          fr.readAsDataURL(blob);
        });
        cache.set(path, dataUrl);
        if (alive) setSrc(dataUrl);
      } catch {
        /* keep the path */
      }
    })();
    return () => {
      alive = false;
    };
  }, [path]);
  return src;
}
