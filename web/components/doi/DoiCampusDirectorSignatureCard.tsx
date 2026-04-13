"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { INS_CATALOG_RELOAD_EVENT } from "@/lib/ins/ins-catalog-reload";
import type { College } from "@/types/db";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/**
 * DOI-only: upload the Campus Director digital signature used on INS Form 5B (By Section).
 * Stored on `College.campusDirectorSignatureImageUrl` (not the CD user profile).
 */
export function DoiCampusDirectorSignatureCard() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeId, setCollegeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { data, error } = await supabase.from("College").select("*").order("name");
    if (error) {
      setErr(error.message);
      return;
    }
    setColleges((data as College[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = colleges.find((c) => c.id === collegeId) ?? null;
  const previewUrl = selected?.campusDirectorSignatureImageUrl?.trim() || null;

  async function onFile(file: File | null) {
    if (!file || !collegeId) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("collegeId", collegeId);
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
    if (!collegeId) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/doi/campus-director-signature?collegeId=${encodeURIComponent(collegeId)}`, {
        method: "DELETE",
      });
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
      <h3 className="text-sm font-bold text-gray-900">Campus Director signature (INS — By Section)</h3>
      <p className="mt-1 text-xs text-gray-600">
        Upload the official Campus Director image for each college. It appears on <strong>INS Form 5B</strong> after the
        term is published. This is separate from your personal DOI signature above. Only DOI admins can change this.
      </p>
      {err ? <p className="mt-2 text-xs text-red-700">{err}</p> : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-gray-700">
          College
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            disabled={busy}
          >
            <option value="">Select college…</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex flex-col gap-1 text-xs font-medium text-gray-700">
          Image file
          <input
            type="file"
            accept={ACCEPT}
            disabled={busy || !collegeId}
            className="max-w-[220px] text-xs file:mr-2 file:rounded file:border-0 file:bg-[#FF990A] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
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
            <span className="text-xs text-gray-400">No college signature on file</span>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={busy || !collegeId || !previewUrl} onClick={() => void onClear()}>
          Remove for this college
        </Button>
      </div>
    </div>
  );
}
