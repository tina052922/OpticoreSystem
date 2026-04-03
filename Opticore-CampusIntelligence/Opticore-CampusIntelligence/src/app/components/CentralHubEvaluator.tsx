import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export function CentralHubEvaluator() {
  const [activeTab, setActiveTab] = useState('colleges');
  const [selectedDepartment, setSelectedDepartment] = useState('BSIT');
  const [hasAccess, setHasAccess] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState('');
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [pendingCollege, setPendingCollege] = useState({ name: '', code: '' });

  const timetablingData = [
    { major: 'BST-01', section: 'M', students: 'PC-DATA', code: 'Elem. AB', instructor: 'CA-3', room: '8:00-9:00', time: 'M', day: '', facultyConflict: '', sectionConflict: '', roomConflict: '' },
    { major: 'BST-02', section: 'M', students: 'PC-DATA', code: 'Elem. AB', instructor: 'CA-3', room: '9:00-10:00', time: 'M', day: '', facultyConflict: '', sectionConflict: '', roomConflict: '' },
    { major: 'BST-03', section: 'M', students: 'PC-NETW', code: 'Elem. AB', instructor: 'CA-3', room: '9:00-10:00', time: 'M', day: '', facultyConflict: '', sectionConflict: '', roomConflict: '' },
    { major: 'BST-04', section: 'M', students: 'PC-NETW', code: 'Elem. AB', instructor: 'CA-3', room: '10:00-11:00', time: 'M', day: '', facultyConflict: '', sectionConflict: '', roomConflict: '' },
    { major: 'BST-05', section: 'M', students: 'AP-4', code: 'Elem. AB', instructor: 'CA-3', room: '10:00-11:00', time: 'M', day: '', facultyConflict: '', sectionConflict: '', roomConflict: '' },
    { major: 'BST-06', section: 'M', students: 'AP-4', code: 'Elem. AB', instructor: 'CA-3', room: '14:00-15:00', time: 'M', day: '', facultyConflict: '', sectionConflict: '', roomConflict: '' },
    { major: 'BST-07', section: 'M', students: 'PC-SYSW', code: 'Teves. C.J', instructor: 'CA-3', room: '16:00-17:00', time: 'M', day: '', facultyConflict: '', sectionConflict: '', roomConflict: '' },
    { major: 'BST-08', section: 'M', students: 'AP-4', code: 'Teves. K', instructor: 'CA-1', room: '14:00-15:00', time: 'T', day: '', facultyConflict: '', sectionConflict: '', roomConflict: '' },
    { major: 'BST-09', section: 'M', students: 'AP-4', code: 'Teves. K', instructor: 'CA-3', room: '14:00-15:00', time: 'T', day: '', facultyConflict: '', sectionConflict: '', roomConflict: '' },
    { major: 'BST-10', section: 'M', students: 'PC-SYSW', code: 'Teves. K', instructor: 'CA-3', room: '14:00-15:00', time: 'Tle', day: '', facultyConflict: '', sectionConflict: '', roomConflict: '' },
  ];

  const workloadData = [
    { faculty: 'Atienza, N.', hrs: 3, preps: 1, units: 3, designation: 'Executive Chair', status: 'Organic', rate: 1, salary: 'PHP 30,000', research: '', remarks: '' },
    { faculty: 'Atienza, P.', hrs: 18, preps: 2, units: 18, designation: 'No Admin', status: 'Organic', rate: 1, salary: 'PHP 45,000', research: '', remarks: '' },
    { faculty: 'Belondo, T.', hrs: 21, preps: 3, units: 21, designation: 'No Admin', status: 'Organic', rate: 1, salary: 'PHP 52,500', research: '', remarks: '' },
    { faculty: 'Cabahug, E.', hrs: 15, preps: 2, units: 15, designation: 'No Admin', status: 'Organic', rate: 1, salary: 'PHP 37,500', research: '', remarks: '' },
    { faculty: 'Diez, R.', hrs: 24, preps: 4, units: 24, designation: 'No Admin', status: 'Organic', rate: 1, salary: 'PHP 60,000', research: '', remarks: '' },
    { faculty: 'Garcia, J.', hrs: 12, preps: 2, units: 12, designation: 'Program Head', status: 'Organic', rate: 1, salary: 'PHP 32,000', research: '', remarks: '' },
  ];

  const handleRequestAccess = (college: { name: string; code: string }) => {
    setPendingCollege(college);
    setShowAccessDialog(true);
  };

  const handleApproveAccess = () => {
    setSelectedCollege(pendingCollege.code);
    setHasAccess(true);
    setShowAccessDialog(false);
    setActiveTab('timetabling');
  };

  const handleDenyAccess = () => {
    setShowAccessDialog(false);
    setPendingCollege({ name: '', code: '' });
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Central Hub Evaluator</h2>
        <p className="text-gray-600 text-sm">High-level view of today's academic activity and room usage.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('colleges')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'colleges'
              ? 'bg-[#FF990A] text-white rounded-t-lg'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Colleges
        </button>
        {hasAccess && (
          <>
            <button
              onClick={() => setActiveTab('timetabling')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'timetabling'
                  ? 'bg-[#FF990A] text-white rounded-t-lg'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Timetabling & Optimization
            </button>
            <button
              onClick={() => setActiveTab('workload')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'workload'
                  ? 'bg-[#FF990A] text-white rounded-t-lg'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Hrs-Units-Preps-Remarks
            </button>
          </>
        )}
      </div>

      {/* Access Request Dialog */}
      {showAccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Access Request</h3>
              <button onClick={handleDenyAccess} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                You are requesting access to:
              </p>
              <p className="text-lg font-semibold text-gray-800 mb-1">{pendingCollege.name}</p>
              <p className="text-gray-600">({pendingCollege.code})</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                This request requires approval. For demonstration purposes, you can approve it immediately.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApproveAccess}
                className="flex-1 px-6 py-3 bg-[#FF990A] text-white rounded-lg font-medium hover:bg-[#e88909] transition-colors"
              >
                Approve Access
              </button>
              <button
                onClick={handleDenyAccess}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Colleges View */}
      {activeTab === 'colleges' && (
        <div className="grid grid-cols-2 gap-6 pt-12">
          {[
            { name: 'College of Technology and Engineering', code: 'COTE' },
            { name: 'College of Arts And Sciences', code: 'CAS' },
            { name: 'College of Education', code: 'COED' },
            { name: 'College of Agriculture, Forestry, & Environmental Science', code: 'CAFE' },
          ].map((college) => (
            <div key={college.code} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-xl font-bold text-gray-800 mb-2">{college.name}</div>
              <div className="text-lg text-gray-600 mb-6">({college.code})</div>
              <button
                onClick={() => handleRequestAccess(college)}
                className="px-8 py-3 bg-[#FF990A] text-white rounded-lg font-medium hover:bg-[#e88909] transition-colors"
              >
                Request Access
              </button>
            </div>
          ))}
          <div className="col-span-2 flex justify-center">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center w-1/2">
              <div className="text-xl font-bold text-gray-800 mb-2">College of Hospitality Management & Tourism</div>
              <div className="text-lg text-gray-600 mb-6">(CHMT)</div>
              <button
                onClick={() => handleRequestAccess({ name: 'College of Hospitality Management & Tourism', code: 'CHMT' })}
                className="px-8 py-3 bg-[#FF990A] text-white rounded-lg font-medium hover:bg-[#e88909] transition-colors"
              >
                Request Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timetabling & Optimization View */}
      {activeTab === 'timetabling' && hasAccess && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Select Department:</label>
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
                >
                  <option value="BSIT">BSIT</option>
                  <option value="BIT">BIT</option>
                  <option value="BSIE">BSIE</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-2 bg-[#FF990A] text-white rounded-lg font-medium hover:bg-[#e88909] transition-colors">
                Preview Schedule
              </button>
              <button className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                Alternative Suggestions
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#FF990A] text-white">
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">
                      <div className="flex items-center justify-between">
                        Major
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">
                      <div className="flex items-center justify-between">
                        Section
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">
                      <div className="flex items-center justify-between">
                        Students
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">
                      <div className="flex items-center justify-between">
                        Subject Code
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">
                      <div className="flex items-center justify-between">
                        Instructor
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">
                      <div className="flex items-center justify-between">
                        Room
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">
                      <div className="flex items-center justify-between">
                        Time
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">
                      <div className="flex items-center justify-between">
                        Day
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">Faculty Conflict</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">Section Conflict</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold border border-gray-300">Room Conflict</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {timetablingData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300">
                        <input type="text" value={row.major} className="w-full bg-transparent focus:outline-none" readOnly />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300">
                        <input type="text" value={row.section} className="w-full bg-transparent focus:outline-none" readOnly />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300">
                        <input type="text" value={row.students} className="w-full bg-transparent focus:outline-none" readOnly />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300">
                        <input type="text" value={row.code} className="w-full bg-transparent focus:outline-none" readOnly />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300">
                        <input type="text" value={row.instructor} className="w-full bg-transparent focus:outline-none" readOnly />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300">
                        <input type="text" value={row.room} className="w-full bg-transparent focus:outline-none" readOnly />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300">
                        <input type="text" value={row.time} className="w-full bg-transparent focus:outline-none" readOnly />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300">
                        <input type="text" value={row.day} className="w-full bg-transparent focus:outline-none" readOnly />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300 bg-gray-100">
                        {row.facultyConflict}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300 bg-gray-100">
                        {row.sectionConflict}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 border border-gray-300 bg-gray-100">
                        {row.roomConflict}
                      </td>
                    </tr>
                  ))}
                  {/* Empty rows */}
                  {[...Array(5)].map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="px-3 py-2 text-sm border border-gray-300">&nbsp;</td>
                      <td className="px-3 py-2 text-sm border border-gray-300">&nbsp;</td>
                      <td className="px-3 py-2 text-sm border border-gray-300">&nbsp;</td>
                      <td className="px-3 py-2 text-sm border border-gray-300">&nbsp;</td>
                      <td className="px-3 py-2 text-sm border border-gray-300">&nbsp;</td>
                      <td className="px-3 py-2 text-sm border border-gray-300">&nbsp;</td>
                      <td className="px-3 py-2 text-sm border border-gray-300">&nbsp;</td>
                      <td className="px-3 py-2 text-sm border border-gray-300">&nbsp;</td>
                      <td className="px-3 py-2 text-sm border border-gray-300 bg-gray-100">&nbsp;</td>
                      <td className="px-3 py-2 text-sm border border-gray-300 bg-gray-100">&nbsp;</td>
                      <td className="px-3 py-2 text-sm border border-gray-300 bg-gray-100">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Hrs-Units-Preps-Remarks View */}
      {activeTab === 'workload' && (
        <div className="flex gap-6">
          {/* Main Workload Table */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#FF990A] text-white">
                    <th className="px-3 py-3 text-left text-sm font-semibold">Faculty</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Hrs/wk</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Preps</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Units</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Designation</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Rate per Hour</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Salary per Month</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Research</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workloadData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm text-gray-700">{row.faculty}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{row.hrs}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{row.preps}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{row.units}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{row.designation}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{row.status}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{row.rate}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{row.salary}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{row.research}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{row.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Constraints Panel */}
          <div className="w-96 bg-yellow-100 rounded-lg shadow-sm border-2 border-yellow-400 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Constraints</h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Inst 1 Salary per Month</label>
                <input type="text" value="PHP 25,000" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white" readOnly />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Min Preparations</label>
                  <input type="text" value="1" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white" readOnly />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Max Preparations</label>
                  <input type="text" value="4" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white" readOnly />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Min Hours/week</label>
                  <input type="text" value="3" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white" readOnly />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Max Hours/week</label>
                  <input type="text" value="24" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white" readOnly />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Min Units</label>
                  <input type="text" value="3" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white" readOnly />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Max Units</label>
                  <input type="text" value="24" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white" readOnly />
                </div>
              </div>

              <div className="pt-4 border-t border-yellow-400">
                <h4 className="text-sm font-bold text-gray-800 mb-3">Designation-based Limits</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Executive Chair:</span>
                    <span className="font-semibold">3-12 hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Program Head:</span>
                    <span className="font-semibold">6-18 hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>No Designation:</span>
                    <span className="font-semibold">3-24 hrs</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-yellow-400">
                <h4 className="text-sm font-bold text-gray-800 mb-3">Degree-based Rates</h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">BS Rate per Hour</label>
                    <input type="text" value="PHP 500" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white" readOnly />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">MA/MS Rate per Hour</label>
                    <input type="text" value="PHP 750" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white" readOnly />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Doctoral Rate per Hour</label>
                    <input type="text" value="PHP 1,000" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white" readOnly />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}