"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export type ProfileAvatarUploadProps = {
  initialUrl?: string | null;
  onUploaded?: (url: string | null) => void;
};

/**
 * Uploads to Storage bucket `signatures` at `{userId}/profile/...` and persists URL via `set_my_profile_image_url`.
 */
export function ProfileAvatarUpload({ initialUrl, onUploaded }: ProfileAvatarUploadProps) {
  const router = useRouter();
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
        setErr("Supabase is not configured.");
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        setErr("You must be signed in.");
        return;
      }
      setBusy(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${user.id}/profile/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("signatures").upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });
        if (upErr) throw new Error(upErr.message);
        const { data: pub } = supabase.storage.from("signatures").getPublicUrl(path);
        const publicUrl = pub.publicUrl;
        const { error: rpcErr } = await supabase.rpc("set_my_profile_image_url", { p_url: publicUrl });
        if (rpcErr) throw new Error(rpcErr.message);
        syncUrl(publicUrl);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [router, syncUrl],
  );

  const clear = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    setErr(null);
    try {
      const { error: rpcErr } = await supabase.rpc("set_my_profile_image_url", { p_url: "" });
      if (rpcErr) throw new Error(rpcErr.message);
      syncUrl(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not clear");
    } finally {
      setBusy(false);
    }
  }, [router, syncUrl]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 max-w-[900px]">
      <h3 className="text-sm font-bold text-gray-900">Profile picture</h3>
      <p className="text-xs text-gray-600 mt-1 mb-3">
        This photo appears in the header next to your account menu across OptiCore. Use a square image when possible.
        Max ~2 MB. Allowed: PNG, JPEG, WebP, GIF.
      </p>
      {err ? <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mb-2">{err}</p> : null}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative h-24 w-24 shrink-0 rounded-full border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400 px-2 text-center">No photo</span>
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
            {busy ? "Uploading…" : "Upload photo"}
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
