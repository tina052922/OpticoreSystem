import { useState } from "react";
import { Plus } from "lucide-react";

const subjectData = [
  {
    id: 1,
    code: "BSIT 3A",
    subcode: "40",
    title: "Enoc, AB",
    lab: "PC-3211",
    labLec: "Enoc, AB",
    labUnits: "CL3",
    lecUnits: "7:00-9:00",
    labHours: "M",
    lecHours: "",
  },
  {
    id: 2,
    code: "BSIT 3A",
    subcode: "40",
    title: "Enoc, AB",
    lab: "PC-3211L",
    labLec: "Enoc, AB",
    labUnits: "CL3",
    lecUnits: "9:00-11:00",
    labHours: "M",
    lecHours: "",
  },
  {
    id: 3,
    code: "BSIT 3A",
    subcode: "40",
    title: "Enoc, AB",
    lab: "PC-3211L",
    labLec: "Enoc, AB",
    labUnits: "CL3",
    lecUnits: "7:00-11:00",
    labHours: "W",
    lecHours: "",
  },
  {
    id: 4,
    code: "BSIT 3A",
    subcode: "40",
    title: "Enoc, AB",
    lab: "PC-3211L",
    labLec: "Enoc, AB",
    labUnits: "CL3",
    lecUnits: "7:00-10:00",
    labHours: "Th",
    lecHours: "",
  },
  {
    id: 5,
    code: "BSIT 3A",
    subcode: "40",
    title: "Enoc, AB",
    lab: "AP-4",
    labLec: "Enoc, AB",
    labUnits: "CL3",
    lecUnits: "15:00-17:00",
    labHours: "M",
    lecHours: "",
  },
  {
    id: 6,
    code: "BSIT 3A",
    subcode: "40",
    title: "Enoc, AB",
    lab: "AP-4",
    labLec: "Enoc, AB",
    labUnits: "CL4",
    lecUnits: "15:00-17:00",
    labHours: "W",
    lecHours: "",
  },
  {
    id: 7,
    code: "BSIT 3A",
    subcode: "40",
    title: "Enoc, AB",
    lab: "AP-4",
    labLec: "Enoc, AB",
    labUnits: "CL4",
    lecUnits: "8:00-9:00",
    labHours: "F",
    lecHours: "",
  },
  {
    id: 8,
    code: "BSIT 3A",
    subcode: "40",
    title: "Tomol, CJ",
    lab: "PC-329",
    labLec: "Tomol, CJ",
    labUnits: "CL4",
    lecUnits: "8:00-10:00",
    labHours: "T",
    lecHours: "",
  },
];

export default function SubjectCodes() {
  const [formData, setFormData] = useState({
    code: "",
    subcode: "",
    title: "",
    lab: "",
    labUnits: "",
    labHours: "",
    subjectLec: "",
    lecUnits: "",
    lecHours: "",
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="font-['SF_Pro',sans-serif] font-semibold text-[40px] text-black mb-2">
          Subject Codes
        </h2>
        <p className="font-['SF_Pro',sans-serif] font-normal text-[16px] text-black">
          High-level view of today's academic activity and room usage.
        </p>
      </div>

      {/* Form */}
      <div className="bg-[#ff990a] rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block font-['SF_Pro',sans-serif] text-[14px] text-white mb-1">
              Subject Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Subject Code"
            />
          </div>
          <div>
            <label className="block font-['SF_Pro',sans-serif] text-[14px] text-white mb-1">
              Subcode
            </label>
            <input
              type="text"
              value={formData.subcode}
              onChange={(e) => setFormData({ ...formData, subcode: e.target.value })}
              className="w-full px-3 py-2 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Subcode"
            />
          </div>
          <div>
            <label className="block font-['SF_Pro',sans-serif] text-[14px] text-white mb-1">
              Descriptive Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Descriptive Title"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block font-['SF_Pro',sans-serif] text-[14px] text-white mb-1">
              Subject Lab
            </label>
            <input
              type="text"
              value={formData.lab}
              onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
              className="w-full px-3 py-2 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Subject Lab"
            />
          </div>
          <div>
            <label className="block font-['SF_Pro',sans-serif] text-[14px] text-white mb-1">
              Lab Units
            </label>
            <input
              type="text"
              value={formData.labUnits}
              onChange={(e) => setFormData({ ...formData, labUnits: e.target.value })}
              className="w-full px-3 py-2 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Lab Units"
            />
          </div>
          <div>
            <label className="block font-['SF_Pro',sans-serif] text-[14px] text-white mb-1">
              Lab Hours
            </label>
            <input
              type="text"
              value={formData.labHours}
              onChange={(e) => setFormData({ ...formData, labHours: e.target.value })}
              className="w-full px-3 py-2 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Lab Hours"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block font-['SF_Pro',sans-serif] text-[14px] text-white mb-1">
              Subject Lec
            </label>
            <input
              type="text"
              value={formData.subjectLec}
              onChange={(e) => setFormData({ ...formData, subjectLec: e.target.value })}
              className="w-full px-3 py-2 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Subject Lec"
            />
          </div>
          <div>
            <label className="block font-['SF_Pro',sans-serif] text-[14px] text-white mb-1">
              Lec Units
            </label>
            <input
              type="text"
              value={formData.lecUnits}
              onChange={(e) => setFormData({ ...formData, lecUnits: e.target.value })}
              className="w-full px-3 py-2 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Lec Units"
            />
          </div>
          <div>
            <label className="block font-['SF_Pro',sans-serif] text-[14px] text-white mb-1">
              Lec Hours
            </label>
            <input
              type="text"
              value={formData.lecHours}
              onChange={(e) => setFormData({ ...formData, lecHours: e.target.value })}
              className="w-full px-3 py-2 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Lec Hours"
            />
          </div>
        </div>

        <button className="bg-white text-[#ff990a] px-6 py-2 rounded-lg font-['SF_Pro',sans-serif] font-semibold text-[16px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center gap-2 hover:bg-gray-100 transition-colors">
          <Plus className="w-5 h-5" />
          Add Subject
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#ff990a]">
                <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                  Subject Code
                </th>
                <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                  Subcode
                </th>
                <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                  Descriptive Title
                </th>
                <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                  Subject Lab
                </th>
                <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                  Subject Lec
                </th>
                <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                  Lab Units
                </th>
                <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                  Lec Units
                </th>
                <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                  Lab Hours
                </th>
                <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                  Lec Hours
                </th>
              </tr>
            </thead>
            <tbody>
              {subjectData.map((subject) => (
                <tr key={subject.id} className="border-b border-[rgba(0,0,0,0.5)] hover:bg-gray-50">
                  <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                    {subject.code}
                  </td>
                  <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                    {subject.subcode}
                  </td>
                  <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                    {subject.title}
                  </td>
                  <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                    {subject.lab}
                  </td>
                  <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                    {subject.labLec}
                  </td>
                  <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                    {subject.labUnits}
                  </td>
                  <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                    {subject.lecUnits}
                  </td>
                  <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                    {subject.labHours}
                  </td>
                  <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                    {subject.lecHours}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
