import Link from "next/link";
import { ExternalLink, ClipboardList } from "lucide-react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { Button } from "@/components/ui/button";

/** College Admin read-only path: same Evaluator data as Chairman, scoped to your college in production. */
export default function CollegeScheduleReviewPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Schedule review"
        subtitle="Inspect the plotted draft and Evaluator context. Chairman Admin owns editing; you finalize and forward via Inbox."
      />
      <div className="px-8 pb-10 max-w-3xl space-y-6">
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ClipboardList className="w-6 h-6 text-[var(--color-opticore-orange)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-black/80 leading-relaxed">
                Open the <strong>Evaluator</strong> in a new tab to view the same timetable, faculty load panel, and
                conflict status as the Chairman (read-only for your role in a full deployment). Here we link to the
                shared module for development.
              </p>
            </div>
          </div>
          <Button asChild className="bg-[#780301] hover:bg-[#5a0201]">
            <Link href="/admin/college/evaluator">
              Open Central Hub Evaluator
              <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-black/45">
          Scope note: production builds would hide edit actions and filter rows to your college automatically.
        </p>
      </div>
    </div>
  );
}
