import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPdfImageEmbedCacheForTests,
  embedImageUrlForPdf,
  embedSignatureSlotImagesForPdf,
} from "./embed-image-urls";

describe("embedImageUrlForPdf", () => {
  afterEach(() => {
    clearPdfImageEmbedCacheForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("passes through same-origin and data URLs", async () => {
    expect(await embedImageUrlForPdf("/images/sig.png")).toBe("/images/sig.png");
    expect(await embedImageUrlForPdf("data:image/png;base64,AAA")).toBe("data:image/png;base64,AAA");
    expect(await embedImageUrlForPdf(null)).toBe(null);
  });

  it("converts remote http(s) images to data URLs for react-pdf", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(bytes, {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
      ),
    );

    const out = await embedImageUrlForPdf("https://cdn.example/signature.png");
    expect(out?.startsWith("data:image/png;base64,")).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://cdn.example/signature.png",
      expect.objectContaining({ mode: "cors", credentials: "omit" }),
    );
  });

  it("embeds each slot imageUrl in a signature strip", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
      ),
    );

    const next = await embedSignatureSlotImagesForPdf([
      {
        key: "prepared",
        lineTitle: "Prepared by:",
        lineSubtitle: "Chair",
        signerName: "Admin",
        imageUrl: "https://cdn.example/a.png",
      },
      {
        key: "approved",
        lineTitle: "Approved:",
        lineSubtitle: "Campus Director",
        signerName: "Director",
        imageUrl: null,
      },
    ]);

    expect(next?.[0]?.imageUrl?.startsWith("data:")).toBe(true);
    expect(next?.[1]?.imageUrl).toBe(null);
  });
});
