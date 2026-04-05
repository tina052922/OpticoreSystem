"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { FacultyProfile, User } from "@/types/db";

export type FacultyProfileWorkspaceProps = {
  chairmanCollegeId?: string | null;
  chairmanProgramCode?: string | null;
  viewerCollegeId?: string | null;
  /** From `FacultyProfileWithScope` + CampusScopeFilters */
  scopeCollegeId?: string | null;
};

type ListRow = {
  user: Pick<User, "id" | "name" | "employeeId">;
  profile: FacultyProfile | null;
};

export function FacultyProfileWorkspace({
  chairmanCollegeId = null,
  chairmanProgramCode = null,
  viewerCollegeId = null,
  scopeCollegeId = null,
}: FacultyProfileWorkspaceProps) {
  const collegeId = chairmanCollegeId ?? viewerCollegeId ?? scopeCollegeId ?? null;
  const programLabel = chairmanProgramCode ?? "—";

  const [tab, setTab] = useState<"profile" | "designation" | "advisory">("profile");

  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [aka, setAka] = useState("");
  const [bsDegree, setBsDegree] = useState("");
  const [msDegree, setMsDegree] = useState("");
  const [doctoralDegree, setDoctoralDegree] = useState("");
  const [major1, setMajor1] = useState("");
  const [major2, setMajor2] = useState("");
  const [major3, setMajor3] = useState("");
  const [minor1, setMinor1] = useState("");
  const [minor2, setMinor2] = useState("");
  const [minor3, setMinor3] = useState("");
  const [research, setResearch] = useState("");
  const [extension, setExtension] = useState("");
  const [production, setProduction] = useState("");
  const [specialTraining, setSpecialTraining] = useState("");
  const [status, setStatus] = useState("Organic");
  const [designation, setDesignation] = useState("");

  const [rows, setRows] = useState<ListRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFaculty = useCallback(async () => {
    if (!collegeId) {
      setRows([]);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setLoadingList(true);
    setError(null);
    const { data: users, error: uErr } = await supabase
      .from("User")
      .select("id, name, employeeId, role")
      .eq("collegeId", collegeId)
      .eq("role", "instructor");
    if (uErr) {
      setLoadingList(false);
      setError(uErr.message);
      return;
    }
    const list = (users ?? []) as Pick<User, "id" | "name" | "employeeId" | "role">[];
    if (list.length === 0) {
      setRows([]);
      setLoadingList(false);
      return;
    }
    const ids = list.map((u) => u.id);
    const { data: profs, error: pErr } = await supabase.from("FacultyProfile").select("*").in("userId", ids);
    setLoadingList(false);
    if (pErr) {
      setError(pErr.message);
      return;
    }
    const byUser = new Map((profs as FacultyProfile[] | null)?.map((p) => [p.userId, p]) ?? []);
    setRows(
      list.map((u) => ({
        user: { id: u.id, name: u.name, employeeId: u.employeeId },
        profile: byUser.get(u.id) ?? null,
      })),
    );
  }, [collegeId]);

  useEffect(() => {
    void loadFaculty();
  }, [loadFaculty]);

  async function assertNoDuplicateFaculty(supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>) {
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim) return "Work email is required.";

    const { data: byEmail } = await supabase.from("User").select("id").eq("email", emailTrim).maybeSingle();
    if (byEmail) return "Faculty already exists.";

    const eid = employeeId.trim();
    if (eid) {
      const { data: byEid } = await supabase.from("User").select("id").eq("employeeId", eid).maybeSingle();
      if (byEid) return "Faculty already exists.";
    }

    const nameKey = fullName.trim().toLowerCase();
    if (nameKey) {
      const { data: instructors } = await supabase
        .from("User")
        .select("id, name")
        .eq("collegeId", collegeId!)
        .eq("role", "instructor");
      const instList = instructors ?? [];
      const hitName = instList.some((u: { name: string }) => u.name.trim().toLowerCase() === nameKey);
      if (hitName) return "Faculty already exists.";

      const instIds = instList.map((u: { id: string }) => u.id);
      if (instIds.length > 0) {
        const { data: profiles } = await supabase.from("FacultyProfile").select("fullName").in("userId", instIds);
        const hitProfile = (profiles ?? []).some(
          (p: { fullName: string }) => p.fullName.trim().toLowerCase() === nameKey,
        );
        if (hitProfile) return "Faculty already exists.";
      }
    }

    return null;
  }

  async function onAddFaculty() {
    setError(null);
    setSuccess(null);
    if (!collegeId) {
      setError("Select your college scope (or sign in as Chairman) before adding faculty.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const dupMsg = await assertNoDuplicateFaculty(supabase);
    if (dupMsg) {
      setError(dupMsg);
      return;
    }

    const nameTrim = fullName.trim();
    if (!nameTrim) {
      setError("Full Name is required.");
      return;
    }

    setSaving(true);
    const id = crypto.randomUUID();
    const payloadUser = {
      id,
      email: email.trim().toLowerCase(),
      name: nameTrim,
      role: "instructor" as const,
      collegeId,
      employeeId: employeeId.trim() || null,
    };

    const { error: uIns } = await supabase.from("User").insert(payloadUser);
    if (uIns) {
      setSaving(false);
      if (uIns.code === "23505") {
        setError("Faculty already exists.");
      } else {
        setError(uIns.message);
      }
      return;
    }

    const { error: pIns } = await supabase.from("FacultyProfile").insert({
      userId: id,
      fullName: nameTrim,
      aka: aka.trim() || null,
      bsDegree: bsDegree.trim() || null,
      msDegree: msDegree.trim() || null,
      doctoralDegree: doctoralDegree.trim() || null,
      major1: major1.trim() || null,
      major2: major2.trim() || null,
      major3: major3.trim() || null,
      minor1: minor1.trim() || null,
      minor2: minor2.trim() || null,
      minor3: minor3.trim() || null,
      research: research.trim() || null,
      extension: extension.trim() || null,
      production: production.trim() || null,
      specialTraining: specialTraining.trim() || null,
      status: status.trim() || null,
      designation: designation.trim() || null,
      ratePerHour: null,
    });

    if (pIns) {
      await supabase.from("User").delete().eq("id", id);
      setSaving(false);
      if (pIns.code === "23505") {
        setError("Faculty already exists.");
      } else {
        setError(pIns.message);
      }
      return;
    }

    setSaving(false);
    setSuccess("Faculty saved.");
    setEmail("");
    setEmployeeId("");
    setFullName("");
    setAka("");
    setBsDegree("");
    setMsDegree("");
    setDoctoralDegree("");
    setMajor1("");
    setMajor2("");
    setMajor3("");
    setMinor1("");
    setMinor2("");
    setMinor3("");
    setResearch("");
    setExtension("");
    setProduction("");
    setSpecialTraining("");
    setStatus("Organic");
    setDesignation("");
    void loadFaculty();
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "profile" as const, label: "Faculty Profile" },
            { id: "designation" as const, label: "Designation" },
            { id: "advisory" as const, label: "Advisory" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`h-10 px-4 rounded-[15px] font-bold text-[14px] ${
                tab === t.id ? "bg-[#ff990a] text-white" : "bg-white text-black border border-black/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "profile" ? (
          <Button
            type="button"
            className="bg-[#ff990a] text-white hover:bg-[#e68a09]"
            disabled={saving || !collegeId}
            onClick={() => void onAddFaculty()}
          >
            + Add Faculty
          </Button>
        ) : null}
      </div>

      {tab === "profile" ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
          {!collegeId ? (
            <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Set college scope using the bar above (campus pages) or open this page as Chairman / College Admin with a
              linked college.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">
              {success}
            </p>
          ) : null}

          <div className="text-[16px] font-semibold mb-3">New faculty</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="space-y-1">
              <div className="text-sm font-medium">Work email (login id)</div>
              <Input
                type="email"
                placeholder="name@ctu.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!collegeId}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Employee ID</div>
              <Input
                placeholder="Optional; must be unique if set"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Full Name</div>
              <Input placeholder="Juan Dela Cruz" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">A.K.A.</div>
              <Input placeholder="Juan" value={aka} onChange={(e) => setAka(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">BS Degree</div>
              <Input placeholder="BS Information Technology" value={bsDegree} onChange={(e) => setBsDegree(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">MS Degree</div>
              <Input value={msDegree} onChange={(e) => setMsDegree(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Doctoral Degree</div>
              <Input value={doctoralDegree} onChange={(e) => setDoctoralDegree(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Major 1</div>
              <Input placeholder="Software Engineering" value={major1} onChange={(e) => setMajor1(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Major 2</div>
              <Input value={major2} onChange={(e) => setMajor2(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Major 3</div>
              <Input value={major3} onChange={(e) => setMajor3(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Minor 1</div>
              <Input placeholder="Web Development" value={minor1} onChange={(e) => setMinor1(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Minor 2</div>
              <Input value={minor2} onChange={(e) => setMinor2(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Minor 3</div>
              <Input value={minor3} onChange={(e) => setMinor3(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Research</div>
              <Input value={research} onChange={(e) => setResearch(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Extension</div>
              <Input value={extension} onChange={(e) => setExtension(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Production</div>
              <Input value={production} onChange={(e) => setProduction(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Special Training</div>
              <Input value={specialTraining} onChange={(e) => setSpecialTraining(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Status</div>
              <Input value={status} onChange={(e) => setStatus(e.target.value)} disabled={!collegeId} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Administrative Designation</div>
              <Input placeholder="Instructor I" value={designation} onChange={(e) => setDesignation(e.target.value)} disabled={!collegeId} />
            </div>
          </div>

          <div className="mt-8">
            <div className="text-[16px] font-semibold mb-3">Faculty List {loadingList ? "· Loading…" : ""}</div>
            <div className="overflow-auto rounded-xl border border-black/10">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#ff990a] text-white text-[11px]">
                    <th className="border border-black/10 px-2 py-2 text-left">Name</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Status</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Program</th>
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {!collegeId ? (
                    <tr>
                      <td colSpan={4} className="border border-black/10 px-2 py-6 text-center text-black/45">
                        No college in scope.
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border border-black/10 px-2 py-6 text-center text-black/45">
                        No instructors in the database for this college yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map(({ user, profile }) => (
                      <tr key={user.id}>
                        <td className="border border-black/10 px-2 py-2">{profile?.fullName ?? user.name}</td>
                        <td className="border border-black/10 px-2 py-2">{profile?.status ?? "—"}</td>
                        <td className="border border-black/10 px-2 py-2">{profile?.designation ?? "—"}</td>
                        <td className="border border-black/10 px-2 py-2">{programLabel}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "designation" ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
          <div className="text-[16px] font-semibold mb-3">Designations</div>
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#ff990a] text-white text-[11px]">
                  <th className="border border-black/10 px-2 py-2 text-left">Faculty</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Effective</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border border-black/10 px-2 py-6 text-center text-black/45">
                      No data — add faculty on the Profile tab.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.user.id}>
                      <td className="border border-black/10 px-2 py-2">{r.profile?.fullName ?? r.user.name}</td>
                      <td className="border border-black/10 px-2 py-2">{r.profile?.designation ?? "—"}</td>
                      <td className="border border-black/10 px-2 py-2">—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "advisory" ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
          <div className="text-[16px] font-semibold mb-3">Advisory Assignments</div>
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#ff990a] text-white text-[11px]">
                  <th className="border border-black/10 px-2 py-2 text-left">Adviser</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Section</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Students</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                <tr>
                  <td colSpan={3} className="border border-black/10 px-2 py-6 text-center text-black/45">
                    Advisory data is not stored in this release — use the Profile tab to manage faculty records.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
