import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";

/** Placeholder: list GEC course rows to assign per GEC Chairman (integrate with Evaluator filters later). */
export default function CasGecDistributionPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="GEC distribution"
        subtitle="Send GEC-only schedule slices to the correct GEC Chairman. Non-GEC rows stay read-only."
      />
      <div className="px-8 pb-10 max-w-4xl space-y-6">
        <DashboardCard title="Distribution queue (demo)">
          <p className="text-sm text-black/75 leading-relaxed">
            In production this view filters <strong>ScheduleEntry</strong> rows linked to GEC subjects and lets you
            assign a recipient GEC Chairman before notifying them via Inbox. The inbox message{" "}
            <code className="text-xs bg-black/[0.06] px-1 rounded">cas_to_gec</code> demonstrates the notification
            path.
          </p>
          <ul className="mt-4 text-sm text-black/60 list-disc pl-5 space-y-1">
            <li>Select academic period and college.</li>
            <li>Preview GEC rows only (vacant slots highlighted).</li>
            <li>Send distribution — creates an Inbox entry for the GEC portal.</li>
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
}
