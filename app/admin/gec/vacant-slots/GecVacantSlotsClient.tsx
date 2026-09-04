"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/portal/DashboardCard";

/**
 * Vacant GEC editing happens in Central Hub Evaluator within the selected college / department.
 */
export function GecVacantSlotsClient() {
  return (
    <div className="px-4 sm:px-8 pb-10 max-w-5xl space-y-6">
      <DashboardCard title="Vacant GEC slots">
        <p className="text-sm text-black/75 mb-4">
          Use the <strong>Central Hub Evaluator</strong>, select a college (and department / section), then plot vacant
          GEC rows. Major subjects stay read-only. You can only edit vacant GEC slots in the scope you selected.
        </p>
        <Button type="button" asChild className="bg-[#780301] hover:bg-[#5a0201] text-white font-semibold">
          <Link href="/admin/gec/evaluator">Open Central Hub Evaluator</Link>
        </Button>
      </DashboardCard>
    </div>
  );
}
