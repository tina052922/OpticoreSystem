import { describe, expect, it } from "vitest";
import { buildInsSignatureSlots } from "./ins-signature-slots";
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
};

describe("buildInsSignatureSlots", () => {
  const doi = user({
    id: "doi-1",
    name: "DOI Admin",
    role: "doi_admin",
    collegeId: null,
    signatureImageUrl: "https://cdn.example/doi-profile.png",
  });
  const collegeAdmin = user({
    id: "ca-1",
    name: "College Admin",
    role: "college_admin",
    signatureImageUrl: "https://cdn.example/ca-profile.png",
  });
  const users = [doi, collegeAdmin];
  const userById = new Map(users.map((u) => [u.id, u]));

  it("prefers System Configuration electronic signatures over Profile images", () => {
    const slots = buildInsSignatureSlots({
      college,
      programId: null,
      users,
      userById,
      scheduleApproved: true,
      doiSignatureImageUrl: "https://cdn.example/doi-config.png",
    });
    expect(slots?.find((s) => s.key === "approved")?.imageUrl).toBe(
      "https://cdn.example/doi-config.png",
    );
    expect(slots?.find((s) => s.key === "prepared")?.imageUrl).toBe(
      "https://cdn.example/college-admin.png",
    );
  });

  it("falls back to Profile signatures when System Configuration has none", () => {
    const slots = buildInsSignatureSlots({
      college: { ...college, collegeAdminSignatureImageUrl: null },
      programId: null,
      users,
      userById,
      scheduleApproved: true,
    });
    expect(slots?.find((s) => s.key === "approved")?.imageUrl).toBe(
      "https://cdn.example/doi-profile.png",
    );
    expect(slots?.find((s) => s.key === "prepared")?.imageUrl).toBe(
      "https://cdn.example/ca-profile.png",
    );
  });
});
