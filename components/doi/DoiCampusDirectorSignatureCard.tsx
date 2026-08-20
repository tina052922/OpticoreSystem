"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { doiApi, systemConfigApi, ApiClientError } from "@/lib/api/client";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/**
 * DOI-only: upload the single campus-wide Campus Director digital signature (INS — all colleges).
 * Stored in `CampusInsSettings` (not per college).
 */
export function DoiCampusDirectorSignatureCard() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await systemConfigApi.get();
      setPreviewUrl(data.config.campusDirectorSignatureImageUrl?.trim() || null);
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Could not load settings");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(file: File | null) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const data = await doiApi.uploadCampusDirectorSignature(file);
      setPreviewUrl(data.url?.trim() || null);
      dispatchInsCatalogReload();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    setErr(null);
    setBusy(true);
    try {
      await doiApi.clearCampusDirectorSignature();
      setPreviewUrl(null);
      dispatchInsCatalogReload();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Could not clear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 max-w-[900px] rounded-xl border border-gray-200 bg-white p-4 md:p-5">
      <h3 className="text-sm font-bold text-gray-900">Campus Director signature image</h3>
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
