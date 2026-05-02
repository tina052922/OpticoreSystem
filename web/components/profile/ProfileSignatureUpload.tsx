"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

export type ProfileSignatureUploadProps = {
  /** Current public URL from User.signatureImageUrl */
  initialUrl?: string | null;
  onUploaded?: (url: string | null) => void;
};

/**
 * Uploads to Storage bucket `signatures/{userId}/...` and persists URL via RPC `set_my_signature_image_url`.
 */
export function ProfileSignatureUpload({ initialUrl, onUploaded }: ProfileSignatureUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl?.trim() || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const syncUrl = useCallback(
    (next: string | null) => {
      setUrl(next);
      onUploaded?.(next);
    },
    [onUploaded],
  );

  const upload = useCallback(
    async (file: File) => {
      setErr(null);
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setErr("Connection is not configured.");
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        setErr("You must be signed in.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setErr(`Image is too large (max ${Math.round(MAX_BYTES / (1024 * 1024))} MB).`);
        return;
      }
      setBusy(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("signatures").upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });
        if (upErr) throw new Error(upErr.message);
        const { data: pub } = supabase.storage.from("signatures").getPublicUrl(path);
        const publicUrl = pub.publicUrl;
        const { error: rpcErr } = await supabase.rpc("set_my_signature_image_url", { p_url: publicUrl });
        if (rpcErr) throw new Error(rpcErr.message);
        syncUrl(publicUrl);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [syncUrl],
  );

  const clear = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    setErr(null);
    try {
      const { error: rpcErr } = await supabase.rpc("set_my_signature_image_url", { p_url: "" });
      if (rpcErr) throw new Error(rpcErr.message);
      syncUrl(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not clear");
    } finally {
      setBusy(false);
    }
  }, [syncUrl]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 max-w-[900px]">
      <h3 className="text-sm font-bold text-gray-900">Digital signature (INS forms)</h3>
      <p className="text-xs text-gray-600 mt-1 mb-3">
        Upload a transparent PNG or JPG of your signature. It appears on INS schedules after the term is approved by
        VPAA / DOI. Max 10 MB. Allowed: PNG, JPEG, WebP, GIF.
      </p>
      {err ? <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mb-2">{err}</p> : null}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative h-20 w-48 border border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL
            <img src={url} alt="Your signature" className="max-h-20 max-w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">No signature yet</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : "Upload signature"}
          </Button>
          {url ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void clear()}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
