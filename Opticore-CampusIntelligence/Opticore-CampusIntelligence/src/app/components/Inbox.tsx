import { useState, useEffect, useRef } from 'react';
import { Search, MoreVertical, Circle, Download, Share2, Edit, Printer } from 'lucide-react';

export function Inbox() {
  const [activeTab, setActiveTab] = useState<'mail' | 'sent'>('mail');
  const [selectedEmail, setSelectedEmail] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mailData = [
    {
      from: 'Admin Office, Room Allocation - RE',
      subject: 'Room Conflict Notification - Room 304',
      date: 'December 2021',
      status: 'unread',
      message: 'Dear Faculty Member,\n\nWe have detected a room conflict for Room 304 on Monday at 10:00 AM. Please review your schedule and make necessary adjustments.\n\nThe conflicting classes are:\n- BSIT 3A - Database Management\n- BSCS 2B - Data Structures\n\nPlease coordinate with the other instructor or request a room change.\n\nBest regards,\nAdmin Office'
    },
    {
      from: 'Dean Office, PE',
      subject: 'Schedule Approval Request',
      date: 'December 12 2021',
      status: 'read',
      message: 'Dear Dean,\n\nI am submitting the schedule for BSIT 3A for your review and approval. All requirements have been met including room allocations and faculty assignments.\n\nPlease review at your earliest convenience.\n\nThank you.'
    },
    {
      from: 'IT Memo',
      subject: 'System Maintenance Notice',
      date: 'December 11',
      status: 'read',
      message: 'This is to inform you that the OptiCore system will undergo scheduled maintenance on December 15, 2021 from 2:00 AM to 6:00 AM. The system will be temporarily unavailable during this period.'
    },
    {
      from: 'DE memo',
      subject: 'Faculty Load Justification Required',
      date: 'No date assigned',
      status: 'unread',
      message: 'Dear Faculty,\n\nYour current teaching load exceeds the standard 21 units. Please provide justification for the 24-unit load in the system.\n\nThank you for your cooperation.'
    },
    {
      from: 'Faculty Affairs, Important - RE',
      subject: 'Profile Update Reminder',
      date: 'No date assigned',
      status: 'read',
      message: 'Please update your faculty profile with your latest credentials and qualifications before the end of the semester.'
    },
    {
      from: 'Schedule Coordinator, Reminder - RE',
      subject: 'Submission Deadline Approaching',
      date: 'No date assigned',
      status: 'read',
      message: 'This is a friendly reminder that the deadline for schedule submissions is December 20, 2021. Please ensure all schedules are submitted before the deadline.'
    },
  ];

  const sentData = [
    {
      to: 'Dean Office',
      subject: 'Schedule Submission - BSIT 3A',
      date: 'December 13 2021',
      message: 'Dear Dean,\n\nPlease find attached the schedule for BSIT 3A for the 2nd Semester of S.Y. 2025-2026.\n\nAll room allocations and faculty assignments have been verified.\n\nBest regards'
    },
    {
      to: 'Admin Office',
      subject: 'Room Change Request',
      date: 'December 12 2021',
      message: 'Dear Admin,\n\nI would like to request a room change for my Monday 10:00 AM class due to a scheduling conflict.\n\nThank you.'
    },
    {
      to: 'Faculty Affairs',
      subject: 'Load Justification',
      date: 'December 10 2021',
      message: 'Dear Faculty Affairs,\n\nI am submitting my justification for the 24-unit teaching load as requested. The additional units are necessary to cover specialized courses in my area of expertise.\n\nThank you.'
    },
  ];

  const currentData = activeTab === 'mail' ? mailData : sentData;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Inbox</h2>
        <p className="text-gray-600 text-sm">Manage your communications and notifications.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('mail')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'mail'
              ? 'text-[#FF990A] border-b-2 border-[#FF990A]'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Mail
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'sent'
              ? 'text-[#FF990A] border-b-2 border-[#FF990A]'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Sent
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
        <div className="flex items-center gap-2 px-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search mail"
            className="flex-1 py-2 outline-none text-sm"
          />
        </div>
      </div>

      {/* Email Content */}
      <div className="grid grid-cols-5 gap-4">
        {/* Email List */}
        <div className="col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#FF990A] text-white px-4 py-3 font-semibold text-sm">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5">{activeTab === 'mail' ? 'From' : 'To'}</div>
              <div className="col-span-4">Subject</div>
              <div className="col-span-3">Date</div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {currentData.map((email, index) => (
              <div
                key={index}
                onClick={() => setSelectedEmail(index)}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedEmail === index ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="grid grid-cols-12 gap-2 items-center text-sm">
                  <div className="col-span-5 flex items-center gap-2">
                    {activeTab === 'mail' && email.status === 'unread' && (
                      <Circle className="w-2 h-2 fill-[#FF990A] text-[#FF990A]" />
                    )}
                    <span className={`truncate ${activeTab === 'mail' && email.status === 'unread' ? 'font-semibold' : ''}`}>
                      {activeTab === 'mail' ? email.from : (email as any).to}
                    </span>
                  </div>
                  <div className="col-span-4 truncate text-gray-700">
                    {email.subject}
                  </div>
                  <div className="col-span-3 text-gray-500 text-xs">
                    {email.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Preview */}
        <div className="col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg text-gray-800">
                  {currentData[selectedEmail].subject}
                </h3>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          alert('Download functionality');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          alert('Share functionality');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          alert('Rename functionality');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Rename
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          alert('Print functionality');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">
                  {activeTab === 'mail'
                    ? currentData[selectedEmail].from
                    : (currentData[selectedEmail] as any).to}
                </span>
                <span className="text-gray-400">•</span>
                <span>{currentData[selectedEmail].date}</span>
              </div>
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {currentData[selectedEmail].message}
            </p>
          </div>

          {activeTab === 'mail' && (
            <div className="mt-6 flex gap-3">
              <button className="px-4 py-2 bg-[#FF990A] text-white rounded-lg hover:bg-[#e88909] transition-colors">
                Reply
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Delete
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Archive
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
