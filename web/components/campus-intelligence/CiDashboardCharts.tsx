"use client";

import { TrendingUp, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const roomUtilizationData = [
  { time: "7:00 AM", utilization: 45 },
  { time: "8:00 AM", utilization: 78 },
  { time: "9:00 AM", utilization: 92 },
  { time: "10:00 AM", utilization: 95 },
  { time: "11:00 AM", utilization: 88 },
  { time: "12:00 PM", utilization: 65 },
  { time: "1:00 PM", utilization: 82 },
  { time: "2:00 PM", utilization: 89 },
  { time: "3:00 PM", utilization: 76 },
  { time: "4:00 PM", utilization: 58 },
  { time: "5:00 PM", utilization: 32 },
];

const facultyLoadData = [
  { name: "Full Load", value: 28, color: "#FF990A" },
  { name: "Partial Load", value: 12, color: "#FFC107" },
  { name: "Overloaded", value: 5, color: "#F44336" },
];

/** Split out so the main dashboard shell can load without the heavy recharts chunk. */
export function CiDashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#FF990A]" />
          Room Utilization Chart
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={roomUtilizationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="utilization" fill="#FF990A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#FF990A]" />
          Faculty Load Distribution
        </h3>
        <div className="flex flex-col sm:flex-row items-center justify-center min-h-[250px] gap-4">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={facultyLoadData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {facultyLoadData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 sm:ml-4">
            {facultyLoadData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-700">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
