"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/portal/DashboardCard";

/**
 * Reference: vacant GEC editing happens in Central Hub Evaluator after per-college College Admin approval.
 */
export function GecVacantSlotsClient() {
  return (
    <div className="px-4 sm:px-8 pb-10 max-w-5xl space-y-6">
      <DashboardCard title="Vacant GEC slots">
        <p className="text-sm text-black/75 mb-4">
          Use the <strong>Central Hub Evaluator</strong>, select a college, then edit vacant GEC rows. Access is approved{" "}
          <strong>per college</strong> from <Link href="/admin/gec/request-access" className="text-[#780301] font-semibold underline">Request access</Link>.
        </p>
        <Button type="button" asChild className="bg-[#780301] hover:bg-[#5a0201] text-white font-semibold">
          <Link href="/admin/gec/evaluator">Open Central Hub Evaluator</Link>
        </Button>
      </DashboardCard>
    </div>
  );
}
