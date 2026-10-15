import { describe, expect, it } from "vitest";
import { isDeveloperMessage, toUserMessage, userErrorDetail } from "./user-message";

/** The exact text Postgres returned when a vacant GEC slot could not be saved. */
const FK_ERROR =
  'insert or update on table "ScheduleEntry" violates foreign key constraint "ScheduleEntry_instructorId_fkey"';

describe("toUserMessage on database constraints", () => {
  it("explains a foreign key failure in terms of what to do", () => {
    const got = toUserMessage({ status: 400, message: FK_ERROR }, "Could not save vacant slots");
    /* The caller's title says where the person is; only the explanation is replaced. */
    expect(got.title).toBe("Could not save vacant slots");
    expect(got.detail).toContain("Refresh the page");
    expect(got.detail).not.toContain("foreign key");
    expect(got.detail).not.toContain("ScheduleEntry");
  });

  it("explains a missing required value", () => {
    const got = toUserMessage(
      { status: 400, message: 'null value in column "instructorId" violates not-null constraint' },
      "Could not save",
    );
    expect(got.title).toBe("Could not save");
    expect(got.detail).toContain("left empty");
    expect(got.detail).not.toContain("null value");
  });

  it("explains a duplicate", () => {
    const got = toUserMessage(
      { status: 409, message: 'duplicate key value violates unique constraint "ScheduleEntry_pkey"' },
      "Could not save",
    );
    expect(got.title).toBe("Could not save");
    expect(got.detail).toContain("already exists");
    expect(got.detail).not.toContain("unique constraint");
  });

  /** A constraint message is developer text whichever way it reaches the person. */
  it("recognises the raw text as written for a developer", () => {
    expect(isDeveloperMessage(FK_ERROR)).toBe(true);
  });

  /** A server message meant for the person still gets through untouched. */
  it("keeps a human conflict message", () => {
    const got = toUserMessage(
      { status: 409, message: "BSIT 2A already has GEC-LWR on Wednesday 1:00 PM – 2:30 PM." },
      "Could not save",
    );
    expect(got.detail).toBe("BSIT 2A already has GEC-LWR on Wednesday 1:00 PM – 2:30 PM.");
  });
});

describe("userErrorDetail", () => {
  it("gives the explanation without the title", () => {
    expect(userErrorDetail({ status: 400, message: FK_ERROR }, "Could not save vacant slots")).toContain(
      "no longer exists",
    );
  });

  it("never returns undefined", () => {
    expect(typeof userErrorDetail(new Error("boom at foo (x.ts:1:1)"), "Failed")).toBe("string");
  });
});
