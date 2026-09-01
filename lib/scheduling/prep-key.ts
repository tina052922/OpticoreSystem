/**
 * Lecture and laboratory of the same subject count as one preparation.
 * CC112 / CC-112 / CC112L / CC-112L all collapse to the same key.
 */
export function subjectPrepKey(code: string | null | undefined): string {
  const n = (code ?? "").trim().toUpperCase().replace(/[\s\-_.]/g, "");
  if (!n) return "";
  return n.replace(/(\d)(?:LAB|L)$/, "$1");
}
