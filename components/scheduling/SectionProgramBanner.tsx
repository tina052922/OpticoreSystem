"use client";

import { Moon, Sun } from "lucide-react";
import type { ProgramMode } from "@/lib/scheduling/program-mode";

/** "Evening" / "Day" for a section's program, as stored on the section (default Day). */
export function sectionProgramMode(section: { programMode?: string | null } | null | undefined): ProgramMode {
  return section?.programMode === "night" ? "night" : "day";
}

/**
 * Shows which program the selected section belongs to. It replaces the Day / Night toggle: the
 * section decides (set in Programs & Sections), so the scheduler can no longer be on the wrong one.
 */
export function SectionProgramBanner({ mode, sectionName }: { mode: ProgramMode; sectionName?: string | null }) {
  const evening = mode === "night";
  return (
    <div
      role="status"
      className={`flex flex-wrap items-start gap-2 rounded-lg border px-3 py-2 text-[12.5px] ${
        evening ? "border-indigo-200 bg-indigo-50 text-indigo-950" : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      {evening ? <Moon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Sun className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <div className="min-w-0">
        <p className="font-semibold">
          {sectionName ? `${sectionName} is an ` : "This is an "}
          {evening ? "Evening Program section" : "Day Program section"}
        </p>
        <p className="opacity-80">
          {evening
            ? "Classes run Mon–Fri 4:00–10:00 PM and Sat–Sun 7:00 AM–10:00 PM. Only Evening classes are shown and saved here."
            : "Classes run Mon–Fri 7:00 AM–5:00 PM. Only Day classes are shown and saved here."}{" "}
          Change it in Programs &amp; Sections.
        </p>
      </div>
    </div>
  );
}
