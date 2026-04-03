"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FacultyProfileWorkspace() {
  const [tab, setTab] = useState<"profile" | "designation" | "advisory">("profile");

  return (
    <div className="px-8 pb-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "profile" as const, label: "Faculty Profile" },
            { id: "designation" as const, label: "Designation" },
            { id: "advisory" as const, label: "Advisory" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`h-10 px-4 rounded-[15px] font-bold text-[14px] ${
                tab === t.id ? "bg-[#ff990a] text-white" : "bg-white text-black border border-black/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Button className="bg-[#ff990a] text-white">+ Add Faculty</Button>
      </div>

      {tab === "profile" ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              ["Full Name", "Juan Dela Cruz"],
              ["A.K.A.", "Juan"],
              ["BS Degree", "BS Information Technology"],
              ["MS Degree", ""],
              ["Doctoral Degree", ""],
              ["Major 1", "Software Engineering"],
              ["Major 2", ""],
              ["Major 3", ""],
              ["Minor 1", "Web Development"],
              ["Minor 2", ""],
              ["Minor 3", ""],
              ["Research", ""],
              ["Extension", ""],
              ["Production", ""],
              ["Special Training", ""],
              ["Status", "Organic"],
              ["Administrative Designation", "Instructor I"],
            ].map(([label, val]) => (
              <div key={label} className="space-y-1">
                <div className="text-sm font-medium">{label}</div>
                <Input defaultValue={val} />
              </div>
            ))}
          </div>

          <div className="mt-8">
            <div className="text-[16px] font-semibold mb-3">Faculty List</div>
            <div className="overflow-auto rounded-xl border border-black/10">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#ff990a] text-white text-[11px]">
                    <th className="border border-black/10 px-2 py-2 text-left">Name</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Status</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Program</th>
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  <tr>
                    <td className="border border-black/10 px-2 py-2">Juan Dela Cruz</td>
                    <td className="border border-black/10 px-2 py-2">Organic</td>
                    <td className="border border-black/10 px-2 py-2">Instructor I</td>
                    <td className="border border-black/10 px-2 py-2">BSIT</td>
                  </tr>
                  <tr>
                    <td className="border border-black/10 px-2 py-2">Ana Reyes</td>
                    <td className="border border-black/10 px-2 py-2">Part-Time</td>
                    <td className="border border-black/10 px-2 py-2">Instructor (PT)</td>
                    <td className="border border-black/10 px-2 py-2">BSIT</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "designation" ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
          <div className="text-[16px] font-semibold mb-3">Designations</div>
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#ff990a] text-white text-[11px]">
                  <th className="border border-black/10 px-2 py-2 text-left">Faculty</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Effective</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                <tr>
                  <td className="border border-black/10 px-2 py-2">Dr. Maria Santos</td>
                  <td className="border border-black/10 px-2 py-2">Program Chair</td>
                  <td className="border border-black/10 px-2 py-2">AY 2025-2026</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "advisory" ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
          <div className="text-[16px] font-semibold mb-3">Advisory Assignments</div>
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#ff990a] text-white text-[11px]">
                  <th className="border border-black/10 px-2 py-2 text-left">Adviser</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Section</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Students</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                <tr>
                  <td className="border border-black/10 px-2 py-2">Dr. Maria Santos</td>
                  <td className="border border-black/10 px-2 py-2">BSIT 2A</td>
                  <td className="border border-black/10 px-2 py-2">40</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
