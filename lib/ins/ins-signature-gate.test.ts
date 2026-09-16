import { describe, expect, it, vi, afterEach } from "vitest";
import { resolveInsSignatureSlots } from "./ins-signature-slots";
import { signatureSlotsToPdf } from "./ins-pdf-adapters";
import type { College, User } from "@/types/db";

function user(partial: Partial<User> & Pick<User, "id" | "name" | "role">): User {
  return {
    employeeId: null,
    email: `${partial.id}@ctu.edu.ph`,
    collegeId: "col-1",
    chairmanProgramId: null,
    signatureImageUrl: null,
    profileImageUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

const college: College = {
  id: "col-1",
  code: "COTE",
  name: "College of Technology",
  collegeAdminSignatureImageUrl: "https://cdn.example/college-admin.png",
  campusDirectorUserId: "cd-1",
};

describe("resolveInsSignatureSlots publish gate vs PDF includeImages", () => {
  const doi = user({
    id: "doi-1",
    name: "DOI Admin",
    role: "doi_admin",
    collegeId: null,
  });
  const collegeAdmin = user({
    id: "ca-1",
    name: "College Admin",
    role: "college_admin",
  });
  const campusDirector = user({
    id: "cd-1",
    name: "Campus Director",
    role: "instructor",
  });
  const users = [doi, collegeAdmin, campusDirector];
  const userById = new Map(users.map((u) => [u.id, u]));

  const base = {
    college,
    programId: null as string | null,
    users,
    userById,
    doiSignatureImageUrl: "https://cdn.example/doi-config.png",
    campusWideDirectorSignatureUrl: "https://cdn.example/campus.png",
  };

  it("blanks images on-screen when term is not published", () => {
    const slots = resolveInsSignatureSlots({
      ...base,
      scheduleApproved: false,
    });
    expect(slots?.every((s) => s.imageUrl == null)).toBe(true);
    expect(slots?.find((s) => s.key === "prepared")?.signerName).toBe("College Admin");
  });

  it("keeps configured images for PDF when includeImages is true (even if unpublished)", () => {
    const slots = resolveInsSignatureSlots({
      ...base,
      scheduleApproved: false,
      includeImages: true,
    });
    expect(slots?.find((s) => s.key === "prepared")?.imageUrl).toBe(
      "https://cdn.example/college-admin.png",
    );
    expect(slots?.find((s) => s.key === "campus")?.imageUrl).toBe("https://cdn.example/campus.png");
    expect(slots?.find((s) => s.key === "approved")?.imageUrl).toBe(
      "https://cdn.example/doi-config.png",
    );

    const pdf = signatureSlotsToPdf(slots);
    expect(pdf?.find((s) => s.key === "prepared")?.imageUrl).toBe(
      "https://cdn.example/college-admin.png",
    );
    // DOI e-sig prints on Reviewed (Director/Dean), not on Campus Director.
    expect(pdf?.find((s) => s.key === "reviewed")?.imageUrl).toBe(
      "https://cdn.example/doi-config.png",
    );
    expect(pdf?.find((s) => s.key === "approved")?.signerName).toBe("Campus Director");
    expect(pdf?.find((s) => s.key === "approved")?.imageUrl).toBe("https://cdn.example/campus.png");
  });

  it("shows images on-screen after publish", () => {
    const slots = resolveInsSignatureSlots({
      ...base,
      scheduleApproved: true,
    });
    expect(slots?.find((s) => s.key === "prepared")?.imageUrl).toBe(
      "https://cdn.example/college-admin.png",
    );
  });
});
