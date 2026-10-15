/**
 * Everything this browser remembers about the person who was signed in.
 *
 * Logging out used to clear the cookies and the request cache and stop there, leaving the last
 * visited path, the selected term, and — most of all — unsaved evaluator drafts behind for whoever
 * signed in next. On a shared office machine that is one person's draft schedule shown to another.
 *
 * Keys are listed rather than wiping storage wholesale: this app is not necessarily the only thing
 * on the origin, and clearing another tool's data is not ours to do.
 */
const EXACT_KEYS: readonly string[] = [
  "last_visited_path",
  "opticore.selectedAcademicPeriodId",
  "opticore.programMode",
  "opticore-program-session",
  "opticore-schedule-program-session-overlay",
  "opticore-bsit-evaluator-sync-v1",
  "opticore-bsit-evaluator-backup-v1",
  "opticore-central-hub-pending-bundle-v1",
];

/** Families of keys that carry a term, college or scope in their name. */
const KEY_PREFIXES: readonly string[] = [
  "opticore:gec-vacant-draft:",
  "opticore:audit-log-last-seen:",
];

function clearStore(store: Storage): void {
  const doomed: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key) continue;
    if (EXACT_KEYS.includes(key) || KEY_PREFIXES.some((p) => key.startsWith(p))) {
      doomed.push(key);
    }
  }
  // Collected first: removing while iterating shifts the indexes and skips keys.
  for (const key of doomed) store.removeItem(key);
}

/** Forget the signed-in person's state in this browser. Safe to call when storage is unavailable. */
export function clearClientSessionState(): void {
  if (typeof window === "undefined") return;
  /*
   * Reading `window.localStorage` can itself throw where site data is blocked, so the access is
   * inside the try rather than the value it produces — otherwise logging out throws in exactly the
   * browsers that had nothing to clear anyway.
   */
  for (const pick of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      clearStore(pick());
    } catch {
      /* private mode, blocked site data — nothing to clear */
    }
  }
}
