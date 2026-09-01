"use client";

import { Moon, Sun } from "lucide-react";
import { useProgramSession } from "@/contexts/ProgramSessionContext";
import { cn } from "@/components/ui/utils";

export function ProgramSessionSwitch({ className }: { className?: string }) {
  const { programSession, setProgramSession } = useProgramSession();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-black/15 bg-white p-0.5 text-xs font-semibold shadow-sm no-print",
        className,
      )}
      role="group"
      aria-label="Day or Evening program"
    >
      <button
        type="button"
        onClick={() => setProgramSession("day")}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors",
          programSession === "day" ? "bg-[#780301] text-white" : "text-black/70 hover:bg-black/5",
        )}
      >
        <Sun className="size-3.5" aria-hidden />
        Day Program
      </button>
      <button
        type="button"
        onClick={() => setProgramSession("night")}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors",
          programSession === "night" ? "bg-[#1e3a5f] text-white" : "text-black/70 hover:bg-black/5",
        )}
      >
        <Moon className="size-3.5" aria-hidden />
        Evening Program
      </button>
    </div>
  );
}
