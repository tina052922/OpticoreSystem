/**
 * Maps the signed-in account to the INS signatory slot they typically fill in
 * System Configuration / Load Generator.
 */

import type { Role } from "@/lib/api/client";

export type InsSignerSlotKey =
  | "approved"
  | "campus"
  | "dean"
  | "review"
  | "contract"
  | "prepared";

/** Slot whose printed name should default from the logged-in profile. */
export function insSignerSlotKeyForRole(role: Role | string | null | undefined): InsSignerSlotKey | null {
  switch (role) {
    case "doi_admin":
      return "approved";
    case "college_admin":
      return "prepared";
    case "chairman_admin":
    case "gec_chairman":
      return "review";
    default:
      return null;
  }
}

/**
 * Prefills `signerName` from the profile when that slot has no saved name value.
 * Does not overwrite a typed/saved name, including an intentional empty string.
 */
export function withProfileSignerAutofill(
  display: Record<string, { signerName?: string | null; lineSubtitle?: string | null } | undefined>,
  args: { role?: Role | string | null; name?: string | null },
): typeof display {
  const slot = insSignerSlotKeyForRole(args.role);
  const name = (args.name ?? "").trim();
  if (!slot || !name) return display;
  const existing = display[slot]?.signerName;
  // null/undefined → no override yet; "" means the user cleared and saved blank.
  if (existing != null) return display;
  return {
    ...display,
    [slot]: {
      ...(display[slot] ?? {}),
      signerName: name,
    },
  };
}
