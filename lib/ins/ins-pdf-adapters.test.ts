import { describe, expect, it } from "vitest";
import { resolveInsPrintedSigners, insPrintedSignatureLines } from "./ins-pdf-adapters";
import type { InsSignatureSlot } from "./ins-signature-slots";

describe("resolveInsPrintedSigners", () => {
  const fullStrip: InsSignatureSlot[] = [
    {
      key: "approved",
      lineTitle: "Approved by",
      lineSubtitle: "DOI",
      signerName: "VPAA Person",
      imageUrl: "https://cdn.example/doi.png",
    },
    {
      key: "campus",
      lineTitle: "Campus Director",
      lineSubtitle: "Campus",
      signerName: "Campus Director Name",
      imageUrl: "https://cdn.example/campus.png",
    },
    {
      key: "dean",
      lineTitle: "Dean",
      lineSubtitle: "College Dean",
      signerName: "Dean Name",
      imageUrl: null,
    },
    {
      key: "review",
      lineTitle: "Reviewed & Certified by",
      lineSubtitle: "Program Chairman",
      signerName: "Chair Name",
      // Authoritative account name — what should print on 'Prepared by'.
      accountName: "Chair Name",
      imageUrl: "https://cdn.example/chair.png",
    },
    {
      key: "prepared",
      lineTitle: "Prepared by",
      lineSubtitle: "College Admin",
      signerName: "Admin Name",
      imageUrl: "https://cdn.example/admin.png",
    },
  ];

  it("maps paper roles: Prepared=Chairman, Reviewed=DOI name+ink, Approved=Campus Director", () => {
    const printed = resolveInsPrintedSigners(fullStrip);
    // Prepared line goes to the Program Chairman when they are resolved
    // (name + their own uploaded signature). College Admin is the fallback.
    expect(printed.prepared?.signerName).toBe("Chair Name");
    expect(printed.prepared?.imageUrl).toBe("https://cdn.example/chair.png");
    expect(printed.review?.signerName).toBe("VPAA Person");
    expect(printed.review?.imageUrl).toBe("https://cdn.example/doi.png");
    expect(printed.approved?.signerName).toBe("Campus Director Name");
    expect(printed.approved?.imageUrl).toBe("https://cdn.example/campus.png");
  });

  it("shows DOI e-signature on Reviewed when no dean image is configured", () => {
    const slots = fullStrip.filter((s) => s.key !== "dean");
    const lines = insPrintedSignatureLines(slots);
    const reviewed = lines.find((l) => l.key === "reviewed");
    expect(reviewed?.imageUrl).toBe("https://cdn.example/doi.png");
    expect(reviewed?.signerName).toBe("VPAA Person");
    expect(reviewed?.lineSubtitle).toBe("Director/Dean");
  });

  it("does not put DOI image on the Campus Director Approved line", () => {
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
    ];
    const printed = resolveInsPrintedSigners(slots);
    expect(printed.approved?.signerName).toBe("Campus Director");
    expect(printed.approved?.imageUrl).toBeNull();
    expect(printed.review?.imageUrl).toBe("https://cdn.example/doi.png");
  });

  it("falls Prepared back to College Admin when the chairman slot has no name", () => {
    const slots = fullStrip.filter((s) => s.key !== "review");
    const printed = resolveInsPrintedSigners(slots);
    expect(printed.prepared?.signerName).toBe("Admin Name");
    expect(printed.prepared?.imageUrl).toBe("https://cdn.example/admin.png");
  });

  it("keeps chairman name on Prepared even without an uploaded signature", () => {
    // Chairman is resolved (accountName from their User row) but hasn't
    // uploaded a profile signature yet; the College Admin HAS uploaded one.
    // We must still print the chairman's name — with no image — rather than
    // borrow the College Admin's landscape signature under a different
    // person's name.
    const slots: InsSignatureSlot[] = [
      {
        key: "review",
        lineTitle: "Reviewed & Certified by",
        lineSubtitle: "Program Chairman",
        signerName: "Chair Name",
        accountName: "Chair Name",
        imageUrl: null,
      },
      {
        key: "prepared",
        lineTitle: "Prepared by",
        lineSubtitle: "College Admin",
        signerName: "Admin Name",
        imageUrl: "https://cdn.example/admin-landscape.png",
      },
    ];
    const printed = resolveInsPrintedSigners(slots);
    expect(printed.prepared?.signerName).toBe("Chair Name");
    expect(printed.prepared?.imageUrl).toBeNull();
  });

  it("uses the chairman's account name over any editor display override", () => {
    // A College Admin typed a different name into the 'Program Chairman'
    // row of INS form signatories, which would land on `review.signerName`.
    // The printed Prepared line must ignore that and use the chairman's
    // authoritative `accountName` instead.
    const slots: InsSignatureSlot[] = [
      {
        key: "review",
        lineTitle: "Reviewed & Certified by",
        lineSubtitle: "Program Chairman",
        // What an editor override would produce after mergeInsSignerDisplay.
        signerName: "TOTALLY DIFFERENT NAME",
        // What the chairman's User.name actually is.
        accountName: "Dr. Real Chairman",
        imageUrl: "https://cdn.example/chair.png",
      },
      {
        key: "prepared",
        lineTitle: "Prepared by",
        lineSubtitle: "College Admin",
        signerName: "Admin Name",
        imageUrl: "https://cdn.example/admin.png",
      },
    ];
    const printed = resolveInsPrintedSigners(slots);
    expect(printed.prepared?.signerName).toBe("Dr. Real Chairman");
    expect(printed.prepared?.imageUrl).toBe("https://cdn.example/chair.png");
  });

  it("falls back to the College Admin slot when the chairman has no accountName", () => {
    // Chairman slot may have a display override but no `accountName` — that
    // means no chairman was resolved for this college/program. Print the
    // College Admin instead of using the stale display text.
    const slots: InsSignatureSlot[] = [
      {
        key: "review",
        lineTitle: "Reviewed & Certified by",
        lineSubtitle: "Program Chairman",
        signerName: "Stale Editor Text",
        accountName: null,
        imageUrl: null,
      },
      {
        key: "prepared",
        lineTitle: "Prepared by",
        lineSubtitle: "College Admin",
        signerName: "Admin Name",
        imageUrl: "https://cdn.example/admin.png",
      },
    ];
    const printed = resolveInsPrintedSigners(slots);
    expect(printed.prepared?.signerName).toBe("Admin Name");
    expect(printed.prepared?.imageUrl).toBe("https://cdn.example/admin.png");
  });

  it("prints fixed paper titles on the three lines", () => {
    const lines = insPrintedSignatureLines(fullStrip);
    expect(lines.map((l) => l.lineTitle)).toEqual([
      "Prepared by:",
      "Reviewed, Certified True and Correct:",
      "Approved:",
    ]);
    expect(lines.map((l) => l.lineSubtitle)).toEqual([
      "Program Coordinator/Chair",
      "Director/Dean",
      "Campus Director",
    ]);
    expect(lines.map((l) => l.signerName)).toEqual([
      "Chair Name",
      "VPAA Person",
      "Campus Director Name",
    ]);
    expect(lines.find((l) => l.key === "prepared")?.imageUrl).toBe(
      "https://cdn.example/chair.png",
    );
    expect(lines.find((l) => l.key === "reviewed")?.imageUrl).toBe(
      "https://cdn.example/doi.png",
    );
  });

  it("uses System Configuration names on Reviewed/Approved but not on Prepared", () => {
    // System Configuration display overrides win for DOI/Campus rows. On the
    // Prepared line, only the chairman's own `accountName` counts — a display
    // override on `review` alone (no accountName) does NOT land on Prepared.
    // Prepared falls through to the College Admin (`prepared`) fallback here.
    const slots: InsSignatureSlot[] = [
      {
        key: "approved",
        lineTitle: "Approved by",
        lineSubtitle: "DOI",
        signerName: "Configured DOI Name",
        imageUrl: "https://cdn.example/doi.png",
      },
      {
        key: "campus",
        lineTitle: "Campus Director",
        lineSubtitle: "Campus",
        signerName: "Configured Campus Name",
        imageUrl: null,
      },
      {
        key: "review",
        lineTitle: "Reviewed",
        lineSubtitle: "Chair",
        signerName: "Configured Chair Name",
        accountName: null,
        imageUrl: null,
      },
      {
        key: "prepared",
        lineTitle: "Prepared by",
        lineSubtitle: "College Admin",
        signerName: "Configured College Admin Name",
        imageUrl: "https://cdn.example/college-admin.png",
      },
    ];
    const lines = insPrintedSignatureLines(slots);
    expect(lines.find((l) => l.key === "prepared")?.signerName).toBe(
      "Configured College Admin Name",
    );
    expect(lines.find((l) => l.key === "prepared")?.imageUrl).toBe(
      "https://cdn.example/college-admin.png",
    );
    expect(lines.find((l) => l.key === "reviewed")?.signerName).toBe(
      "Configured DOI Name",
    );
    expect(lines.find((l) => l.key === "approved")?.signerName).toBe(
      "Configured Campus Name",
    );
  });

  it("fills blank signatory names with paper-role defaults", () => {
    const lines = insPrintedSignatureLines([]);
    expect(lines.map((l) => l.signerName)).toEqual([
      "Program Coordinator/Chair",
      "Director/Dean",
      "Campus Director",
    ]);
  });

  it("treats em-dash placeholders as blank and applies defaults", () => {
    const slots: InsSignatureSlot[] = [
      {
        key: "campus",
        lineTitle: "Campus Director",
        lineSubtitle: "Campus",
        signerName: "—",
        imageUrl: null,
      },
      {
        key: "prepared",
        lineTitle: "Prepared by",
        lineSubtitle: "College Admin",
        signerName: "—",
        imageUrl: null,
      },
    ];
    const lines = insPrintedSignatureLines(slots);
    expect(lines.find((l) => l.key === "prepared")?.signerName).toBe(
      "Program Coordinator/Chair",
    );
    expect(lines.find((l) => l.key === "approved")?.signerName).toBe(
      "Campus Director",
    );
  });
});
