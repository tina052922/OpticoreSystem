import { mergeInsSignerDisplay } from "@/lib/ins/merge-ins-signer-display";
import type { College, CollegeInsSignerDisplay, User } from "@/types/db";

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

function firstUrl(...urls: Array<string | null | undefined>): string | null {
  for (const u of urls) {
    const t = u?.trim();
    if (t) return t;
  }
  return null;
}

/**
 * INS vertical signature strip — order (full mode):
 * 1 Approved by (DOI)
 * 2 Campus Director
 * 3 Dean
 * 4 Reviewed & Certified (Program / GEC Chairman)
 * 5 Contract
 * 6 Prepared by (College Admin)
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
  /** DOI / VPAA electronic signature from System Configuration. */
  doiSignatureImageUrl?: string | null;
}): InsSignatureSlot[] | null {
  const {
    college,
    programId,
    users,
    userById,
    mode = "full",
    campusWideDirectorSignatureUrl,
    doiSignatureImageUrl,
  } = args;
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

  const doiImg = firstUrl(doiSignatureImageUrl, doi?.signatureImageUrl);
  const preparedImg = firstUrl(
    college?.collegeAdminSignatureImageUrl,
    collegeAdmin?.signatureImageUrl,
  );

  return [
    slot("approved", "Approved by", "Director of Instruction / VPAA", doi, doiImg),
    slot("campus", "Campus Director", "Campus", campusDirectorUser, campusImg),
    slot("dean", "Dean", "College Dean", null),
    slot("review", "Reviewed & Certified by", "Program Chairman", chairman),
    slot("contract", "Contract", "Authorized signatory", null),
    slot("prepared", "Prepared by", "College Admin", collegeAdmin, preparedImg),
  ];
}

/**
 * Build INS signature strip with System Configuration overrides (names + titles).
 * Signature images appear only after VPAA publication (`scheduleApproved`).
 */
export function resolveInsSignatureSlots(args: {
  college: College | null;
  programId: string | null;
  users: User[];
  userById: Map<string, User>;
  scheduleApproved: boolean;
  mode?: InsSignatureSlotMode;
  campusWideDirectorSignatureUrl?: string | null;
  doiSignatureImageUrl?: string | null;
  campusInsSignerDisplay?: CollegeInsSignerDisplay | null;
  collegeInsSignerDisplay?: CollegeInsSignerDisplay | null;
}): InsSignatureSlot[] | null {
  const built = buildInsSignatureSlots({
    college: args.college,
    programId: args.programId,
    users: args.users,
    userById: args.userById,
    scheduleApproved: true,
    mode: args.mode,
    campusWideDirectorSignatureUrl: args.campusWideDirectorSignatureUrl,
    doiSignatureImageUrl: args.doiSignatureImageUrl,
  });
  const merged = mergeInsSignerDisplay(
    built,
    args.campusInsSignerDisplay ?? null,
    args.collegeInsSignerDisplay ?? null,
  );
  if (!merged?.length) return merged;
  if (!args.scheduleApproved) {
    return merged.map((s) => ({ ...s, imageUrl: null }));
  }
  return merged;
}
