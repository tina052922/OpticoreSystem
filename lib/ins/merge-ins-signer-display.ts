import type { InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import type { CollegeInsSignerDisplay } from "@/types/db";

/**
 * Slots whose printed NAME comes from the account and may not be overridden.
 *
 * `approved` is the DOI / VPAA line. The DOI signs in as themselves, so the name on the form is
 * their account name — the same rule the Program Chairman's "Prepared by" line already follows.
 * Letting an editor field win here meant the printed reviewer could be any text someone typed, and
 * a name saved once kept printing after the role changed hands.
 *
 * The TITLE is still overridable: that is a label for the line, not a claim about who signed it.
 */
const ACCOUNT_NAME_SLOTS = new Set(["approved"]);

/**
 * Merges optional display overrides onto resolved INS slots.
 *
 * College overrides apply first; DOI / campus System Configuration applies
 * second so VPAA / Campus Director names saved under DOI → INS form signatories
 * always win over leftover college placeholders (e.g. "MS. DEAN").
 */
export function mergeInsSignerDisplay(
  slots: InsSignatureSlot[] | null,
  campusDisplay: CollegeInsSignerDisplay | null | undefined,
  collegeDisplay: CollegeInsSignerDisplay | null | undefined,
): InsSignatureSlot[] | null {
  if (!slots?.length) return slots;
  const out = slots.map((s) => ({ ...s }));
  const apply = (src: CollegeInsSignerDisplay | null | undefined) => {
    if (!src) return;
    for (const slot of out) {
      const o = src[slot.key];
      if (!o) continue;
      if (o.lineSubtitle != null && String(o.lineSubtitle).trim() !== "") {
        slot.lineSubtitle = String(o.lineSubtitle).trim();
      }
      if (
        o.signerName != null &&
        String(o.signerName).trim() !== "" &&
        !ACCOUNT_NAME_SLOTS.has(slot.key)
      ) {
        slot.signerName = String(o.signerName).trim();
      }
    }
  };
  apply(collegeDisplay);
  apply(campusDisplay);
  return out;
}
