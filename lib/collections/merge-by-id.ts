/** Last occurrence wins. Useful for merging primary + supplemental catalog rows from `ScheduleEntry` FKs. */
export function mergeById<T extends { id: string }>(...lists: T[][]): T[] {
  const m = new Map<string, T>();
  for (const list of lists) {
    for (const item of list) m.set(item.id, item);
  }
  return [...m.values()];
}
