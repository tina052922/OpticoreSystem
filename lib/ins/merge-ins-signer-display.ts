import type { InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import type { CollegeInsSignerDisplay } from "@/types/db";

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
      if (o.signerName != null && String(o.signerName).trim() !== "") {
        slot.signerName = String(o.signerName).trim();
      }
    }
  };
  apply(collegeDisplay);
  apply(campusDisplay);
  return out;
}
