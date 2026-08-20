import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";

type CampusNavigationPlaceholderProps = {
  backHref: string;
  backLabel?: string;
};

export function CampusNavigationPlaceholder({ backHref, backLabel = "Back to home" }: CampusNavigationPlaceholderProps) {
  return (
    <div className="min-h-screen bg-[var(--color-opticore-bg)] flex flex-col">
      <header className="min-h-[72px] sm:min-h-[88px] bg-gradient-to-r from-[var(--color-opticore-red-1)] to-[var(--color-opticore-red-2)] shadow-md flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ctulogo.svg" alt="" className="h-10 w-10 sm:h-12 sm:w-12 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm sm:text-base truncate">Campus navigation</p>
            <p className="text-white/85 text-xs truncate">OptiCore · CTU Argao</p>
          </div>
        </div>
        <Link href={backHref} className="text-xs sm:text-sm font-semibold text-white/95 hover:underline shrink-0">
          {backLabel}
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 max-w-lg mx-auto w-full text-center">
        <div className="rounded-2xl bg-white border border-black/10 shadow-[0px_4px_4px_rgba(0,0,0,0.08)] p-8 sm:p-10 space-y-4">
          <div className="flex justify-center text-[var(--color-opticore-orange)]">
            <Navigation className="w-12 h-12" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-black">Campus Navigation Module</h1>
          <p className="text-sm sm:text-base text-black/65 leading-relaxed">
            Interactive maps and turn-by-turn directions are coming soon. This module will connect to official room data
            and schedules across OptiCore.
          </p>
          <div className="pt-2 flex justify-center">
            <MapPin className="w-8 h-8 text-black/20" />
          </div>
        </div>
      </main>
    </div>
  );
}
