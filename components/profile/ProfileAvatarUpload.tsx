"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiClientError, profileApi } from "@/lib/api/client";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_BYTES = 2 * 1024 * 1024;

export type ProfileAvatarUploadProps = {
  initialUrl?: string | null;
  onUploaded?: (url: string | null) => void;
};

/**
 * Avatar upload — POSTs the file to the Express backend
 * (`/api/profile/avatar`) which writes it to the `signatures` storage
 * bucket and persists the public URL on `User.profileImageUrl`. No
 * browser-side Supabase client involvement.
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
      if (file.size > MAX_BYTES) {
        setErr(`Image is too large (max ${Math.round(MAX_BYTES / (1024 * 1024))} MB).`);
        return;
      }
      setBusy(true);
      try {
        const { url: publicUrl } = await profileApi.uploadAvatar(file);
        syncUrl(publicUrl ?? null);
        router.refresh();
      } catch (e) {
        setErr(
          e instanceof ApiClientError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Upload failed",
        );
      } finally {
        setBusy(false);
      }
    },
    [router, syncUrl],
  );

  const clear = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      await profileApi.clearAvatar();
      syncUrl(null);
      router.refresh();
    } catch (e) {
      setErr(
        e instanceof ApiClientError ? e.message : "Could not clear",
      );
    } finally {
      setBusy(false);
    }
  }, [router, syncUrl]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 max-w-[900px]">
      <h3 className="text-sm font-bold text-gray-900">Profile picture</h3>
      <p className="text-xs text-gray-600 mt-1 mb-3">
        This photo appears in the header next to your account menu across OptiCore. Use a square image when possible.
        Max 2 MB. Allowed: PNG, JPEG, WebP, GIF.
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
