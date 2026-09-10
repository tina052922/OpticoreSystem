/**
 * react-pdf's <Image> often fails silently on cross-origin storage URLs (Supabase).
 * Convert remote images to data URLs so INS PDF preview/print always embeds them.
 */

const cache = new Map<string, string>();

function isHttpUrl(src: string): boolean {
  return /^https?:\/\//i.test(src.trim());
}

function isAlreadyEmbedded(src: string): boolean {
  const t = src.trim();
  return t.startsWith("data:") || t.startsWith("blob:") || t.startsWith("/");
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  const type = mime && mime.startsWith("image/") ? mime : "image/png";
  if (typeof Buffer !== "undefined") {
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return `data:${type};base64,${btoa(binary)}`;
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  const hit = cache.get(url);
  if (hit) return hit;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" });
    if (!res.ok) return null;
    const mime = (res.headers.get("content-type") || "image/png").split(";")[0]!.trim();
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) return null;
    const dataUrl = bytesToDataUrl(new Uint8Array(buf), mime);
    cache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

/** Resolve one image URL for react-pdf (data URL when remote). */
export async function embedImageUrlForPdf(src: string | null | undefined): Promise<string | null> {
  const t = src?.trim() || "";
  if (!t) return null;
  if (isAlreadyEmbedded(t) && !isHttpUrl(t)) return t;
  if (!isHttpUrl(t)) return t;
  return (await fetchAsDataUrl(t)) ?? t;
}

export type WithImageUrl = { imageUrl: string | null };

/** Embed every slot's `imageUrl` for PDF rendering. Preserves slot identity. */
export async function embedSignatureSlotImagesForPdf<T extends WithImageUrl>(
  slots: T[] | null | undefined,
): Promise<T[] | undefined> {
  if (!slots?.length) return undefined;
  return Promise.all(
    slots.map(async (slot) => {
      const imageUrl = await embedImageUrlForPdf(slot.imageUrl);
      return { ...slot, imageUrl };
    }),
  );
}

/** Test helper — clears the in-memory embed cache. */
export function clearPdfImageEmbedCacheForTests(): void {
  cache.clear();
}
