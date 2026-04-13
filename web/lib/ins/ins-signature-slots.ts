import type { College, User } from "@/types/db";

export type InsSignatureSlot = {
  key: string;
  /** Primary line (exact order for INS) */
  lineTitle: string;
  /** Role hint under signature */
  lineSubtitle: string;
  signerName: string;
  imageUrl: string | null;
};

/**
 * INS vertical signature strip — order:
 * 1 Approved by (DOI)
 * 2 Campus Director
 * 3 Reviewed & Certified (Program / GEC Chairman)
 * 4 Contract
 * 5 Prepared by (College Admin)
 */
export function buildInsSignatureSlots(args: {
  college: College | null;
  programId: string | null;
  users: User[];
  userById: Map<string, User>;
  scheduleApproved: boolean;
}): InsSignatureSlot[] | null {
  if (!args.scheduleApproved) return null;

  const { college, programId, users, userById } = args;
  const collegeId = college?.id ?? null;

  const doi =
    users.filter((u) => u.role === "doi_admin").sort((a, b) => a.name.localeCompare(b.name))[0] ?? null;

  const campusDirector = college?.campusDirectorUserId
    ? userById.get(college.campusDirectorUserId) ?? null
    : null;

  const chairman =
    collegeId != null
      ? users.find(
          (u) =>
            u.role === "chairman_admin" &&
            u.collegeId === collegeId &&
            (programId ? u.chairmanProgramId === programId : true),
        ) ??
        users.find((u) => u.role === "gec_chairman" && u.collegeId === collegeId) ??
        null
      : null;

  const contractSigner = college?.contractSignerUserId
    ? userById.get(college.contractSignerUserId) ?? null
    : null;

  const collegeAdmin =
    collegeId != null
      ? users
          .filter((u) => u.role === "college_admin" && u.collegeId === collegeId)
          .sort((a, b) => a.name.localeCompare(b.name))[0] ?? null
      : null;

  const slot = (
    key: string,
    lineTitle: string,
    lineSubtitle: string,
    u: User | null,
  ): InsSignatureSlot => ({
    key,
    lineTitle,
    lineSubtitle,
    signerName: u?.name ?? "—",
    imageUrl: u?.signatureImageUrl?.trim() || null,
  });

  return [
    slot("approved", "Approved by", "Director of Instruction / VPAA", doi),
    slot("campus", "Campus Director", "Campus", campusDirector),
    slot("review", "Reviewed & Certified by", "Program / GEC Chairman", chairman),
    slot("contract", "Contract", "Authorized signatory", contractSigner),
    slot("prepared", "Prepared by", "College Admin", collegeAdmin),
  ];
}
