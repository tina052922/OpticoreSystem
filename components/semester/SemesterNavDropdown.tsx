"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { cn } from "@/components/ui/utils";

type Variant = "header" | "sidebar";

/**
 * Orange pill semester switcher (OptiCore spec): white label, dark outline, chevron — drives {@link SemesterFilterProvider}.
 */
export function SemesterNavDropdown({ variant = "sidebar", className }: { variant?: Variant; className?: string }) {
  const { periods, selectedPeriodId, setSelectedPeriodId, loading, error, ready } = useSemesterFilter();

  const label =
    periods.find((p) => p.id === selectedPeriodId)?.name ??
    (loading ? "Loading terms…" : error ? "Term unavailable" : "Select semester");

  const pillClass = cn(
    "w-full bg-[#FF990A] text-white rounded-full font-medium flex items-center justify-between",
    "shadow-[0px_4px_4px_0px_rgba(0,0,0,0.15)]",
    "hover:bg-[#e88909] transition-colors disabled:opacity-60",
    variant === "header"
      ? "border border-black px-4 py-2 text-xs sm:text-sm max-w-[min(100vw-10rem,280px)]"
      : /* Sidebar-only term switcher: no harsh black ring (header variant may still be used in legacy embeds). */
        "border border-white/35 px-4 py-3 text-[15px]",
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={!ready || periods.length === 0}
          className={cn(pillClass, className)}
          aria-label={`Academic term: ${label}. Open to change semester.`}
        >
          <span className="truncate text-left flex-1 min-w-0">{label}</span>
          <ChevronDown className="w-5 h-5 shrink-0" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "header" ? "end" : "start"}
        className="max-h-[min(60vh,320px)] overflow-y-auto w-[min(calc(100vw-2rem),320px)]"
      >
        {periods.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => setSelectedPeriodId(p.id)}
            className={cn(p.id === selectedPeriodId && "bg-orange-50 font-semibold")}
          >
            {p.name}
            {p.isCurrent ? (
              <span className="ml-2 text-xs text-black/50 font-normal">(current)</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
