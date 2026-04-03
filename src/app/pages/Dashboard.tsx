import { 
  Users, 
  GraduationCap, 
  Building, 
  Activity,
  FileText, 
  AlertTriangle,
  TrendingUp,
  Clock
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const stats = [
  { label: "Total Sections", value: "45", icon: Users, color: "bg-blue-500" },
  { label: "Total Instructors", value: "32", icon: GraduationCap, color: "bg-green-500" },
  { label: "Total Rooms", value: "28", icon: Building, color: "bg-purple-500" },
  { label: "Room Utilization", value: "78%", icon: Activity, color: "bg-orange-500" },
  { label: "Pending Drafts", value: "12", icon: FileText, color: "bg-yellow-500" },
  { label: "Conflicts Detected", value: "3", icon: AlertTriangle, color: "bg-red-500" },
];

const roomUtilizationData = [
  { name: "PC-3211", utilization: 85 },
  { name: "PC-3210", utilization: 72 },
  { name: "AP-4", utilization: 90 },
  { name: "AP-5", utilization: 65 },
  { name: "CL1", utilization: 78 },
  { name: "CL3", utilization: 82 },
];

const facultyLoadData = [
  { name: "0-6 hrs", value: 5 },
  { name: "7-12 hrs", value: 8 },
  { name: "13-18 hrs", value: 12 },
  { name: "19-24 hrs", value: 7 },
];

const COLORS = ["#FF990A", "#780301", "#DE0602", "#FFC658"];

const recentActivities = [
  { type: "Draft Submitted", user: "Dr. Maria Santos", action: "submitted draft schedule for BSIT 3A", time: "2 hours ago" },
  { type: "Schedule Approved", user: "Department Head", action: "approved schedule for BSCS 2B", time: "3 hours ago" },
  { type: "Conflict Alert", user: "System", action: "detected room conflict in PC-3211 at 10:00-11:00 M", time: "5 hours ago" },
  { type: "Justification Request", user: "Dr. Juan Dela Cruz", action: "requested justification for overload hours", time: "1 day ago" },
  { type: "GEC Assignment", user: "Admin", action: "assigned GEC courses to faculty pool", time: "1 day ago" },
];

export default function Dashboard() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="font-['SF_Pro',sans-serif] font-semibold text-[40px] text-black mb-2">
          Campus Intelligence Core
        </h2>
        <p className="font-['SF_Pro',sans-serif] font-normal text-[16px] text-black">
          High-level view of today's academic activity and room usage.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6 flex items-center gap-4"
            >
              <div className={`${stat.color} w-16 h-16 rounded-lg flex items-center justify-center`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="font-['SF_Pro',sans-serif] font-bold text-[32px] text-black">
                  {stat.value}
                </p>
                <p className="font-['SF_Pro',sans-serif] font-normal text-[14px] text-gray-600">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
          <h3 className="font-['SF_Pro',sans-serif] font-semibold text-[20px] text-black mb-4">
            Room Utilization Chart
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={roomUtilizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="utilization" fill="#FF990A" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
          <h3 className="font-['SF_Pro',sans-serif] font-semibold text-[20px] text-black mb-4">
            Faculty Load Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={facultyLoadData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {facultyLoadData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Access Buttons */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <button className="bg-[#ff990a] text-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6 font-['SF_Pro',sans-serif] font-semibold text-[18px] hover:bg-[#e68909] transition-colors">
          Evaluator
        </button>
        <button className="bg-[#ff990a] text-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6 font-['SF_Pro',sans-serif] font-semibold text-[18px] hover:bg-[#e68909] transition-colors">
          INS Form (Schedule View)
        </button>
        <button className="bg-[#ff990a] text-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6 font-['SF_Pro',sans-serif] font-semibold text-[18px] hover:bg-[#e68909] transition-colors">
          Subject Codes
        </button>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
        <h3 className="font-['SF_Pro',sans-serif] font-semibold text-[24px] text-black mb-4">
          Recent Activity
        </h3>
        <div className="space-y-4">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-200 last:border-0">
              <div className="w-2 h-2 bg-[#ff990a] rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="font-['SF_Pro',sans-serif] font-semibold text-[14px] text-black">
                  {activity.type}
                </p>
                <p className="font-['SF_Pro',sans-serif] font-normal text-[14px] text-gray-600">
                  <span className="font-semibold">{activity.user}</span> {activity.action}
                </p>
                <p className="font-['SF_Pro',sans-serif] font-normal text-[12px] text-gray-400 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
