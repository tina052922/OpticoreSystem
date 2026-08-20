/** Case- and whitespace-insensitive comparison for duplicate Subject.code checks. */
export function normalizeSubjectCodeForCompare(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}
