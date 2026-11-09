import { describe, expect, it } from "vitest";
import { facultyProfileHrefForInsBase } from "./faculty-profile-href";

describe("facultyProfileHrefForInsBase", () => {
  it("points each role at its own Faculty Profile", () => {
    expect(facultyProfileHrefForInsBase("/chairman/ins")).toBe("/chairman/faculty-profile");
    expect(facultyProfileHrefForInsBase("/admin/college/ins")).toBe("/admin/college/faculty-profile");
    expect(facultyProfileHrefForInsBase("/doi/ins?tab=faculty")).toBe("/doi/faculty-profile");
    expect(facultyProfileHrefForInsBase("/admin/gec/ins")).toBe("/admin/gec/faculty-profile");
  });
});
