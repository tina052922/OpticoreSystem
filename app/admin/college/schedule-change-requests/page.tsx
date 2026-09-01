import Link from "next/link";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";

export default function CollegeScheduleChangeRequestsPage() {
  return (
    <div>
      <ChairmanPageHeader title="Schedule change requests" />
      <div className="px-4 md:px-8 pb-10 max-w-2xl">
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-6 text-[14px] text-amber-950 leading-relaxed">
          Instructor schedule-change requests are reviewed by the{" "}
          <strong>Program Chairman</strong> (conflict check, approve, or reject). This college-admin queue is no
          longer used.
        </div>
        <p className="mt-4 text-[13px] text-black/60">
          Open{" "}
          <Link href="/admin/college/evaluator" className="font-semibold text-[#780301] hover:underline">
            Evaluator
          </Link>{" "}
          to plot and edit schedules for your college.
        </p>
      </div>
    </div>
  );
}
