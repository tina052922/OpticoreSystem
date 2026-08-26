"use client";

import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useProgramMode } from "@/contexts/ProgramModeContext";
import { cn } from "@/components/ui/utils";
import type { ProgramMode } from "@/lib/scheduling/program-mode";

type Props = {
  className?: string;
  /** Compact for tight headers (evaluator grid). */
  size?: "sm" | "md";
};

export function ProgramModeToggle({ className, size = "md" }: Props) {
  const { programMode, setProgramMode } = useProgramMode();

  const btn = (mode: ProgramMode, label: string, icon: ReactNode) => {
    const active = programMode === mode;
    return (
      <button
        type="button"
        onClick={() => setProgramMode(mode)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors",
          size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-sm",
          active
            ? "bg-[#780301] text-white shadow-sm"
            : "bg-white text-[#780301] hover:bg-[#780301]/8",
        )}
        aria-pressed={active}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-[#780301]/25 bg-[#fff7ed] p-0.5",
        className,
      )}
      role="group"
      aria-label="Program schedule"
    >
      {btn("day", "Day Program", <Sun className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />)}
      {btn("night", "Night Program", <Moon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />)}
    </div>
  );
}
