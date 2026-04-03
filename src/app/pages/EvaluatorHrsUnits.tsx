const facultyData = [
  {
    id: 1,
    faculty: "Dr. Maria Santos",
    hrsPerWeek: 18,
    preps: 3,
    units: 18,
    designation: "Department Chair",
    status: "Permanent",
    ratePerHour: "₱850.00",
    salaryPerMonth: "₱61,200.00",
    research: "AI in Education",
    remarks: "Within limits",
  },
  {
    id: 2,
    faculty: "Dr. Juan Dela Cruz",
    hrsPerWeek: 21,
    preps: 4,
    units: 21,
    designation: "Program Coordinator",
    status: "Permanent",
    ratePerHour: "₱750.00",
    salaryPerMonth: "₱63,000.00",
    research: "Cybersecurity",
    remarks: "Within limits",
  },
  {
    id: 3,
    faculty: "Prof. Pedro Reyes",
    hrsPerWeek: 24,
    preps: 5,
    units: 24,
    designation: "Instructor",
    status: "Permanent",
    ratePerHour: "₱650.00",
    salaryPerMonth: "₱62,400.00",
    research: "Mobile App Development",
    remarks: "Max hours reached",
  },
  {
    id: 4,
    faculty: "Prof. Ana Garcia",
    hrsPerWeek: 15,
    preps: 3,
    units: 15,
    designation: "Instructor",
    status: "Temporary",
    ratePerHour: "₱500.00",
    salaryPerMonth: "₱30,000.00",
    research: "",
    remarks: "Within limits",
  },
];

export default function EvaluatorHrsUnits() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="font-['SF_Pro',sans-serif] font-semibold text-[40px] text-black mb-2">
          Evaluator - Hrs-Units-Preps-Remarks
        </h2>
        <p className="font-['SF_Pro',sans-serif] font-normal text-[16px] text-black">
          Faculty workload analysis and constraints.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Table - 2/3 width */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#ff990a]">
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Faculty
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Hrs/wk
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Preps
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Units
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Designation
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Rate per Hour
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Salary per Month
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Research
                    </th>
                    <th className="px-3 py-3 text-left font-['SF_Pro',sans-serif] font-bold text-[12px] text-white">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facultyData.map((faculty) => (
                    <tr key={faculty.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {faculty.faculty}
                      </td>
                      <td className="px-3 py-3 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {faculty.hrsPerWeek}
                      </td>
                      <td className="px-3 py-3 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {faculty.preps}
                      </td>
                      <td className="px-3 py-3 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {faculty.units}
                      </td>
                      <td className="px-3 py-3 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {faculty.designation}
                      </td>
                      <td className="px-3 py-3 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {faculty.status}
                      </td>
                      <td className="px-3 py-3 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {faculty.ratePerHour}
                      </td>
                      <td className="px-3 py-3 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {faculty.salaryPerMonth}
                      </td>
                      <td className="px-3 py-3 font-['SF_Pro',sans-serif] text-[12px] text-black">
                        {faculty.research}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-1 text-[10px] rounded ${
                            faculty.remarks === "Within limits"
                              ? "bg-green-500 text-white"
                              : "bg-yellow-500 text-white"
                          }`}
                        >
                          {faculty.remarks}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Constraints Panel - 1/3 width */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
            <h3 className="font-['SF_Pro',sans-serif] font-semibold text-[18px] text-black mb-4 border-b pb-2">
              Constraints
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-['SF_Pro',sans-serif] font-semibold text-[14px] text-[#ff990a] mb-2">
                  Workload Limits
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      Min Preparations:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      1
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      Max Preparations:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      6
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      Min Hours/week:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      6
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      Max Hours/week:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      24
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      Min Units:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      6
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      Max Units:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      24
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-['SF_Pro',sans-serif] font-semibold text-[14px] text-[#ff990a] mb-2">
                  Designation Limits
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      Chair/Director:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      6-18 hrs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      Program Coordinator:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      15-21 hrs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      Regular Faculty:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      18-24 hrs
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-['SF_Pro',sans-serif] font-semibold text-[14px] text-[#ff990a] mb-2">
                  Degree-Based Rates
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      BS Rate per Hour:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      ₱500.00
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      MA/MS Rate per Hour:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      ₱650.00
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                      Doctoral Rate per Hour:
                    </span>
                    <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                      ₱850.00
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-['SF_Pro',sans-serif] font-semibold text-[14px] text-[#ff990a] mb-2">
                  Institution Salary Budget
                </h4>
                <div className="flex justify-between">
                  <span className="font-['SF_Pro',sans-serif] text-[12px] text-gray-600">
                    Total Monthly:
                  </span>
                  <span className="font-['SF_Pro',sans-serif] text-[12px] text-black font-semibold">
                    ₱216,600.00
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
