/**
 * The room name printed on INS forms (5A/5B/5C) and their PDFs: the room's display name
 * ("IT Lab 04") when one is set in Buildings & Rooms, otherwise its code ("COTE 303").
 */
export function insRoomLabel(
  room: { code?: string | null; displayName?: string | null } | null | undefined,
  fallback = "TBA",
): string {
  const code = room?.code?.trim() ?? "";
  let name = room?.displayName?.trim() ?? "";
  // Name only — a name saved as "COTE 303 - IT Lab 04" prints as "IT Lab 04".
  if (code && name.toLowerCase().startsWith(code.toLowerCase())) {
    name = name.slice(code.length).replace(/^\s*[-–—:|]\s*/, "").trim();
  }
  if (name) return name;
  return code || fallback;
}
