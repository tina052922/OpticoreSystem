import type { InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import type { CollegeInsSignerDisplay } from "@/types/db";

/**
 * Merges optional display overrides onto resolved INS slots.
 * Campus (DOI) overrides apply first; college overrides apply second (college should omit `approved` if VPAA is campus-only).
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
  apply(campusDisplay);
  apply(collegeDisplay);
  return out;
}
