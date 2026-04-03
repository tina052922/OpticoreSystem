import { useState, useRef } from 'react';
import { MoreVertical, ChevronDown, Download, Share2, Printer } from 'lucide-react';

export function INSForm() {
  const [activeTab, setActiveTab] = useState<'faculty' | 'section' | 'room'>('faculty');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const timeSlots = [
    '7:00-8:00',
    '8:00-9:00',
    '9:00-10:00',
    '10:00-11:00',
    '11:00-12:00',
    '12:00-1:00',
    '1:00-2:00',
    '2:00-3:00',
    '3:00-4:00',
    '4:00-5:00',
    '5:00-6:00',
    '6:00-7:00',
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleRunConflict = () => {
    alert('Running conflict detection...');
  };

  const handleDownload = () => {
    // Create a simple text file with the INS form data
    const formType = activeTab === 'faculty' ? 'Faculty' : activeTab === 'section' ? 'Section' : 'Room';
    const content = `INS Form - ${formType}\n\nCEBU TECHNOLOGICAL UNIVERSITY\nINS FORM 5${activeTab === 'faculty' ? 'A' : activeTab === 'section' ? 'B' : 'C'}\n\nThis is a sample download of the INS Form.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `INS_Form_${formType}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const handleShare = () => {
    // Create shareable link
    const formType = activeTab === 'faculty' ? 'Faculty' : activeTab === 'section' ? 'Section' : 'Room';
    const shareData = {
      title: `INS Form - ${formType}`,
      text: `Check out this INS Form for ${formType}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
    setShowMenu(false);
  };

  const handlePrint = () => {
    window.print();
    setShowMenu(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">INS Form</h2>
        <p className="text-gray-600 text-sm">High-level view of today's academic activity and room usage.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('faculty')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'faculty'
              ? 'bg-[#FF990A] text-white rounded-t-lg'
              : 'text-gray-600 hover:text-gray-800 bg-gray-100'
          }`}
        >
          INS Faculty
        </button>
        <button
          onClick={() => setActiveTab('section')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'section'
              ? 'bg-[#FF990A] text-white rounded-t-lg'
              : 'text-gray-600 hover:text-gray-800 bg-gray-100'
          }`}
        >
          INS Section
        </button>
        <button
          onClick={() => setActiveTab('room')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'room'
              ? 'bg-[#FF990A] text-white rounded-t-lg'
              : 'text-gray-600 hover:text-gray-800 bg-gray-100'
          }`}
        >
          INS Room
        </button>
      </div>

      {/* INS Faculty Tab */}
      {activeTab === 'faculty' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent min-w-[200px]"
                >
                  <option value="">Select Faculty</option>
                  <option value="delaCruz">Dr. Juan Dela Cruz</option>
                  <option value="santos">Prof. Maria Santos</option>
                  <option value="reyes">Dr. Pedro Reyes</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRunConflict}
                className="px-6 py-2 bg-[#FF990A] text-white rounded-lg font-medium hover:bg-[#e88909] transition-colors"
              >
                Run Conflict
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
                    <button
                      onClick={handleDownload}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                      <span>Download INS Form</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-gray-500" />
                      <span>Share INS Form</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Printer className="w-4 h-4 text-gray-500" />
                      <span>Print INS Form</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INS Form 5A - Program by Teacher */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center border-b border-gray-300 pb-4">
                <h3 className="text-xl font-bold">CEBU TECHNOLOGICAL UNIVERSITY</h3>
                <div className="text-right text-xs mt-2">
                  <div>INS FORM 5A</div>
                  <div>March 22, 2026</div>
                  <div>Revision: 2</div>
                </div>
              </div>

              <div className="text-center">
                <h4 className="text-lg font-bold">PROGRAM BY TEACHER</h4>
                <div className="text-sm">Day Program</div>
                <div className="text-sm border-b border-gray-400 inline-block pb-1">Semester, AY _______________</div>
              </div>

              {/* Faculty Info */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="flex gap-2">
                  <span>Name:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
                <div className="flex gap-2">
                  <span>Status of Appointment:</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" /> Permanent
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" /> Temporary
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" /> Contract of Service
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span>Bachelor's Degree:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
                <div className="flex gap-2">
                  <span>Major:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
                <div className="flex gap-2">
                  <span>Master's Degree:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
                <div className="flex gap-2">
                  <span>Minor:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
                <div className="flex gap-2">
                  <span>Doctorate Degree:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
                <div></div>
                <div className="col-span-2 flex gap-2">
                  <span>Special Training:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
              </div>

              {/* Schedule Table */}
              <div className="overflow-x-auto">
                <div className="flex gap-2">
                  <table className="w-full border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-400 px-2 py-2 text-xs font-semibold">TIME</th>
                        {days.map((day) => (
                          <th key={day} className="border border-gray-400 px-2 py-2 text-xs font-semibold">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((time, index) => (
                        <tr key={time}>
                          <td className="border border-gray-400 px-2 py-3 text-xs font-medium whitespace-nowrap">
                            {time}
                          </td>
                          {days.map((day) => (
                            <td key={`${time}-${day}`} className="border border-gray-400 px-2 py-3 text-xs">
                              {index === 0 && day === 'Monday' && (
                                <div className="text-[10px]">
                                  <div>Course code</div>
                                  <div>Yr. & Sec.</div>
                                  <div>Room</div>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Vertical Labels */}
                  <div className="flex flex-col justify-around py-8">
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Approved
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Reviewed, Certified True and Correct
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Prepared by
                    </div>
                  </div>
                  <div className="flex flex-col justify-around py-8">
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Campus Director
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Director/Dean
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Program Coordinator/Chair
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <span>No. of Students:</span>
                    <div className="flex-1 border-b border-gray-400"></div>
                  </div>
                  <div className="flex gap-2">
                    <span>Course code:</span>
                    <div className="flex-1 border-b border-gray-400"></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold mb-2">SUMMARY OF COURSES</div>
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <span>Descriptive Title:</span>
                      <div className="flex-1 border-b border-gray-400"></div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span>Degree/Yr/Sec:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
              </div>

              {/* Footer */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mt-8">
                <div className="space-y-4">
                  <div>
                    <div>No. of Preparations:</div>
                    <div className="border-b border-gray-400 mt-1"></div>
                  </div>
                  <div>
                    <div>No. of Jobs:</div>
                    <div className="border-b border-gray-400 mt-1"></div>
                  </div>
                  <div>
                    <div>No. of Hours:</div>
                    <div className="border-b border-gray-400 mt-1"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div>Administrative Designation:</div>
                    <div className="border-b border-gray-400 mt-1"></div>
                  </div>
                  <div>
                    <div>Production:</div>
                    <div className="border-b border-gray-400 mt-1"></div>
                  </div>
                  <div>
                    <div>Extension:</div>
                    <div className="border-b border-gray-400 mt-1"></div>
                  </div>
                  <div>
                    <div>Research:</div>
                    <div className="border-b border-gray-400 mt-1"></div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-8 text-xs mt-8">
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-1"></div>
                  <div>Prepared by</div>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-1"></div>
                  <div>Reviewed, Certified True and Correct</div>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-1"></div>
                  <div>Approved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INS Section Tab */}
      {activeTab === 'section' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent min-w-[200px]"
                >
                  <option value="">Select Section</option>
                  <option value="bsit1a">BSIT 1-A</option>
                  <option value="bsit1b">BSIT 1-B</option>
                  <option value="bsit2a">BSIT 2-A</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRunConflict}
                className="px-6 py-2 bg-[#FF990A] text-white rounded-lg font-medium hover:bg-[#e88909] transition-colors"
              >
                Run Conflict
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
                    <button
                      onClick={handleDownload}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                      <span>Download INS Form</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-gray-500" />
                      <span>Share INS Form</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Printer className="w-4 h-4 text-gray-500" />
                      <span>Print INS Form</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INS Form 5B - Program by Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center border-b border-gray-300 pb-4">
                <h3 className="text-xl font-bold">CEBU TECHNOLOGICAL UNIVERSITY</h3>
                <div className="text-right text-xs mt-2">
                  <div>INS FORM 5B</div>
                  <div>March 22, 2026</div>
                  <div>Revision: 2</div>
                </div>
              </div>

              <div className="text-center">
                <h4 className="text-lg font-bold">PROGRAM BY SECTION</h4>
                <div className="text-sm">Day Program</div>
                <div className="text-sm border-b border-gray-400 inline-block pb-1">Semester, AY _______________</div>
              </div>

              {/* Section Info */}
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <span>Degree and Year:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
                <div className="flex gap-2">
                  <span>Adviser:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
                <div className="flex gap-2">
                  <span>Assignment:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
              </div>

              {/* Schedule Table */}
              <div className="overflow-x-auto">
                <div className="flex gap-2">
                  <table className="w-full border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-400 px-2 py-2 text-xs font-semibold">TIME</th>
                        {days.map((day) => (
                          <th key={day} className="border border-gray-400 px-2 py-2 text-xs font-semibold">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((time, index) => (
                        <tr key={time}>
                          <td className="border border-gray-400 px-2 py-3 text-xs font-medium whitespace-nowrap">
                            {time}
                          </td>
                          {days.map((day) => (
                            <td key={`${time}-${day}`} className="border border-gray-400 px-2 py-3 text-xs">
                              {index === 0 && day === 'Monday' && (
                                <div className="text-[10px]">
                                  <div>Course code</div>
                                  <div>Yr. & Sec.</div>
                                  <div>Room</div>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Vertical Labels */}
                  <div className="flex flex-col justify-around py-8">
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Approved
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Reviewed, Certified True and Correct
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Prepared by
                    </div>
                  </div>
                  <div className="flex flex-col justify-around py-8">
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Campus Director
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Director/Dean
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Program Coordinator/Chair
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 text-sm border-t border-gray-400 pt-4">
                <div className="flex gap-2">
                  <span>No. of Students:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
                <div className="text-center">
                  <div className="font-bold mb-2">SUMMARY OF COURSES</div>
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <span>Descriptive Title:</span>
                      <div className="flex-1 border-b border-gray-400"></div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span>Degree/Yr/Sec:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 text-xs mt-8">
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-1"></div>
                  <div>Program Coordinator/Chair</div>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-1"></div>
                  <div>Reviewed, Certified True and Correct:</div>
                  <div className="mt-4 border-b border-gray-400 mb-1"></div>
                  <div>Director/Dean</div>
                </div>
              </div>
              <div className="text-center text-xs mt-4">
                <div className="border-b border-gray-400 mb-1 w-64 mx-auto"></div>
                <div>Approved:</div>
                <div className="mt-4 border-b border-gray-400 mb-1 w-64 mx-auto"></div>
                <div>Campus Director</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INS Room Tab */}
      {activeTab === 'room' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent min-w-[200px]"
                >
                  <option value="">Select Room</option>
                  <option value="ca1">CA-1</option>
                  <option value="ca2">CA-2</option>
                  <option value="ca3">CA-3</option>
                  <option value="ap4">AP-4</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRunConflict}
                className="px-6 py-2 bg-[#FF990A] text-white rounded-lg font-medium hover:bg-[#e88909] transition-colors"
              >
                Run Conflict
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
                    <button
                      onClick={handleDownload}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                      <span>Download INS Form</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-gray-500" />
                      <span>Share INS Form</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Printer className="w-4 h-4 text-gray-500" />
                      <span>Print INS Form</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INS Form 5C - Room Utilization */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center border-b border-gray-300 pb-4">
                <h3 className="text-xl font-bold">CEBU TECHNOLOGICAL UNIVERSITY</h3>
                <div className="text-right text-xs mt-2">
                  <div>INS FORM 5C</div>
                  <div>March 22, 2026</div>
                  <div>Revision: 2</div>
                </div>
              </div>

              <div className="text-center">
                <h4 className="text-lg font-bold">ROOM UTILIZATION</h4>
                <div className="text-sm">Day Program</div>
                <div className="text-sm border-b border-gray-400 inline-block pb-1">Semester, AY _______________</div>
              </div>

              {/* Room Info */}
              <div className="text-sm">
                <div className="flex gap-2">
                  <span>Room Assignment:</span>
                  <div className="flex-1 border-b border-gray-400"></div>
                </div>
              </div>

              {/* Schedule Table */}
              <div className="overflow-x-auto">
                <div className="flex gap-2">
                  <table className="w-full border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-400 px-2 py-2 text-xs font-semibold">TIME</th>
                        {days.map((day) => (
                          <th key={day} className="border border-gray-400 px-2 py-2 text-xs font-semibold">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((time, index) => (
                        <tr key={time}>
                          <td className="border border-gray-400 px-2 py-3 text-xs font-medium whitespace-nowrap">
                            {time}
                          </td>
                          {days.map((day) => (
                            <td key={`${time}-${day}`} className="border border-gray-400 px-2 py-3 text-xs">
                              {index === 0 && day === 'Monday' && (
                                <div className="text-[10px]">
                                  <div>Course code</div>
                                  <div>Yr. & Sec.</div>
                                  <div>Room</div>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Vertical Labels */}
                  <div className="flex flex-col justify-around py-8">
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Approved
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Reviewed, Certified True and Correct
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Prepared by
                    </div>
                  </div>
                  <div className="flex flex-col justify-around py-8">
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Campus Director
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Director/Dean
                    </div>
                    <div className="writing-mode-vertical text-xs font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Program Coordinator/Chair
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="space-y-6 text-xs mt-8">
                <div>
                  <div>Prepared by:</div>
                  <div className="mt-8 border-b border-gray-400 mb-1 w-64"></div>
                  <div>Program Coordinator/Chair</div>
                </div>
                <div>
                  <div>Reviewed, Certified True and Correct:</div>
                  <div className="mt-8 border-b border-gray-400 mb-1 w-64"></div>
                  <div>Director/Dean</div>
                </div>
                <div>
                  <div>Approved:</div>
                  <div className="mt-8 border-b border-gray-400 mb-1 w-64"></div>
                  <div>Campus Director</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}