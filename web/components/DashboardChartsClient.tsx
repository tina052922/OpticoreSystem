"use client";

import { useEffect, useState } from "react";
import { DashboardCharts } from "./DashboardCharts";

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <div className="h-[340px] rounded-lg bg-black/5 animate-pulse" />
      <div className="h-[340px] rounded-lg bg-black/5 animate-pulse" />
    </div>
  );
}

/** Charts only after mount so server HTML matches client (avoids dynamic/ssr:false hydration issues). */
export function DashboardChartsSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ChartsSkeleton />;
  }

  return <DashboardCharts />;
}
