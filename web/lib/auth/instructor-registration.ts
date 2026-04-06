import { randomBytes } from "crypto";

/** Cryptographically strong temporary password for new instructor accounts (12+ chars, mixed). */
export function generateInstructorTempPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}
