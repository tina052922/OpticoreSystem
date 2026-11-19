"use client";

import { useEffect, useState } from "react";
import { ChairAssignmentWorkspace } from "@/components/admin/ChairAssignmentWorkspace";
import { CollegeCasChairsTab } from "@/components/admin/CollegeCasChairsTab";

/** CAS College Admin: Chairperson Assignment plus a CAS Chairs tab (as in DOI → College Admins & Chairpersons). */
export function CollegeChairAssignmentTabs({ collegeId }: { collegeId: string }) {
  const [tab, setTab] = useState<"programs" | "cas">("programs");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "cas") setTab("cas");
  }, []);
  const btn = (on: boolean) =>
    `h-10 px-4 rounded-[15px] font-bold text-[14px] ${
      on ? "bg-[#780301] text-white" : "bg-white text-black border border-black/10"
    }`;
  return (
    <div className="space-y-5">
      <div className="px-4 sm:px-6 lg:px-8 flex flex-wrap gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "programs"} className={btn(tab === "programs")} onClick={() => setTab("programs")}>
          Program chairs
        </button>
        <button type="button" role="tab" aria-selected={tab === "cas"} className={btn(tab === "cas")} onClick={() => setTab("cas")}>
          CAS Chairs
        </button>
      </div>
      {tab === "programs" ? (
        <ChairAssignmentWorkspace canManageAccounts />
      ) : (
        <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-[1100px]">
          <CollegeCasChairsTab collegeId={collegeId} />
        </div>
      )}
    </div>
  );
}
