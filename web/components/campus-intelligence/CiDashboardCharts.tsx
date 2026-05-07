"use client";

import { TrendingUp, BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

/** Split out so the main dashboard shell can load without the heavy recharts chunk. */
export function CiDashboardCharts({
  analyticsScope,
}: {
  analyticsScope?: { mode: "program" | "college" | "campus"; collegeId?: string | null; programId?: string | null } | null;
}) {
  const [roomUtilizationData, setRoomUtilizationData] = useState<Array<{ time: string; utilization: number }>>([]);
  const [facultyLoadData, setFacultyLoadData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => {
    if (!analyticsScope) return "";
    const p = new URLSearchParams();
    p.set("mode", analyticsScope.mode);
    if (analyticsScope.collegeId) p.set("collegeId", analyticsScope.collegeId);
    if (analyticsScope.programId) p.set("programId", analyticsScope.programId);
    return p.toString();
  }, [analyticsScope]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const url = qs ? `/api/analytics/dashboard?${qs}` : "/api/analytics/dashboard";
        const res = await fetch(url, { credentials: "include" });
        const j = (await res.json().catch(() => null)) as
          | {
              roomUtilizationBySlot?: Array<{ time: string; utilization: number }>;
              facultyLoadDistribution?: Array<{ name: string; value: number; color: string }>;
              error?: string;
            }
          | null;
        if (!res.ok) {
          if (!cancelled) setError(j?.error ?? "Could not load dashboard analytics.");
          return;
        }
        if (!cancelled) {
          setRoomUtilizationData(j?.roomUtilizationBySlot ?? []);
          setFacultyLoadData(j?.facultyLoadDistribution ?? []);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load dashboard analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  if (!analyticsScope) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[320px] rounded-lg bg-gray-100/80 border border-gray-200" />
        <div className="h-[320px] rounded-lg bg-gray-100/80 border border-gray-200" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[320px] rounded-lg bg-gray-100/80 animate-pulse border border-gray-200" />
        <div className="h-[320px] rounded-lg bg-gray-100/80 animate-pulse border border-gray-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

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
