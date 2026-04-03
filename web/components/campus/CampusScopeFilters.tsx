"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { College, Program } from "@/types/db";

const selectClass =
  "w-full h-11 rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

export type CampusScopeFiltersProps = {
  initialCollegeId?: string | null;
  className?: string;
  onScopeChange?: (scope: { collegeId: string | null; programId: string | null }) => void;
  /** Default: campus-wide college + program. Chairman: program filter only (college from session). */
  variant?: "default" | "chairman";
  /** Required when variant is chairman — from `getChairmanSession().collegeId` */
  chairmanCollegeId?: string | null;
  /** When set, chairman scope is locked to this program (no multi-program or campus-wide picker). */
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
};

/**
 * Scope bar: campus-wide (college + program) or chairman (program only).
 */
export function CampusScopeFilters({
  initialCollegeId,
  className = "",
  onScopeChange,
  variant = "default",
  chairmanCollegeId = null,
  chairmanProgramId = null,
  chairmanProgramCode = null,
  chairmanProgramName = null,
}: CampusScopeFiltersProps) {
  const [loading, setLoading] = useState(true);
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [collegeId, setCollegeId] = useState<string>("");
  const [programId, setProgramId] = useState<string>("");

  const isChairman = variant === "chairman";
  const hasChairmanCollege = Boolean(chairmanCollegeId);
  const chairmanProgramLocked = Boolean(isChairman && chairmanProgramId);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("College").select("*").order("name"),
      supabase.from("Program").select("*").order("name"),
    ]);
    setColleges((c ?? []) as College[]);
    setPrograms((p ?? []) as Program[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isChairman && chairmanCollegeId) setCollegeId(chairmanCollegeId);
    else if (!isChairman && initialCollegeId) setCollegeId(initialCollegeId);
  }, [initialCollegeId, isChairman, chairmanCollegeId]);

  useEffect(() => {
    if (chairmanProgramLocked && chairmanProgramId) setProgramId(chairmanProgramId);
  }, [chairmanProgramLocked, chairmanProgramId]);

  const programsInCollege = useMemo(() => {
    if (isChairman) {
      if (!chairmanCollegeId) return [];
      let list = programs.filter((p) => p.collegeId === chairmanCollegeId);
      if (chairmanProgramId) list = list.filter((p) => p.id === chairmanProgramId);
      return list;
    }
    if (!collegeId) return programs;
    return programs.filter((p) => p.collegeId === collegeId);
  }, [programs, collegeId, isChairman, chairmanCollegeId, chairmanProgramId]);

  useEffect(() => {
    const cid = isChairman ? chairmanCollegeId ?? null : collegeId || null;
    const pid = programId || null;
    onScopeChange?.({ collegeId: cid, programId: pid });
  }, [collegeId, programId, onScopeChange, isChairman, chairmanCollegeId]);

  return (
    <div
      className={`rounded-xl border border-black/10 bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.06)] p-4 ${className}`}
    >
      <div className="flex flex-col gap-1 mb-3">
        <p className="text-[13px] font-bold text-black/85">Search & scope</p>
        <p className="text-[12px] text-black/55 leading-snug">
          {isChairman ? (
            chairmanProgramLocked ? (
              <>
                Scoped to your assigned program only — <strong>{chairmanProgramCode ?? "Program"}</strong>. No campus-wide
                or full-college filters.
              </>
            ) : (
              <>
                Your college only — choose <strong>program</strong> (e.g. BSIT). No campus-wide or college switcher.
              </>
            )
          ) : (
            <>
              Campus-wide directory — narrow results by <strong>college</strong> and{" "}
              <strong>department</strong> (program).
            </>
          )}
        </p>
      </div>
      <div className={`grid grid-cols-1 gap-4 ${isChairman ? "" : "md:grid-cols-2"}`}>
        {!isChairman ? (
          <label className="text-[13px] font-semibold text-black/75">
            College
            <select
              className={`mt-1 ${selectClass}`}
              value={collegeId}
              onChange={(e) => {
                setCollegeId(e.target.value);
                setProgramId("");
              }}
              disabled={loading}
            >
              <option value="">All colleges (campus-wide)</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {chairmanProgramLocked ? (
          <div className="text-[13px] font-semibold text-black/75">
            Program
            <div
              className={`mt-1 ${selectClass} flex items-center text-black/85`}
              aria-readonly
            >
              {chairmanProgramCode ?? "—"}
              {chairmanProgramName ? <span className="text-black/55 font-normal ml-1">— {chairmanProgramName}</span> : null}
            </div>
          </div>
        ) : (
          <label className="text-[13px] font-semibold text-black/75">
            Program (department)
            <select
              className={`mt-1 ${selectClass}`}
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              disabled={loading || (isChairman && !hasChairmanCollege)}
            >
              <option value="">
                {isChairman ? "All programs in your college" : "All departments"}
              </option>
              {programsInCollege.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {isChairman && !hasChairmanCollege ? (
        <p className="mt-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Your account has no college assignment. Ask an admin to set <code className="text-xs">collegeId</code> on your
          User row.
        </p>
      ) : null}
    </div>
  );
}
