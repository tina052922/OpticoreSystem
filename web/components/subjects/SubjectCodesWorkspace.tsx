"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BSIT_PROSPECTUS_SUBJECTS } from "@/lib/chairman/bsit-prospectus";

const subjects = BSIT_PROSPECTUS_SUBJECTS.map((s) => ({
  ...s,
  subcode: "" as const,
}));

export function SubjectCodesWorkspace() {
  return (
    <div className="px-8 pb-8 space-y-6">
      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <div className="text-[16px] font-semibold">Add Subject</div>
            <p className="text-[12px] text-black/55 mt-1">
              New offerings are created in Supabase; this list mirrors the official BSIT prospectus.
            </p>
          </div>
          <Button className="bg-[#ff990a] text-white">+ Add Subject</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            ["Subject Code", "e.g. CC-111"],
            ["Subcode", ""],
            ["Descriptive Title", ""],
            ["Lec Units", ""],
            ["Lec Hours", ""],
            ["Lab Units", ""],
            ["Lab Hours", ""],
          ].map(([label, ph]) => (
            <div key={label} className="space-y-1">
              <div className="text-sm font-medium">{label}</div>
              <Input placeholder={ph} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="p-4 border-b border-black/10">
          <div className="text-[16px] font-semibold">BSIT prospectus (reference)</div>
          <p className="text-[12px] text-black/55 mt-1">CMO No. 25 s. 2015 — effective A.Y. 2023–2024</p>
        </div>
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#ff990a] text-white text-[11px]">
                <th className="border border-black/10 px-2 py-2 text-left">Yr</th>
                <th className="border border-black/10 px-2 py-2 text-left">Subject Code</th>
                <th className="border border-black/10 px-2 py-2 text-left">Subcode</th>
                <th className="border border-black/10 px-2 py-2 text-left">Descriptive Title</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lec Units</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lec Hours</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lab Units</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lab Hours</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {subjects.map((s) => (
                <tr key={s.code}>
                  <td className="border border-black/10 px-2 py-2 tabular-nums">{s.yearLevel}</td>
                  <td className="border border-black/10 px-2 py-2 font-semibold">{s.code}</td>
                  <td className="border border-black/10 px-2 py-2">{s.subcode || "—"}</td>
                  <td className="border border-black/10 px-2 py-2">{s.title}</td>
                  <td className="border border-black/10 px-2 py-2">{s.lecUnits}</td>
                  <td className="border border-black/10 px-2 py-2">{s.lecHours}</td>
                  <td className="border border-black/10 px-2 py-2">{s.labUnits}</td>
                  <td className="border border-black/10 px-2 py-2">{s.labHours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
