"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { collegeApi, doiApi, systemConfigApi, ApiClientError } from "@/lib/api/client";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import { notifySystemConfigurationSaved } from "@/contexts/SystemConfigurationContext";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_BYTES = 2 * 1024 * 1024;

type Kind = "doi" | "college";

export type SystemConfigElectronicSignatureCardProps = {
  kind: Kind;
  collegeId?: string | null;
};

/**
 * Official electronic signature for INS forms, stored in System Configuration
 * (campus-wide for DOI, per-college for College Admin).
 */
export function SystemConfigElectronicSignatureCard({
  kind,
  collegeId = null,
}: SystemConfigElectronicSignatureCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const title = kind === "doi" ? "DOI / VPAA electronic signature" : "College Admin electronic signature";
  const slot = kind === "doi" ? "Approved by (Director of Instruction / VPAA)" : "Prepared by (College Admin)";
  const empty = kind === "doi" ? "No DOI signature on file" : "No College Admin signature on file";
  const removeLabel = kind === "doi" ? "Remove DOI signature" : "Remove College Admin signature";

  const load = useCallback(async () => {
    try {
      if (kind === "doi") {
        const data = await systemConfigApi.get();
        setPreviewUrl(data.config.doiSignatureImageUrl?.trim() || null);
      } else {
        const data = await collegeApi.getSignerSettings({
          collegeId: collegeId ?? undefined,
        });
        setPreviewUrl(data.collegeAdminSignatureImageUrl?.trim() || null);
      }
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Could not load signature");
    }
  }, [kind, collegeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(file: File | null) {
    if (!file) return;
    setErr(null);
    if (file.size > MAX_BYTES) {
      setErr(`Image is too large (max ${Math.round(MAX_BYTES / (1024 * 1024))} MB).`);
      return;
    }
    setBusy(true);
    try {
      const data =
        kind === "doi"
          ? await doiApi.uploadElectronicSignature(file)
          : await collegeApi.uploadElectronicSignature(file, {
              collegeId: collegeId ?? undefined,
            });
      setPreviewUrl(data.url?.trim() || null);
      notifySystemConfigurationSaved("insSigners");
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
      if (kind === "doi") {
        await doiApi.clearElectronicSignature();
      } else {
        await collegeApi.clearElectronicSignature({
          collegeId: collegeId ?? undefined,
        });
      }
      setPreviewUrl(null);
      notifySystemConfigurationSaved("insSigners");
      dispatchInsCatalogReload();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Could not clear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-600">
        Upload a transparent PNG or JPG. This is the official image for the INS{" "}
        <span className="font-medium">{slot}</span> line after VPAA publishes the term. Max 2 MB.
      </p>
      {err ? <p className="mt-2 text-xs text-red-700">{err}</p> : null}

      <div className="mt-4">
        <label className="inline-flex flex-col gap-1 text-xs font-medium text-gray-700">
          Image file
          <input
            type="file"
            accept={ACCEPT}
            disabled={busy || (kind === "college" && !collegeId)}
            className="max-w-[280px] text-xs file:mr-2 file:rounded file:border-0 file:bg-[#FF990A] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void onFile(f);
            }}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="relative flex h-20 w-56 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={title} className="max-h-20 max-w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">{empty}</span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || !previewUrl}
          onClick={() => void onClear()}
        >
          {removeLabel}
        </Button>
      </div>
    </div>
  );
}
