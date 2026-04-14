"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Q } from "@/lib/supabase/catalog-columns";
import { INS_CATALOG_RELOAD_EVENT } from "@/lib/ins/ins-catalog-reload";
import type { CampusInsSettings } from "@/types/db";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/**
 * DOI-only: upload the single campus-wide Campus Director digital signature (INS — all colleges).
 * Stored in `CampusInsSettings` (not per college).
 */
export function DoiCampusDirectorSignatureCard() {
  const [row, setRow] = useState<CampusInsSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("CampusInsSettings")
      .select(Q.campusInsSettings)
      .eq("id", "default")
      .maybeSingle();
    if (error) {
      setErr(error.message);
      return;
    }
    setRow((data as CampusInsSettings) ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewUrl = row?.campusDirectorSignatureImageUrl?.trim() || null;

  async function onFile(file: File | null) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/doi/campus-director-signature", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Upload failed");
      await load();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(INS_CATALOG_RELOAD_EVENT));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/doi/campus-director-signature", { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Could not clear");
      await load();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(INS_CATALOG_RELOAD_EVENT));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not clear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 max-w-[900px] rounded-xl border border-gray-200 bg-white p-4 md:p-5">
      <h3 className="text-sm font-bold text-gray-900">Campus Director signature (campus-wide)</h3>
      <p className="mt-1 text-xs text-gray-600">
        One official Campus Director image for the whole campus. It appears on <strong>INS Form 5B</strong> and the
        Campus Director column on other INS forms after the term is published. Separate from your personal DOI
        signature above. Only DOI admins can change this.
      </p>
      {err ? <p className="mt-2 text-xs text-red-700">{err}</p> : null}

      <div className="mt-4">
        <label className="inline-flex flex-col gap-1 text-xs font-medium text-gray-700">
          Image file
          <input
            type="file"
            accept={ACCEPT}
            disabled={busy}
            className="max-w-[280px] text-xs file:mr-2 file:rounded file:border-0 file:bg-[#FF990A] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="relative flex h-20 w-56 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Campus Director signature" className="max-h-20 max-w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">No campus-wide signature on file</span>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={busy || !previewUrl} onClick={() => void onClear()}>
          Remove campus signature
        </Button>
      </div>
    </div>
  );
}
