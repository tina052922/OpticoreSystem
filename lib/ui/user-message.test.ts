import { describe, expect, it, vi } from "vitest";
import { isDeveloperMessage, reportUserError, toUserMessage } from "./user-message";

/** Shaped like `ApiClientError`, which is what callers actually catch. */
const apiError = (status: number, message: string, code = "ERR") => ({ status, code, message });

describe("isDeveloperMessage", () => {
  /** The real strings this app has been showing people. */
  it("recognises the ones written for a developer", () => {
    for (const text of [
      "Cannot reach API (Failed to fetch)",
      "Saved without the category — run migration 016_subject_category.sql on the database.",
      "Could not find the 'profileImageUrl' column of 'User' in the schema cache",
      "duplicate key value violates unique constraint \"Subject_pkey\"",
      'relation "SubjectCategory" does not exist',
      "PGRST204",
      "socket hang up",
      "connect ECONNREFUSED 127.0.0.1:4000",
      "Unexpected token < in JSON at position 0",
      "TypeError: x.map is not a function",
      "NETWORK_ERROR",
    ]) {
      expect(isDeveloperMessage(text), text).toBe(true);
    }
  });

  it("leaves alone the ones written for a person", () => {
    for (const text of [
      "Juan Dela Cruz already holds this post. Edit or remove that account first.",
      "4 subjects use \"Elective\". Removing it leaves them without a category.",
      "Enter a valid email address.",
      "Resolve timetable conflicts before saving.",
    ]) {
      expect(isDeveloperMessage(text), text).toBe(false);
    }
  });

  it("treats an empty message as unusable", () => {
    expect(isDeveloperMessage("")).toBe(true);
    expect(isDeveloperMessage(null)).toBe(true);
  });
});

describe("toUserMessage", () => {
  it("says what to do when there is no connection", () => {
    const msg = toUserMessage({ status: 0, code: "NETWORK_ERROR", message: "Cannot reach API" }, "Could not save");
    expect(msg.title).toBe("No connection");
    expect(msg.detail).toContain("Nothing was saved");
  });

  it("explains an expired session rather than showing 401", () => {
    expect(toUserMessage(apiError(401, "Unauthorized"), "Could not save").title).toBe(
      "Your session has ended",
    );
  });

  it("explains a refusal without blaming the person", () => {
    const msg = toUserMessage(apiError(403, "Forbidden"), "Could not save");
    expect(msg.title).toBe("You do not have access to this");
  });

  it("suggests a refresh when the thing is gone", () => {
    expect(toUserMessage(apiError(404, "Not found"), "Could not save").detail).toContain("Refresh");
  });

  it("does not blame the person for a server fault", () => {
    const msg = toUserMessage(apiError(500, "Internal Server Error"), "Could not save");
    expect(msg.title).toBe("Something went wrong at our end");
  });

  it("explains a locked term in the words the app uses", () => {
    expect(toUserMessage(apiError(423, "Locked"), "Could not save").title).toBe(
      "This has been locked",
    );
  });

  /**
   * The point of the whole module: a conflict is the one case where the server knows something
   * specific about this person's data, so its wording is kept.
   */
  it("keeps a conflict message the server wrote for a person", () => {
    const msg = toUserMessage(
      apiError(409, "Juan already holds this post. Edit or remove that account first."),
      "Could not register the chairman",
    );
    expect(msg.title).toBe("Could not register the chairman");
    expect(msg.detail).toBe("Juan already holds this post. Edit or remove that account first.");
  });

  it("replaces a conflict message that is only useful to a developer", () => {
    const msg = toUserMessage(
      apiError(409, 'duplicate key value violates unique constraint "Subject_code_key"'),
      "Could not save the subject",
    );
    expect(msg.title).toBe("Could not save the subject");
    expect(msg.detail).not.toContain("constraint");
  });

  it("replaces a migration hint with something actionable", () => {
    const msg = toUserMessage(
      apiError(400, "Saved without the category — run migration 016_subject_category.sql."),
      "Could not save the subject",
    );
    expect(msg.detail).not.toContain("migration");
    expect(msg.detail).toContain("administrator");
  });

  it("falls back to the caller's wording when the error says nothing", () => {
    const msg = toUserMessage(new Error(""), "Could not load the faculty list");
    expect(msg.title).toBe("Could not load the faculty list");
  });

  it("handles anything at all being thrown", () => {
    expect(toUserMessage(undefined, "Could not save").title).toBe("Could not save");
    expect(toUserMessage("plain string", "Could not save").detail).toBe("plain string");
    expect(toUserMessage(null, "Could not save").title).toBe("Could not save");
  });
});

describe("reportUserError", () => {
  it("keeps the technical detail for whoever is debugging", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const raw = apiError(500, "ECONNREFUSED 127.0.0.1:4000");
    const msg = reportUserError(raw, "Could not save", "saving subject");

    expect(spy).toHaveBeenCalledWith("[opticore] saving subject", raw);
    expect(msg.detail).not.toContain("ECONNREFUSED");
    spy.mockRestore();
  });
});
