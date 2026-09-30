import { describe, expect, it } from "vitest";
import { instructorPortalEntries } from "./instructor-portal-entries";

const ME = "user-me";
const PEER = "user-peer";

const entries = [
  { id: "a", sectionId: "sec-1", instructorId: ME },
  { id: "b", sectionId: "sec-1", instructorId: PEER },
  { id: "c", sectionId: "sec-2", instructorId: PEER },
  { id: "d", sectionId: "sec-3", instructorId: ME },
  { id: "e", sectionId: "sec-3", instructorId: null },
];

describe("instructorPortalEntries", () => {
  it("withholds nothing when there is no instructor to narrow to", () => {
    // Chairman and admin views pass no user; they are allowed the whole college.
    expect(instructorPortalEntries({ entries, instructorUserId: null }).map((e) => e.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
    expect(instructorPortalEntries({ entries, instructorUserId: "  " })).toHaveLength(entries.length);
  });

  it("returns a copy, not the original array", () => {
    const out = instructorPortalEntries({ entries, instructorUserId: null });
    expect(out).not.toBe(entries);
  });

  describe("section browse (ownEntriesOnly off)", () => {
    it("keeps every row of the sections this instructor teaches", () => {
      // A section grid is only readable whole, so co-teachers stay.
      const out = instructorPortalEntries({ entries, instructorUserId: ME });
      expect(out.map((e) => e.id)).toEqual(["a", "b", "d", "e"]);
    });

    it("drops sections the instructor has nothing to do with", () => {
      const out = instructorPortalEntries({ entries, instructorUserId: ME });
      expect(out.map((e) => e.sectionId)).not.toContain("sec-2");
    });

    it("shows nothing when the instructor teaches nothing", () => {
      expect(instructorPortalEntries({ entries, instructorUserId: "user-nobody" })).toEqual([]);
    });

    it("works out the sections from `teachingSource` when given one", () => {
      // Callers scope that list to the current term, so last term's section does not widen this one.
      const thisTerm = [entries[2]!]; // only a PEER row
      const out = instructorPortalEntries({
        entries,
        teachingSource: thisTerm,
        instructorUserId: ME,
      });
      expect(out).toEqual([]);
    });
  });

  describe("my schedule (ownEntriesOnly on)", () => {
    /**
     * The point of the flag: on a page titled "My schedule", a colleague teaching the same section
     * is nobody else's business.
     */
    it("keeps only this instructor's own classes", () => {
      const out = instructorPortalEntries({ entries, instructorUserId: ME, ownEntriesOnly: true });
      expect(out.map((e) => e.id)).toEqual(["a", "d"]);
    });

    it("never leaks a peer's row from a shared section", () => {
      const out = instructorPortalEntries({ entries, instructorUserId: ME, ownEntriesOnly: true });
      expect(out.every((e) => e.instructorId === ME)).toBe(true);
      expect(out.map((e) => e.id)).not.toContain("b");
    });

    it("drops rows with no instructor rather than assuming they are yours", () => {
      const out = instructorPortalEntries({ entries, instructorUserId: ME, ownEntriesOnly: true });
      expect(out.map((e) => e.id)).not.toContain("e");
    });

    it("ignores teachingSource, which only widens a browse", () => {
      const out = instructorPortalEntries({
        entries,
        teachingSource: [],
        instructorUserId: ME,
        ownEntriesOnly: true,
      });
      expect(out.map((e) => e.id)).toEqual(["a", "d"]);
    });

    it("shows nothing when the instructor has no classes", () => {
      expect(
        instructorPortalEntries({ entries, instructorUserId: "user-nobody", ownEntriesOnly: true }),
      ).toEqual([]);
    });
  });
});
