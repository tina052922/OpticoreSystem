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
        <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#FF990A]" />
          Room utilization by time slot
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          For each standard period, the share of rooms in scope that have at least one class overlapping that period
          (0–100%).
        </p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={roomUtilizationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" fontSize={12} tick={{ fill: "#4b5563" }} />
            <YAxis
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              label={{ value: "% of rooms in use", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "Rooms in use"]}
              labelFormatter={(label) => `Slot starting ${label}`}
            />
            <Bar dataKey="utilization" name="Rooms in use" fill="#FF990A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#FF990A]" />
          Faculty workload bands
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Count of instructors in scope by estimated weekly teaching hours from plotted schedule rows:
          partial (&lt;18 hrs), full (18–24 hrs typical cap), overloaded (above 24 hrs).
        </p>
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
              <Tooltip formatter={(value, name) => [`${value} faculty`, String(name)]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 sm:ml-4 max-w-xs">
            {facultyLoadData.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded mt-0.5 shrink-0" style={{ backgroundColor: item.color }} />
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-600">
                    {item.name === "Partial Load"
                      ? "Fewer than ~18 contact hours per week on file."
                      : item.name === "Full Load"
                        ? "About 18 up to the usual 24 hr teaching cap."
                        : "Above the standard weekly teaching cap (needs review / justification)."}
                  </p>
                  <p className="text-sm text-gray-800 mt-0.5">
                    <span className="tabular-nums font-semibold">{item.value}</span> instructor
                    {item.value === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
