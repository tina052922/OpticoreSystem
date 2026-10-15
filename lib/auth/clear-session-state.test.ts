import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearClientSessionState } from "./clear-session-state";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

function install(): { local: MemoryStorage; session: MemoryStorage } {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  vi.stubGlobal("window", { localStorage: local, sessionStorage: session });
  return { local, session };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("clearClientSessionState", () => {
  /** The one that matters most: another person's unsaved schedule must not survive a logout. */
  it("removes evaluator drafts from both stores", () => {
    const { local, session } = install();
    session.setItem("opticore-bsit-evaluator-sync-v1", "{}");
    local.setItem("opticore-bsit-evaluator-backup-v1", "{}");
    local.setItem("opticore-central-hub-pending-bundle-v1", "{}");

    clearClientSessionState();

    expect(session.getItem("opticore-bsit-evaluator-sync-v1")).toBeNull();
    expect(local.getItem("opticore-bsit-evaluator-backup-v1")).toBeNull();
    expect(local.getItem("opticore-central-hub-pending-bundle-v1")).toBeNull();
  });

  it("removes where the person was and what they had selected", () => {
    const { local } = install();
    local.setItem("last_visited_path", "/admin/college/ins");
    local.setItem("opticore.selectedAcademicPeriodId", "term-1");
    local.setItem("opticore.programMode", "night");

    clearClientSessionState();

    expect(local.getItem("last_visited_path")).toBeNull();
    expect(local.getItem("opticore.selectedAcademicPeriodId")).toBeNull();
    expect(local.getItem("opticore.programMode")).toBeNull();
  });

  /** Keys carrying a term or college in their name still have to go. */
  it("removes every key in a family, not just the exact ones", () => {
    const { local } = install();
    local.setItem("opticore:gec-vacant-draft:v1:term-1:col-tech-eng:all", "{}");
    local.setItem("opticore:gec-vacant-draft:v1:term-2:col-arts:sec-9", "{}");
    local.setItem("opticore:audit-log-last-seen:doi", "2026-01-01");

    clearClientSessionState();

    expect(local.length).toBe(0);
  });

  /** Wiping storage wholesale would take data this app did not write. */
  it("leaves keys that are not ours alone", () => {
    const { local } = install();
    local.setItem("some-other-app:token", "keep me");
    local.setItem("last_visited_path", "/admin");

    clearClientSessionState();

    expect(local.getItem("some-other-app:token")).toBe("keep me");
    expect(local.getItem("last_visited_path")).toBeNull();
  });

  it("does nothing when storage throws", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
      get sessionStorage(): Storage {
        throw new Error("blocked");
      },
    });
    expect(() => clearClientSessionState()).not.toThrow();
  });
});
