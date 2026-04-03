import { Plus, MoreVertical } from 'lucide-react';

export function SubjectCodes() {
  const subjectData = [
    { code: 'BST-01', subcode: '01', title: 'Database Management Systems', totalUnits: '3', lab: 'Lab A', labUnits: '1', labHrs: '3', lec: 'Lec A', lecUnits: '2', lecHrs: '2' },
    { code: 'BST-02', subcode: '02', title: 'Data Structures and Algorithms', totalUnits: '3', lab: 'Lab B', labUnits: '1', labHrs: '3', lec: 'Lec B', lecUnits: '2', lecHrs: '2' },
    { code: 'BST-03', subcode: '03', title: 'Computer Networks', totalUnits: '3', lab: 'Lab C', labUnits: '1', labHrs: '3', lec: 'Lec C', lecUnits: '2', lecHrs: '2' },
    { code: 'BST-04', subcode: '04', title: 'Operating Systems', totalUnits: '3', lab: 'Lab D', labUnits: '1', labHrs: '3', lec: 'Lec D', lecUnits: '2', lecHrs: '2' },
    { code: 'BST-05', subcode: '05', title: 'Software Engineering', totalUnits: '3', lab: 'Lab E', labUnits: '1', labHrs: '3', lec: 'Lec E', lecUnits: '2', lecHrs: '2' },
    { code: 'BST-06', subcode: '06', title: 'Web Development', totalUnits: '4', lab: 'Lab F', labUnits: '2', labHrs: '6', lec: 'Lec F', lecUnits: '2', lecHrs: '2' },
    { code: 'BST-07', subcode: '07', title: 'System Administration', totalUnits: '3', lab: 'Lab G', labUnits: '1', labHrs: '3', lec: 'Lec G', lecUnits: '2', lecHrs: '2' },
    { code: 'BST-08', subcode: '08', title: 'Mobile Application Development', totalUnits: '4', lab: 'Lab H', labUnits: '2', labHrs: '6', lec: 'Lec H', lecUnits: '2', lecHrs: '2' },
    { code: 'BST-09', subcode: '09', title: 'Artificial Intelligence', totalUnits: '3', lab: 'Lab I', labUnits: '1', labHrs: '3', lec: 'Lec I', lecUnits: '2', lecHrs: '2' },
    { code: 'BST-10', subcode: '10', title: 'Cybersecurity Fundamentals', totalUnits: '3', lab: 'Lab J', labUnits: '1', labHrs: '3', lec: 'Lec J', lecUnits: '2', lecHrs: '2' },
    { code: 'BST-11', subcode: '11', title: 'Cloud Computing', totalUnits: '3', lab: 'Lab K', labUnits: '1', labHrs: '3', lec: 'Lec K', lecUnits: '2', lecHrs: '2' },
  ];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Subject Codes</h2>
        <p className="text-gray-600 text-sm">Manage subject codes, descriptions, and units.</p>
      </div>

      {/* Subject Code Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </div>
          <button className="px-6 py-2 bg-[#FF990A] text-white rounded-lg font-medium hover:bg-[#e88909] transition-colors flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Subject
          </button>
        </div>

        {/* Form Grid - Exact Field Sequence */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject Code</label>
            <input
              type="text"
              placeholder="Subject Code"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subcode</label>
            <input
              type="text"
              placeholder="Subcode"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descriptive Title</label>
            <input
              type="text"
              placeholder="Descriptive Title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Units</label>
            <input
              type="text"
              placeholder="Total Units"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject Lab</label>
            <input
              type="text"
              placeholder="Subject Lab"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lab Units</label>
            <input
              type="text"
              placeholder="Lab Units"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lab Hours</label>
            <input
              type="text"
              placeholder="Lab Hours"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject Lec</label>
            <input
              type="text"
              placeholder="Subject Lec"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lec Units</label>
            <input
              type="text"
              placeholder="Lec Units"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lec Hours</label>
            <input
              type="text"
              placeholder="Lec Hours"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Subject Codes Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#FF990A] text-white">
                <th className="px-4 py-3 text-left text-sm font-semibold">Subject Code</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Subcode</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Descriptive Title</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Total Units</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Subject Lab</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Lab Units</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Lab Hours</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Subject Lec</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Lec Units</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Lec Hours</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjectData.map((subject, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{subject.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{subject.subcode}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{subject.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{subject.totalUnits}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{subject.lab}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{subject.labUnits}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{subject.labHrs}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{subject.lec}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{subject.lecUnits}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{subject.lecHrs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
