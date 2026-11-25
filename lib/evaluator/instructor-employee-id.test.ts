import { describe, expect, it } from "vitest";
import type { User } from "@/types/db";
import { usersToInstructorPlotOptions } from "./instructor-employee-id";

const user = (over: Partial<User>): User => ({ id: "u", name: "Someone", role: "instructor", employeeId: null, ...over }) as User;

describe("usersToInstructorPlotOptions", () => {
  it("lists accounts DOI creates without an Employee ID: chairs and College Admins, who teach too", () => {
    const ids = usersToInstructorPlotOptions([
      user({ id: "chair", role: "chairman_admin" }),
      user({ id: "service", role: "gec_chairman" }),
      user({ id: "cote-admin", role: "college_admin", name: "Christine Lim" }),
      user({ id: "legacy-cas", role: "cas_admin" }),
    ]).map((o) => o.id);
    expect(ids.sort()).toEqual(["chair", "cote-admin", "legacy-cas", "service"]);
  });

  it("still needs an Employee ID for an instructor", () => {
    const ids = usersToInstructorPlotOptions([
      user({ id: "no-eid", role: "instructor" }),
      user({ id: "with-eid", role: "instructor", employeeId: "2024-001" }),
    ]).map((o) => o.id);
    expect(ids).toEqual(["with-eid"]);
  });
});
