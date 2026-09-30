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

  /**
   * The DOI / VPAA line prints the signed-in DOI's own account name. There is no editor field for
   * it any more, but rows saved before that was true are still in the database, and they must not
   * keep renaming the reviewer on printed forms.
   */
  describe("the DOI / VPAA line", () => {
    const withApproved: InsSignatureSlot[] = [
      {
        key: "approved",
        lineTitle: "Approved by",
        lineSubtitle: "Director of Instruction / VPAA",
        signerName: "Dr. Actual DOI",
        accountName: "Dr. Actual DOI",
        imageUrl: "https://cdn.example/doi.png",
      },
      ...slots,
    ];

    it("keeps the account name even when a stored override says otherwise", () => {
      const merged = mergeInsSignerDisplay(
        withApproved,
        { approved: { signerName: "Dr. Maria Elena Reyes" } },
        { approved: { signerName: "Someone Else" } },
      );
      expect(merged?.find((s) => s.key === "approved")?.signerName).toBe("Dr. Actual DOI");
    });

    it("still lets the title be relabelled", () => {
      // The subtitle labels the line; it makes no claim about who signed it.
      const merged = mergeInsSignerDisplay(
        withApproved,
        { approved: { signerName: "Ignored", lineSubtitle: "DOI" } },
        null,
      );
      const approved = merged?.find((s) => s.key === "approved");
      expect(approved?.lineSubtitle).toBe("DOI");
      expect(approved?.signerName).toBe("Dr. Actual DOI");
    });

    it("leaves every other slot overridable", () => {
      const merged = mergeInsSignerDisplay(
        withApproved,
        { approved: { signerName: "Ignored" }, campus: { signerName: "Dr. Campus" } },
        { dean: { signerName: "MS. DEAN" } },
      );
      expect(merged?.find((s) => s.key === "campus")?.signerName).toBe("Dr. Campus");
      expect(merged?.find((s) => s.key === "dean")?.signerName).toBe("MS. DEAN");
    });

    it("does not invent a name when no DOI account resolved", () => {
      // buildInsSignatureSlots uses "—" for an unresolved signer; an override must not fill it in,
      // or a form would name a reviewer who does not hold the role.
      const unresolved: InsSignatureSlot[] = [
        { ...withApproved[0]!, signerName: "—", accountName: null },
      ];
      const merged = mergeInsSignerDisplay(unresolved, { approved: { signerName: "Dr. Ghost" } }, null);
      expect(merged?.[0]?.signerName).toBe("—");
    });
  });
});
