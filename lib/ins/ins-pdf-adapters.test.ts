import { describe, expect, it } from "vitest";
import { resolveInsPrintedSigners, insPrintedSignatureLines } from "./ins-pdf-adapters";
import type { InsSignatureSlot } from "./ins-signature-slots";

describe("resolveInsPrintedSigners", () => {
  it("prefers Campus Director image on Approved when both campus and DOI have images", () => {
    const slots: InsSignatureSlot[] = [
      {
        key: "approved",
        lineTitle: "Approved by",
        lineSubtitle: "DOI",
        signerName: "VPAA",
        imageUrl: "https://cdn.example/doi.png",
      },
      {
        key: "campus",
        lineTitle: "Campus Director",
        lineSubtitle: "Campus",
        signerName: "Campus Director",
        imageUrl: "https://cdn.example/campus.png",
      },
      {
        key: "prepared",
        lineTitle: "Prepared by",
        lineSubtitle: "College Admin",
        signerName: "Admin",
        imageUrl: "https://cdn.example/admin.png",
      },
    ];
    const printed = resolveInsPrintedSigners(slots);
    expect(printed.approved?.imageUrl).toBe("https://cdn.example/campus.png");
    expect(printed.prepared?.imageUrl).toBe("https://cdn.example/admin.png");
  });

  it("uses DOI config image on Approved when Campus Director has no image", () => {
    const slots: InsSignatureSlot[] = [
      {
        key: "approved",
        lineTitle: "Approved by",
        lineSubtitle: "DOI",
        signerName: "VPAA",
        imageUrl: "https://cdn.example/doi.png",
      },
      {
        key: "campus",
        lineTitle: "Campus Director",
        lineSubtitle: "Campus",
        signerName: "Campus Director",
        imageUrl: null,
      },
      {
        key: "prepared",
        lineTitle: "Prepared by",
        lineSubtitle: "College Admin",
        signerName: "Admin",
        imageUrl: "https://cdn.example/admin.png",
      },
    ];
    const lines = insPrintedSignatureLines(slots);
    expect(lines.find((l) => l.key === "approved")?.imageUrl).toBe("https://cdn.example/doi.png");
    expect(lines.find((l) => l.key === "prepared")?.imageUrl).toBe("https://cdn.example/admin.png");
  });
});
