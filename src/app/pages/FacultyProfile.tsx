import { useState } from "react";
import { Plus } from "lucide-react";

const facultyData = [
  {
    id: 1,
    name: "Dr. Maria Santos",
    aka: "Prof. Maria",
    bachelor: "BS Information Technology",
    master: "MIT",
    doctoral: "Ph.D. Computer Science",
    major1: "Software Engineering",
    major2: "Data Science",
    major3: "",
    minor1: "Web Development",
    minor2: "",
    minor3: "",
    research: "AI in Education",
    extension: "Community Tech Training",
    production: "",
    specialTraining: "Agile Development",
    status: "Permanent",
    designation: "Professor IV",
  },
  {
    id: 2,
    name: "Dr. Juan Dela Cruz",
    aka: "Prof. Juan",
    bachelor: "BS Computer Science",
    master: "MS Computer Science",
    doctoral: "Ph.D. Information Systems",
    major1: "Database Systems",
    major2: "Network Security",
    major3: "",
    minor1: "",
    minor2: "",
    minor3: "",
    research: "Cybersecurity",
    extension: "IT Consultation",
    production: "",
    specialTraining: "Cloud Computing",
    status: "Permanent",
    designation: "Associate Professor V",
  },
];

const designationData = [
  {
    faculty: "Dr. Maria Santos",
    status: "Permanent",
    designation: "Department Chair",
    number: "1",
    ratePerHour: "₱850.00",
  },
  {
    faculty: "Dr. Juan Dela Cruz",
    status: "Permanent",
    designation: "Program Coordinator",
    number: "1",
    ratePerHour: "₱750.00",
  },
];

const advisoryData = [
  { section: "BSIT 3A", adviser: "Dr. Maria Santos" },
  { section: "BSIT 3B", adviser: "Dr. Juan Dela Cruz" },
  { section: "BSCS 2A", adviser: "Dr. Pedro Reyes" },
  { section: "BSCS 2B", adviser: "Dr. Ana Garcia" },
];

