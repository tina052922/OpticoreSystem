/**
 * Browser-side UX state for an in-progress student registration.
 *
 * 🔒 What must NEVER be stored here
 * ─────────────────────────────────
 * The verification code, the password, and the signup profile stay on the
 * server. localStorage is readable by any script on this origin (and survives
 * indefinitely), so persisting a 6-digit code here would let anyone who reads
 * it "verify" an inbox they do not control — the exact attack the code exists
 * to stop. Brute-forcing 10^6 offline is trivial, so storing a HASH of the code
 * would be just as bad.
 *
 * What is kept is only what's needed to resume the "enter your code" screen
 * after a refresh: the address the code went to, and the timestamps driving the
 * resend countdown and the expiry hint. None of these are secrets — the user
 * typed the address, and knowing when a code was sent grants nothing.
 */

const KEY = "opticore.pending_registration";

export type PendingRegistrationState = {
  /** Address the code was emailed to — displayed, and replayed on verify. */
  email: string;
  /** Epoch ms of the last send; drives the resend cooldown. */
  lastSentAt: number;
  /** Epoch ms after which the server will reject the code. */
  expiresAt: number;
};

function isValid(value: unknown): value is PendingRegistrationState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.email === "string" &&
    v.email.length > 0 &&
    typeof v.lastSentAt === "number" &&
    Number.isFinite(v.lastSentAt) &&
    typeof v.expiresAt === "number" &&
    Number.isFinite(v.expiresAt)
  );
}

export function savePendingRegistration(state: PendingRegistrationState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — the flow still works, it just won't survive a refresh */
  }
}

/**
 * Returns the stored state, or null when absent, malformed or expired.
 *
 * Expired state is cleared rather than returned: resuming into a code screen
 * for a signup the server has already dropped is a dead end.
 */
export function loadPendingRegistration(): PendingRegistrationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) {
      localStorage.removeItem(KEY);
      return null;
    }
    if (parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    // Corrupt JSON — drop it so the user isn't stuck on a broken screen.
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearPendingRegistration(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
