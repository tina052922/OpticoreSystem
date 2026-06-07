import { describe, expect, it } from "vitest";
import { buildInsSignatureSlots, resolveInsSignatureSlots } from "@/lib/ins/ins-signature-slots";
import type { College, User } from "@/types/db";

const college: College = {
  id: "col-1",
  code: "COTE",
  name: "College of Technology",
  campusDirectorUserId: "user-cd",
  contractSignerUserId: null,
};

const users: User[] = [
  {
    id: "user-cd",
    employeeId: null,
    email: "cd@test.local",
    name: "Campus Dir Name",
    role: "instructor",
    collegeId: "col-1",
    signatureImageUrl: "https://example.com/sig.png",
    createdAt: "",
    updatedAt: "",
  },
];

describe("ins-signature-slots", () => {
  it("sectionCampusOnly returns a single campus director column", () => {
    const slots = buildInsSignatureSlots({
      college,
      programId: null,
      users,
      userById: new Map(users.map((u) => [u.id, u])),
      scheduleApproved: true,
      mode: "sectionCampusOnly",
    });

    expect(slots).toHaveLength(1);
    expect(slots?.[0]?.key).toBe("campus");
    expect(slots?.[0]?.signerName).toBe("Campus Dir Name");
  });

  it("strips signature images until schedule is approved", () => {
    const slots = resolveInsSignatureSlots({
      college,
      programId: null,
      users,
      userById: new Map(users.map((u) => [u.id, u])),
      scheduleApproved: false,
      mode: "sectionCampusOnly",
      campusWideDirectorSignatureUrl: "https://example.com/campus.png",
    });

    expect(slots?.[0]?.imageUrl).toBeNull();
    expect(slots?.[0]?.signerName).toBe("Campus Dir Name");
  });
});
