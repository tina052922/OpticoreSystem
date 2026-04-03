"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const roomUtilizationData = [
  { name: "Room 201", utilization: 72 },
  { name: "Lab 301", utilization: 85 },
];

const facultyLoadData = [
  { name: "0-6 hrs", value: 1 },
  { name: "7-12 hrs", value: 1 },
  { name: "13-18 hrs", value: 0 },
  { name: "19-24 hrs", value: 0 },
];

const COLORS = ["#FF990A", "#780301", "#DE0602", "#FFC658"];

export function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
        <h3 className="font-semibold text-[20px] text-black mb-4">Room Utilization Chart</h3>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roomUtilizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="utilization" fill="#FF990A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
        <h3 className="font-semibold text-[20px] text-black mb-4">Faculty Load Distribution Chart</h3>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={facultyLoadData}
                cx="50%"
                cy="50%"
                outerRadius={92}
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {facultyLoadData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