export default function FacultyProfile() {
  const [activeTab, setActiveTab] = useState<"profile" | "designation" | "advisory">("profile");
  const [formData, setFormData] = useState({
    name: "",
    aka: "",
    bachelor: "",
    master: "",
    doctoral: "",
    major1: "",
    major2: "",
    major3: "",
    minor1: "",
    minor2: "",
    minor3: "",
    research: "",
    extension: "",
    production: "",
    specialTraining: "",
    status: "Permanent",
    designation: "",
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="font-['SF_Pro',sans-serif] font-semibold text-[40px] text-black mb-2">
          Faculty Profile
        </h2>
        <p className="font-['SF_Pro',sans-serif] font-normal text-[16px] text-black">
          Manage faculty information and assignments.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-6 py-3 font-['SF_Pro',sans-serif] font-semibold text-[16px] rounded-lg ${
            activeTab === "profile"
              ? "bg-[#ff990a] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
              : "bg-white text-black"
          }`}
        >
          Faculty Profile
        </button>
        <button
          onClick={() => setActiveTab("designation")}
          className={`px-6 py-3 font-['SF_Pro',sans-serif] font-semibold text-[16px] rounded-lg ${
            activeTab === "designation"
              ? "bg-[#ff990a] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
              : "bg-white text-black"
          }`}
        >
          Designation
        </button>
        <button
          onClick={() => setActiveTab("advisory")}
          className={`px-6 py-3 font-['SF_Pro',sans-serif] font-semibold text-[16px] rounded-lg ${
            activeTab === "advisory"
              ? "bg-[#ff990a] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
              : "bg-white text-black"
          }`}
        >
          Advisory
        </button>
      </div>

      {/* Faculty Profile Tab */}
      {activeTab === "profile" && (
        <div>
          <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6 mb-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[14px] text-black mb-1">
                  Faculty Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff990a]"
                  placeholder="Faculty Name"
                />
              </div>
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[14px] text-black mb-1">
                  A.K.A.
                </label>
                <input
                  type="text"
                  value={formData.aka}
                  onChange={(e) => setFormData({ ...formData, aka: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff990a]"
                  placeholder="A.K.A."
                />
              </div>
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[14px] text-black mb-1">
                  Bachelor's Degree
                </label>
                <input
                  type="text"
                  value={formData.bachelor}
                  onChange={(e) => setFormData({ ...formData, bachelor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff990a]"
                  placeholder="Bachelor's Degree"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[14px] text-black mb-1">
                  Master's Degree
                </label>
                <input
                  type="text"
                  value={formData.master}
                  onChange={(e) => setFormData({ ...formData, master: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff990a]"
                  placeholder="Master's Degree"
                />
              </div>
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[14px] text-black mb-1">
                  Doctoral Degree
                </label>
                <input
                  type="text"
                  value={formData.doctoral}
                  onChange={(e) => setFormData({ ...formData, doctoral: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff990a]"
                  placeholder="Doctoral Degree"
                />
              </div>
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[14px] text-black mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff990a]"
                >
                  <option>Permanent</option>
                  <option>Temporary</option>
                  <option>Contract of Service</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[14px] text-black mb-1">
                  Major 1
                </label>
                <input
                  type="text"
                  value={formData.major1}
                  onChange={(e) => setFormData({ ...formData, major1: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff990a]"
                  placeholder="Major 1"
                />
              </div>
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[14px] text-black mb-1">
                  Major 2
                </label>
                <input
                  type="text"
                  value={formData.major2}
                  onChange={(e) => setFormData({ ...formData, major2: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff990a]"
                  placeholder="Major 2"
                />
              </div>
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[14px] text-black mb-1">
                  Major 3
                </label>
                <input
                  type="text"
                  value={formData.major3}
                  onChange={(e) => setFormData({ ...formData, major3: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff990a]"
                  placeholder="Major 3"
                />
              </div>
            </div>

            <button className="bg-[#ff990a] text-white px-6 py-2 rounded-lg font-['SF_Pro',sans-serif] font-semibold text-[16px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center gap-2 hover:bg-[#e68909] transition-colors">
              <Plus className="w-5 h-5" />
              Add Faculty
            </button>
          </div>

          {/* Faculty Table */}
          <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#ff990a]">
                    <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                      Faculty Name
                    </th>
                    <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                      Bachelor's
                    </th>
                    <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                      Master's
                    </th>
                    <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                      Doctoral
                    </th>
                    <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                      Major 1
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facultyData.map((faculty) => (
                    <tr key={faculty.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                        {faculty.name}
                      </td>
                      <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                        {faculty.status}
                      </td>
                      <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                        {faculty.bachelor}
                      </td>
                      <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                        {faculty.master}
                      </td>
                      <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                        {faculty.doctoral}
                      </td>
                      <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                        {faculty.major1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Designation Tab */}
      {activeTab === "designation" && (
        <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#ff990a]">
                  <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                    Faculty Name
                  </th>
                  <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                    Designation
                  </th>
                  <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                    Number
                  </th>
                  <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                    Rate per Hour
                  </th>
                </tr>
              </thead>
              <tbody>
                {designationData.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                      {item.faculty}
                    </td>
                    <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                      {item.status}
                    </td>
                    <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                      {item.designation}
                    </td>
                    <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                      {item.number}
                    </td>
                    <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                      {item.ratePerHour}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advisory Tab */}
      {activeTab === "advisory" && (
        <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#ff990a]">
                  <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                    Advisory (Section)
                  </th>
                  <th className="px-4 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[14px] text-white">
                    Faculty (Adviser Name)
                  </th>
                </tr>
              </thead>
              <tbody>
                {advisoryData.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                      {item.section}
                    </td>
                    <td className="px-4 py-3 font-['SF_Pro',sans-serif] text-[14px] text-black">
                      {item.adviser}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
