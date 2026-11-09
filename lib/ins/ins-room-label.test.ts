import { describe, expect, it } from "vitest";
import { insRoomLabel } from "./ins-room-label";

describe("insRoomLabel", () => {
  it("prefers the display name", () => {
    expect(insRoomLabel({ code: "COTE 303", displayName: "IT Lab 04" })).toBe("IT Lab 04");
  });
  it("drops a room code typed in front of the name", () => {
    expect(insRoomLabel({ code: "COTE 303", displayName: "COTE 303 - IT Lab 04" })).toBe("IT Lab 04");
    expect(insRoomLabel({ code: "COTE 303", displayName: "COTE 303 — IT Lab 04" })).toBe("IT Lab 04");
  });
  it("falls back to the code, then to the fallback", () => {
    expect(insRoomLabel({ code: "COTE 303", displayName: "  " })).toBe("COTE 303");
    expect(insRoomLabel(null)).toBe("TBA");
    expect(insRoomLabel(undefined, "Room")).toBe("Room");
  });
});
