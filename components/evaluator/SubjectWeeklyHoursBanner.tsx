"use client";

import { AlertTriangle } from "lucide-react";
import { subjectWeeklyHoursCaption } from "@/lib/scheduling/subject-semester-hours";

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

export function SubjectWeeklyHoursChip({ plottedHours, requiredHours, plotted }: ChipProps) {
  if (!plotted) {
    return requiredHours > 0 ? (
      <span className="text-black/35 tabular-nums">{requiredHours}h needed</span>
    ) : (
      <span className="text-black/35">—</span>
    );
  }
  const over = requiredHours > 0 && plottedHours > requiredHours + 1e-6;
  if (over) {
    return (
      <span className="inline-flex items-center gap-1 text-red-800 font-semibold">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
        Over limit · {plottedHours}/{requiredHours}h
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-emerald-900 font-semibold tabular-nums">
      {plottedHours}/{requiredHours > 0 ? requiredHours : plottedHours}h
    </span>
  );
}
