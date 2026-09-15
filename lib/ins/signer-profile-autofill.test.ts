import { describe, expect, it } from "vitest";
import { insSignerSlotKeyForRole, withProfileSignerAutofill } from "./signer-profile-autofill";

describe("insSignerSlotKeyForRole", () => {
  it("maps signer roles to their INS slot", () => {
    expect(insSignerSlotKeyForRole("college_admin")).toBe("prepared");
    expect(insSignerSlotKeyForRole("chairman_admin")).toBe("review");
    expect(insSignerSlotKeyForRole("gec_chairman")).toBe("review");
    expect(insSignerSlotKeyForRole("doi_admin")).toBe("approved");
  });

  it("returns null for non-signer roles", () => {
    expect(insSignerSlotKeyForRole("instructor")).toBeNull();
    expect(insSignerSlotKeyForRole("student")).toBeNull();
    expect(insSignerSlotKeyForRole(null)).toBeNull();
  });
});

describe("withProfileSignerAutofill", () => {
  it("fills prepared name for college admin when empty", () => {
    const next = withProfileSignerAutofill(
      {},
      { role: "college_admin", name: "Vilia Gelaga" },
    );
    expect(next.prepared?.signerName).toBe("Vilia Gelaga");
  });

  it("does not overwrite a saved signer name", () => {
    const next = withProfileSignerAutofill(
      { prepared: { signerName: "Saved Name" } },
      { role: "college_admin", name: "Vilia Gelaga" },
    );
    expect(next.prepared?.signerName).toBe("Saved Name");
  });

  it("does not refill an intentionally cleared (empty) saved name", () => {
    const next = withProfileSignerAutofill(
      { prepared: { signerName: "" } },
      { role: "college_admin", name: "Vilia Gelaga" },
    );
    expect(next.prepared?.signerName).toBe("");
  });

  it("leaves empty when profile name is missing", () => {
    const next = withProfileSignerAutofill({}, { role: "college_admin", name: "  " });
    expect(next.prepared).toBeUndefined();
  });
});
