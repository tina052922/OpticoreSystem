import { useState } from "react";
import { Search, Mail, Clock } from "lucide-react";

const sentEmails = [
  {
    id: 1,
    to: "Dr. Maria Santos",
    subject: "Re: Schedule Conflict Resolution",
    date: "Apr 2, 2026",
    content: "Thank you for bringing this to my attention. I suggest we meet tomorrow to discuss the conflict and find a suitable resolution.",
  },
  {
    id: 2,
    to: "Department Head",
    subject: "Request for Additional Teaching Load",
    date: "Mar 28, 2026",
    content: "I am writing to request approval for additional teaching load for the upcoming semester. Please find attached my justification.",
  },
  {
    id: 3,
    to: "Admin Office",
    subject: "INS Form Submission - BSIT 3A",
    date: "Mar 25, 2026",
    content: "Please find attached the completed INS Form for BSIT 3A. All schedules have been finalized and reviewed.",
  },
  {
    id: 4,
    to: "Faculty Members",
    subject: "Meeting Reminder - Faculty Assembly",
    date: "Mar 20, 2026",
    content: "This is a reminder about our faculty assembly scheduled for March 25, 2026 at 2:00 PM in the Conference Room.",
  },
];

export default function InboxSent() {
  const [selectedEmail, setSelectedEmail] = useState(sentEmails[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmails = sentEmails.filter(
    (email) =>
      email.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="font-['SF_Pro',sans-serif] font-semibold text-[40px] text-black mb-2">
          Inbox - Sent
        </h2>
        <p className="font-['SF_Pro',sans-serif] font-normal text-[16px] text-black">
          View your sent messages.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sent emails..."
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
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-['SF_Pro',sans-serif] text-[14px] text-black">
                    To: {email.to}
                  </p>
                </div>
                <p className="font-['SF_Pro',sans-serif] text-[14px] text-black mb-1 font-semibold">
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
                      To: {selectedEmail.to}
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
                  <button className="px-6 py-2 bg-gray-200 text-black rounded-lg font-['SF_Pro',sans-serif] text-[14px] hover:bg-gray-300 transition-colors">
                    Delete
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
