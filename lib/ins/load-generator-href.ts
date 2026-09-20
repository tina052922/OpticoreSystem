/**
 * Link from the Evaluator's "Generate INS Form" button to the Load Generator (the `…/ins` route),
 * opened on the Section tab for the section being plotted.
 *
 * The selected academic period is carried over when the current URL has one, so the Load Generator
 * lands on the same term the Evaluator was showing instead of falling back to the stored default.
 */

import { SEMESTER_FILTER_URL_PARAM } from "@/lib/semester-filter-storage";

export type LoadGeneratorHrefInput = {
  /** Role-scoped Load Generator route, e.g. `/chairman/ins`. */
  basePath: string;
  /** Section to open; blank lands on the Section tab with nothing selected. */
  sectionId?: string | null;
  /** `AcademicPeriod.id` to carry over; blank leaves it to the Load Generator's own filter. */
  periodId?: string | null;
};

export function loadGeneratorHref({ basePath, sectionId, periodId }: LoadGeneratorHrefInput): string {
  const params = new URLSearchParams({ tab: "section" });
  const section = (sectionId ?? "").trim();
  if (section) params.set("sectionId", section);
  const period = (periodId ?? "").trim();
  if (period) params.set(SEMESTER_FILTER_URL_PARAM, period);
  return `${basePath}?${params.toString()}`;
}

/** The period the current page is pinned to, or "" when the URL carries none. */
export function periodIdFromLocation(href?: string | null): string {
  const url = href ?? (typeof window === "undefined" ? "" : window.location.href);
  if (!url) return "";
  try {
    return new URL(url).searchParams.get(SEMESTER_FILTER_URL_PARAM)?.trim() ?? "";
  } catch {
    return "";
  }
}
