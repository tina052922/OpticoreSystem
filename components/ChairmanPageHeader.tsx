import type { ReactNode } from "react";

/** Matches Opticore-CampusIntelligence module titles (Dashboard, INS, Inbox, Evaluator, etc.). */
export function ChairmanPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string | null;
  /** Shown to the right of the title (wraps under it on narrow screens). */
  actions?: ReactNode;
}) {
  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{title}</h2>
        {subtitle?.trim() ? (
          <p className="text-gray-600 text-sm leading-snug">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
