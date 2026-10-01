/**
 * Predicates about a faculty sign-in that the browser needs too.
 *
 * Mirrored from `opticore-backend/src/lib/faculty-login-account.ts`, minus the password generator —
 * temporary passwords are minted on the server only, so the browser never holds that code path.
 */

/**
 * The address the old flow invented for a faculty with no login.
 *
 * Recognised rather than guessed at, so these rows read as "no sign-in" instead of showing a mailbox
 * that does not exist.
 */
export function isPlaceholderFacultyEmail(email: string | null | undefined): boolean {
  return /^pending\.[^@]+@opticore\.local$/i.test(String(email ?? "").trim());
}

/** True when this faculty can actually sign in. */
export function hasFacultySignIn(email: string | null | undefined): boolean {
  const text = String(email ?? "").trim();
  return Boolean(text) && !isPlaceholderFacultyEmail(text);
}
