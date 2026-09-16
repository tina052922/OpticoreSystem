import { describe, expect, it } from "vitest";
import { mergeInsSignerDisplay } from "./merge-ins-signer-display";
import type { InsSignatureSlot } from "./ins-signature-slots";

const slots: InsSignatureSlot[] = [
  {
    key: "campus",
    lineTitle: "Campus Director",
    lineSubtitle: "Campus",
    signerName: "",
    imageUrl: null,
  },
  {
    key: "dean",
    lineTitle: "Dean",
    lineSubtitle: "College Dean",
    signerName: "—",
    imageUrl: null,
  },
];

describe("mergeInsSignerDisplay", () => {
  it("applies configured names without throwing when a slot is empty", () => {
    const merged = mergeInsSignerDisplay(
      slots,
      { campus: { signerName: "Dr. Campus", lineSubtitle: "Campus Director" } },
      { dean: { signerName: "", lineSubtitle: "" } },
    );
    expect(merged?.[0]?.signerName).toBe("Dr. Campus");
    expect(merged?.[1]?.signerName).toBe("—");
  });

  it("lets DOI System Configuration win over college placeholders on campus", () => {
    const merged = mergeInsSignerDisplay(
      slots,
      { campus: { signerName: "Dr. Engilbert Benolirao" } },
      { campus: { signerName: "Mr. Campus Director" }, dean: { signerName: "MS. DEAN" } },
    );
    expect(merged?.find((s) => s.key === "campus")?.signerName).toBe(
      "Dr. Engilbert Benolirao",
    );
    expect(merged?.find((s) => s.key === "dean")?.signerName).toBe("MS. DEAN");
  });

  it("returns the original slots when both displays are missing", () => {
    expect(mergeInsSignerDisplay(slots, null, undefined)?.length).toBe(2);
    expect(mergeInsSignerDisplay(null, {}, {})).toBeNull();
  });
});
