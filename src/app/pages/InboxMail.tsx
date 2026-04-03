import { useState } from "react";
import { Search, Mail, Clock } from "lucide-react";
import { Link, useLocation } from "react-router";

const emails = [
  {
    id: 1,
    from: "Dr. Maria Santos",
    subject: "Schedule Conflict Resolution Required",
    date: "Apr 2, 2026",
    status: "Unread",
    content: "Dear Colleague, I noticed a potential conflict in our schedule for PC-3211 on Monday at 10:00 AM. Could we discuss alternative arrangements?",
  },
  {
    id: 2,
    from: "Department Head",
    subject: "Approval for Additional Teaching Load",
    date: "Apr 1, 2026",
    status: "Read",
    content: "Your request for additional teaching load has been reviewed. Please see attached justification form for approval.",
  },
  {
    id: 3,
    from: "Admin Office",
    subject: "INS Form Submission Deadline",
    date: "Mar 31, 2026",
    status: "Read",
    content: "Reminder: All INS Forms must be submitted by April 15, 2026. Please ensure all schedules are finalized.",
  },
  {
    id: 4,
    from: "Dr. Juan Dela Cruz",
    subject: "Room Assignment Request",
    date: "Mar 30, 2026",
    status: "Unread",
    content: "I would like to request a change in room assignment for BSIT 3A. The current room capacity is insufficient.",
  },
  {
    id: 5,
    from: "System Notification",
    subject: "Faculty Profile Update Required",
    date: "Mar 29, 2026",
    status: "Read",
    content: "Please update your faculty profile with your latest academic credentials and research activities.",
  },
];

export default function InboxMail() {
  const location = useLocation();
  const [selectedEmail, setSelectedEmail] = useState(emails[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmails = emails.filter(
    (email) =>
      email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="font-['SF_Pro',sans-serif] font-semibold text-[40px] text-black mb-2">
          Inbox
        </h2>
        <p className="font-['SF_Pro',sans-serif] font-normal text-[16px] text-black">
          Manage your messages and communications.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <Link
          to="/inbox"
          className={`px-6 py-3 font-['SF_Pro',sans-serif] font-semibold text-[16px] rounded-lg ${
            location.pathname === "/inbox"
              ? "bg-[#ff990a] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
              : "bg-white text-black"
          }`}
        >
          Mail
        </Link>
        <Link
          to="/inbox/sent"
          className={`px-6 py-3 font-['SF_Pro',sans-serif] font-semibold text-[16px] rounded-lg ${
            location.pathname === "/inbox/sent"
              ? "bg-[#ff990a] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
              : "bg-white text-black"
          }`}
        >
          Sent
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg font-['SF_Pro',sans-serif] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff990a]"
            />
          </div>
        </div>

        <div className="flex h-[600px]">
          {/* Email List */}
          <div className="w-1/2 border-r overflow-y-auto">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedEmail.id === email.id ? "bg-blue-50" : ""
                } ${email.status === "Unread" ? "font-semibold" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-['SF_Pro',sans-serif] text-[14px] text-black">
                    {email.from}
                  </p>
                  <span
                    className={`px-2 py-1 text-[10px] rounded ${
                      email.status === "Unread"
                        ? "bg-[#ff990a] text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {email.status}
                  </span>
                </div>
                <p className="font-['SF_Pro',sans-serif] text-[14px] text-black mb-1">
                  {email.subject}
                </p>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <p className="font-['SF_Pro',sans-serif] text-[12px]">{email.date}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Email Preview */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {selectedEmail && (
              <>
                <div className="mb-6">
                  <h3 className="font-['SF_Pro',sans-serif] font-semibold text-[20px] text-black mb-2">
                    {selectedEmail.subject}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <Mail className="w-4 h-4" />
                    <p className="font-['SF_Pro',sans-serif] text-[14px]">
                      From: {selectedEmail.from}
                    </p>
                  </div>
                  <p className="font-['SF_Pro',sans-serif] text-[12px] text-gray-400">
                    {selectedEmail.date}
                  </p>
                </div>

                <div className="mb-6">
                  <p className="font-['SF_Pro',sans-serif] text-[14px] text-black leading-relaxed">
                    {selectedEmail.content}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button className="px-6 py-2 bg-[#ff990a] text-white rounded-lg font-['SF_Pro',sans-serif] text-[14px] hover:bg-[#e68909] transition-colors">
                    Reply
                  </button>
                  <button className="px-6 py-2 bg-gray-200 text-black rounded-lg font-['SF_Pro',sans-serif] text-[14px] hover:bg-gray-300 transition-colors">
                    Delete
                  </button>
                  <button className="px-6 py-2 bg-gray-200 text-black rounded-lg font-['SF_Pro',sans-serif] text-[14px] hover:bg-gray-300 transition-colors">
                    Archive
                  </button>
                  <button className="px-6 py-2 bg-gray-200 text-black rounded-lg font-['SF_Pro',sans-serif] text-[14px] hover:bg-gray-300 transition-colors">
                    Mark as Read
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
