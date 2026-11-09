"use client";

import { useEffect, useState } from "react";
import { subjectCategoryApi } from "@/lib/api/client";
import { CAMPUS_SUBJECT_CATEGORIES, normalizeSubjectCategoryCode } from "@/lib/subjects/subject-category";

/** Fallback while (or if) the request fails: the campus-wide categories every program has. */
function campusLabels(): Map<string, string> {
  return new Map(CAMPUS_SUBJECT_CATEGORIES.map((c) => [normalizeSubjectCategoryCode(c.code), c.label]));
}

/**
 * Category code → label for one program (campus GEC/GEE/PE/NSTP plus the program's own, e.g. CC,
 * AP), so screens outside Subject Codes print the same label Subject Codes does.
 */
export function useSubjectCategoryLabels(programId: string | null | undefined): ReadonlyMap<string, string> {
  const [labels, setLabels] = useState<ReadonlyMap<string, string>>(campusLabels);

  useEffect(() => {
    let alive = true;
    subjectCategoryApi
      .list(programId?.trim() || null)
      .then((r) => {
        if (!alive) return;
        const m = campusLabels();
        for (const c of r.categories ?? []) m.set(normalizeSubjectCategoryCode(c.code), c.label);
        setLabels(m);
      })
      .catch(() => {
        /* keep campus labels */
      });
    return () => {
      alive = false;
    };
  }, [programId]);

  return labels;
}
