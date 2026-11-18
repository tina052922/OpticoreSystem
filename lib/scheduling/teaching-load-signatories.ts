import { resolveInsSignatureSlots } from "@/lib/ins/ins-signature-slots";
import type { College, CollegeInsSignerDisplay, User } from "@/types/db";
import type { TeachingLoadCategoryGroup } from "@/lib/scheduling/teaching-load-summary";

/**
 * Signature block of the printed Summary of Teaching Load (as on the college's paper form):
 *
 *   Prepared by:            each department's Chairperson ("Chairperson, BSIT")
 *   Noted by:               the college Dean
 *   Recommending Approval:  the Dean of Instruction (DOI)
 *   Approved by:            the Campus Director
 *
 * Names come from the same places as the INS forms' signatures: the accounts (Program Chairman,
 * DOI, the college's linked Campus Director) with System Configuration → INS form signatories
 * filling in or overriding them (the Dean has no account, so it comes from there).
 */
export type TeachingLoadSigner = {
  name: string;
  title: string;
  /** E-signature drawn over the name (System Configuration / the signer's own upload); null = none. */
  imageUrl?: string | null;
};

export type TeachingLoadSignatories = {
  preparedBy: TeachingLoadSigner[];
  notedBy: TeachingLoadSigner;
  recommendingApproval: TeachingLoadSigner;
  approvedBy: TeachingLoadSigner;
};

const BLANK = "________________________";

export function buildTeachingLoadSignatories(args: {
  college: College | null;
  groups: TeachingLoadCategoryGroup[];
  users: User[];
  campusInsSignerDisplay?: CollegeInsSignerDisplay | null;
  /** System Configuration e-signatures (DOI, Campus Director). */
  doiSignatureImageUrl?: string | null;
  campusDirectorSignatureImageUrl?: string | null;
}): TeachingLoadSignatories {
  const { college, groups, users } = args;
  const userById = new Map(users.map((u) => [u.id, u]));
  const slots =
    resolveInsSignatureSlots({
      college,
      programId: null,
      users,
      userById,
      scheduleApproved: true,
      includeImages: true,
      campusWideDirectorSignatureUrl: args.campusDirectorSignatureImageUrl ?? null,
      doiSignatureImageUrl: args.doiSignatureImageUrl ?? null,
      campusInsSignerDisplay: args.campusInsSignerDisplay ?? null,
      collegeInsSignerDisplay: college?.insSignerDisplay ?? null,
    }) ?? [];
  const slotImage = (key: string) => slots.find((s) => s.key === key)?.imageUrl?.trim() || null;
  const slotName = (key: string, fallback = BLANK) => {
    const n = slots.find((s) => s.key === key)?.signerName?.trim();
    return n && n !== "—" ? n : fallback;
  };

  const preparedBy: TeachingLoadSigner[] = [];
  const seen = new Set<string>();
  for (const g of groups) {
    // A service-area group (General Subject instructors) is prepared by that area's Service Chair.
    const chair = g.serviceAreaId
      ? users.find((u) => u.role === "gec_chairman" && u.serviceAreaId === g.serviceAreaId)
      : users.find((u) => u.role === "chairman_admin" && u.chairmanProgramId === g.programId);
    const code = g.serviceAreaId ? g.categoryLabel : g.programCode || g.categoryLabel;
    const key = chair?.id ?? `none:${g.programId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    preparedBy.push({
      name: chair?.name?.trim() || BLANK,
      title: g.serviceAreaId ? `Service Chair, ${code}` : `Chairperson, ${code}`,
      imageUrl: chair?.signatureImageUrl?.trim() || null,
    });
  }

  const collegeCode = college?.code?.trim();
  return {
    preparedBy,
    notedBy: { name: slotName("dean"), title: collegeCode ? `Dean, ${collegeCode}` : "Dean", imageUrl: slotImage("dean") },
    recommendingApproval: { name: slotName("approved"), title: "Dean of Instruction", imageUrl: slotImage("approved") },
    approvedBy: { name: slotName("campus"), title: "Campus Director", imageUrl: slotImage("campus") },
  };
}

/** "A", "B", … "Z", "AA" — the letter before each department heading. */
export function departmentLetter(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** "A. BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY" (full program name when known). */
export function departmentHeading(group: TeachingLoadCategoryGroup, index: number): string {
  const name = (group.programName || group.categoryLabel || "").trim();
  return `${departmentLetter(index)}. ${name.toUpperCase()}`;
}
