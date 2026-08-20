import type { ReactNode } from "react";

export function DashboardCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl bg-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.12)] border border-black/5 overflow-hidden ${className}`}
    >
      <h2 className="text-[15px] sm:text-[16px] font-semibold text-black px-4 sm:px-5 py-3 border-b border-black/10 bg-black/[0.02]">
        {title}
      </h2>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
