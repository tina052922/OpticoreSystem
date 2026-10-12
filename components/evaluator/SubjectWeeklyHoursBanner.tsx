"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  subjectHoursProgress,
  subjectWeeklyHoursCaption,
} from "@/lib/scheduling/subject-semester-hours";

type BannerProps = {
  requiredHours: number;
  alreadyPlottedHours: number;
  additionalHours: number;
};

export function SubjectWeeklyHoursBanner({
  requiredHours,
  alreadyPlottedHours,
  additionalHours,
}: BannerProps) {
  const cap = subjectWeeklyHoursCaption({
    requiredHours,
    alreadyPlottedHours,
    additionalHours,
  });
  if (cap.overLimit) {
    return (
      <p
        className="text-[12px] font-medium text-red-800 rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex gap-2"
        role="alert"
      >
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
        <span>{cap.text}</span>
      </p>
    );
  }
  return (
    <p className="text-[12px] font-medium text-black/70 rounded-lg border border-[#ff990a]/30 bg-[#ff990a]/8 px-3 py-2">
      {cap.text}
    </p>
  );
}

type ChipProps = {
  plottedHours: number;
  requiredHours: number;
  plotted: boolean;
};

/**
 * The hours cell in Summary of Subjects.
 *
 * The tick and the colour both come from {@link subjectHoursProgress}, and they live here rather
 * than in each table so the two summaries cannot disagree about what "done" looks like. Only a
 * subject whose hours are fully plotted is marked; a partly plotted one stays grey, because a tick
 * beside "1/5h" says the work is finished when it is not.
 */
export function SubjectWeeklyHoursChip({ plottedHours, requiredHours, plotted }: ChipProps) {
  const progress = subjectHoursProgress({ plottedHours, requiredHours, plotted });

  if (progress === "none") {
    return requiredHours > 0 ? (
      <span className="text-black/35 tabular-nums">{requiredHours}h needed</span>
    ) : (
      <span className="text-black/35">—</span>
    );
  }

  if (progress === "over") {
    return (
      <span className="inline-flex items-center gap-1 text-red-800 font-semibold">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
        Over limit · {plottedHours}/{requiredHours}h
      </span>
    );
  }

  const total = requiredHours > 0 ? requiredHours : plottedHours;

  if (progress === "complete") {
    return (
      <span
        className="inline-flex items-center gap-1 text-emerald-900 font-semibold tabular-nums"
        title={`Fully plotted — ${plottedHours} of ${total} hours`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {plottedHours}/{total}h
      </span>
    );
  }

  // Partly plotted: no tick, and muted, so it does not read as finished at a glance.
  return (
    <span
      className="inline-flex items-center gap-1 text-black/55 font-medium tabular-nums"
      title={`${total - plottedHours} of ${total} hours still to plot`}
    >
      {plottedHours}/{total}h
    </span>
  );
}
