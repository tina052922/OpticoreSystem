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

export type InsSignatureSlotMode = "full" | "sectionCampusOnly";

/** DOI-uploaded campus-wide image, then linked Campus Director user profile. */
function campusDirectorSignatureUrl(
  campusWideDirectorSignatureUrl: string | null | undefined,
  campusDirectorUser: User | null,
): string | null {
  const doiUploaded = campusWideDirectorSignatureUrl?.trim();
  if (doiUploaded) return doiUploaded;
  return campusDirectorUser?.signatureImageUrl?.trim() || null;
}

/**
 * INS vertical signature strip — order (full mode):
 * 1 Approved by (DOI)
 * 2 Campus Director
 * 3 Reviewed & Certified (Program / GEC Chairman)
 * 4 Contract
 * 5 Prepared by (College Admin)
 *
 * `sectionCampusOnly`: single column — Campus Director approval (Form 5B).
 */
export function buildInsSignatureSlots(args: {
  college: College | null;
  programId: string | null;
  users: User[];
  userById: Map<string, User>;
  scheduleApproved: boolean;
  mode?: InsSignatureSlotMode;
  /** Singleton from `CampusInsSettings` — same image for every college. */
  campusWideDirectorSignatureUrl?: string | null;
}): InsSignatureSlot[] | null {
  if (!args.scheduleApproved) return null;

  const { college, programId, users, userById, mode = "full", campusWideDirectorSignatureUrl } = args;
  const collegeId = college?.id ?? null;

  const campusDirectorUser = college?.campusDirectorUserId
    ? userById.get(college.campusDirectorUserId) ?? null
    : null;

  const campusImg = campusDirectorSignatureUrl(campusWideDirectorSignatureUrl, campusDirectorUser);

  if (mode === "sectionCampusOnly") {
    return [
      {
        key: "campus",
        lineTitle: "Approved",
        lineSubtitle: "Campus Director",
        signerName: campusDirectorUser?.name?.trim() || "Campus Director",
        imageUrl: campusImg,
      },
    ];
  }

  const doi =
    users.filter((u) => u.role === "doi_admin").sort((a, b) => a.name.localeCompare(b.name))[0] ?? null;

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
    imageOverride?: string | null,
  ): InsSignatureSlot => ({
    key,
    lineTitle,
    lineSubtitle,
    signerName: u?.name ?? "—",
    imageUrl: imageOverride ?? u?.signatureImageUrl?.trim() ?? null,
  });

  return [
    slot("approved", "Approved by", "Director of Instruction / VPAA", doi),
    slot("campus", "Campus Director", "Campus", campusDirectorUser, campusImg),
    slot("review", "Reviewed & Certified by", "Program / GEC Chairman", chairman),
    slot("contract", "Contract", "Authorized signatory", contractSigner),
    slot("prepared", "Prepared by", "College Admin", collegeAdmin),
  ];
}
