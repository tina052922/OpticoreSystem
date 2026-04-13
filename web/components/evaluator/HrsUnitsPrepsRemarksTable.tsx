/**
 * Sample institutional load summary — same copy and layout as College Admin Central Hub “Hrs” tab.
 */

type LoadRow = {
  faculty: string;
  hours: number;
  preps: number;
  units: number;
  designation: string;
  status: string;
  rate: number;
  remark: "Underloaded" | "Maximum" | "Overloaded";
};

const sampleLoadRows: LoadRow[] = [
  {
    faculty: "Juan Dela Cruz",
    hours: 10,
    preps: 3,
    units: 15,
    designation: "Instructor I",
    status: "Organic",
    rate: 250,
    remark: "Underloaded",
  },
  {
    faculty: "Ana Reyes",
    hours: 18,
    preps: 6,
    units: 24,
    designation: "Instructor (PT)",
    status: "Part-Time",
    rate: 200,
    remark: "Maximum",
  },
  {
    faculty: "Dr. Maria Santos",
    hours: 22,
    preps: 7,
    units: 30,
    designation: "Chair / Instructor",
    status: "Permanent",
    rate: 300,
    remark: "Overloaded",
  },
];

function remarkClass(r: LoadRow["remark"]) {
  if (r === "Underloaded") return "bg-green-100 text-green-900";
  if (r === "Maximum") return "bg-yellow-100 text-yellow-900";
  return "bg-red-100 text-red-900";
}

export function HrsUnitsPrepsRemarksTable() {
  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="p-4 border-b border-black/10">
        <div className="text-[16px] font-semibold">Hrs · Units · Preps · Remarks</div>
        <div className="text-[12px] text-black/60 mt-1">Institutional load policy summary (sample rows).</div>
      </div>
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#ff990a] text-white text-[11px]">
              <th className="border border-black/10 px-2 py-2 text-left">Faculty Name</th>
              <th className="border border-black/10 px-2 py-2 text-left">Hours/Week</th>
              <th className="border border-black/10 px-2 py-2 text-left">Preps</th>
              <th className="border border-black/10 px-2 py-2 text-left">Units</th>
              <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
              <th className="border border-black/10 px-2 py-2 text-left">Status</th>
              <th className="border border-black/10 px-2 py-2 text-left">Rate per Hour</th>
              <th className="border border-black/10 px-2 py-2 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {sampleLoadRows.map((r) => (
              <tr key={r.faculty} className="text-[11px]">
                <td className="border border-black/10 px-2 py-2 font-semibold">{r.faculty}</td>
                <td className="border border-black/10 px-2 py-2">{r.hours}</td>
                <td className="border border-black/10 px-2 py-2">{r.preps}</td>
                <td className="border border-black/10 px-2 py-2">{r.units}</td>
                <td className="border border-black/10 px-2 py-2">{r.designation}</td>
                <td className="border border-black/10 px-2 py-2">{r.status}</td>
                <td className="border border-black/10 px-2 py-2">₱{r.rate}</td>
                <td className="border border-black/10 px-2 py-2">
                  <span className={`px-2 py-1 rounded-md font-semibold ${remarkClass(r.remark)}`}>{r.remark}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
