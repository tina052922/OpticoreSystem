"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InsSignerLabelsEditor } from "@/components/ins/InsSignerLabelsEditor";
import { DoiCampusDirectorSignatureCard } from "@/components/doi/DoiCampusDirectorSignatureCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Q } from "@/lib/supabase/catalog-columns";
import {
  DEFAULT_SCHEDULING_POLICY,
  mergeSchedulingPolicyDraft,
  type SchedulingPolicyConfig,
} from "@/lib/system-configuration/scheduling-policy";
import {
  notifySystemConfigurationSaved,
  useSystemConfiguration,
} from "@/contexts/SystemConfigurationContext";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import type { AcademicPeriod, User } from "@/types/db";

export type SystemConfigurationClientProps = {
  mode: "doi" | "college";
  collegeId?: string | null;
  collegeName?: string | null;
};

type SignerUser = Pick<User, "id" | "name" | "email" | "role">;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white shadow-sm p-4 md:p-5 space-y-4">
      <h2 className="text-base font-bold text-[#780301]">{title}</h2>
      {children}
    </section>
  );
}

export function SystemConfigurationClient({ mode, collegeId = null, collegeName = null }: SystemConfigurationClientProps) {
  const { schedulingPolicy, policyConstants, reload: reloadPolicy } = useSystemConfiguration();

  const [policyDraft, setPolicyDraft] = useState<SchedulingPolicyConfig>(DEFAULT_SCHEDULING_POLICY);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMsg, setPolicyMsg] = useState<string | null>(null);

  const [campusDirectorUserId, setCampusDirectorUserId] = useState("");
  const [contractSignerUserId, setContractSignerUserId] = useState("");
  const [signerUsers, setSignerUsers] = useState<SignerUser[]>([]);
  const [signerSaving, setSignerSaving] = useState(false);
  const [signerMsg, setSignerMsg] = useState<string | null>(null);

  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [periodLoading, setPeriodLoading] = useState(true);
  const [periodMsg, setPeriodMsg] = useState<string | null>(null);
  const [newPeriod, setNewPeriod] = useState({ name: "", semester: "1", academicYear: "", startDate: "", endDate: "" });

  useEffect(() => {
    setPolicyDraft(mergeSchedulingPolicyDraft(schedulingPolicy, policyConstants));
  }, [schedulingPolicy, policyConstants]);

  const loadCollegeSigners = useCallback(async () => {
    if (mode !== "college" || !collegeId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const [{ data: col }, { data: users }] = await Promise.all([
      supabase
        .from("College")
        .select("campusDirectorUserId,contractSignerUserId")
        .eq("id", collegeId)
        .maybeSingle(),
      supabase
        .from("User")
        .select("id,name,email,role")
        .eq("collegeId", collegeId)
        .in("role", ["instructor", "chairman_admin", "college_admin"])
        .order("name"),
    ]);
    setCampusDirectorUserId((col as { campusDirectorUserId?: string } | null)?.campusDirectorUserId ?? "");
    setContractSignerUserId((col as { contractSignerUserId?: string } | null)?.contractSignerUserId ?? "");
    setSignerUsers((users ?? []) as SignerUser[]);
  }, [mode, collegeId]);

  const loadPeriods = useCallback(async () => {
    setPeriodLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setPeriodLoading(false);
      return;
    }
    const { data, error } = await supabase.from("AcademicPeriod").select(Q.academicPeriod).order("startDate", { ascending: false });
    setPeriodLoading(false);
    if (error) {
      setPeriodMsg(error.message);
      return;
    }
    setPeriods((data ?? []) as AcademicPeriod[]);
  }, []);

  useEffect(() => {
    void loadCollegeSigners();
  }, [loadCollegeSigners]);

  useEffect(() => {
    void loadPeriods();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel("system-config:academic-period")
      .on("postgres_changes", { event: "*", schema: "public", table: "AcademicPeriod" }, () => {
        void loadPeriods();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadPeriods]);

  async function savePolicy() {
    setPolicySaving(true);
    setPolicyMsg(null);
    try {
      const res = await fetch("/api/admin/scheduling-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedulingPolicy: policyDraft }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string };
      if (!res.ok) throw new Error(j?.error ?? "Save failed");
      setPolicyMsg("Teaching load policy saved. All users will see updated limits immediately.");
      await reloadPolicy();
      notifySystemConfigurationSaved("schedulingPolicy");
    } catch (e) {
      setPolicyMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPolicySaving(false);
    }
  }

  async function saveCollegeSigners() {
    if (!collegeId) return;
    setSignerSaving(true);
    setSignerMsg(null);
    try {
      const res = await fetch("/api/college/signer-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeId,
          campusDirectorUserId: campusDirectorUserId || null,
          contractSignerUserId: contractSignerUserId || null,
        }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string };
      if (!res.ok) throw new Error(j?.error ?? "Save failed");
      setSignerMsg("INS signatory assignments saved.");
      notifySystemConfigurationSaved("collegeSigners");
      dispatchInsCatalogReload();
    } catch (e) {
      setSignerMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSignerSaving(false);
    }
  }

  async function setCurrentPeriod(periodId: string) {
    setPeriodMsg(null);
    try {
      const res = await fetch("/api/admin/academic-periods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setCurrentId: periodId }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string };
      if (!res.ok) throw new Error(j?.error ?? "Update failed");
      setPeriodMsg("Current academic period updated campus-wide.");
      await loadPeriods();
      notifySystemConfigurationSaved("academicPeriod");
    } catch (e) {
      setPeriodMsg(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function addPeriod(e: React.FormEvent) {
    e.preventDefault();
    setPeriodMsg(null);
    try {
      const res = await fetch("/api/admin/academic-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPeriod.name.trim(),
          semester: newPeriod.semester.trim(),
          academicYear: newPeriod.academicYear.trim(),
          startDate: newPeriod.startDate || null,
          endDate: newPeriod.endDate || null,
          setCurrent: true,
        }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string };
      if (!res.ok) throw new Error(j?.error ?? "Create failed");
      setNewPeriod({ name: "", semester: "1", academicYear: "", startDate: "", endDate: "" });
      setPeriodMsg("Academic period created and set as current.");
      await loadPeriods();
      notifySystemConfigurationSaved("academicPeriod");
    } catch (e) {
      setPeriodMsg(e instanceof Error ? e.message : "Create failed");
    }
  }

  const policyFields: { key: keyof SchedulingPolicyConfig; label: string; hint?: string }[] = [
    { key: "standardWeeklyTeachingHours", label: "Standard weekly teaching hours (organic faculty)" },
    { key: "parttimeMaxWeeklyHours", label: "Part-time weekly maximum" },
    { key: "maxWeeklyLabContactHours", label: "Weekly lab contact maximum" },
    { key: "maxWeeklyLectureOverloadHours", label: "Weekly lecture overload maximum" },
    { key: "maxWeeklyResidentContactHours", label: "Resident faculty weekly reference maximum" },
    { key: "defaultMaxFacultyHoursPerWeek", label: "Default GA / optimizer soft cap (hrs/week)" },
  ];

  const rateFields: { key: keyof SchedulingPolicyConfig; label: string }[] = [
    { key: "ratePerHourDoctorate", label: "Rate per hour — Doctorate (₱)" },
    { key: "ratePerHourMasters", label: "Rate per hour — Master’s (₱)" },
    { key: "ratePerHourBaccalaureate", label: "Rate per hour — Baccalaureate (₱)" },
  ];

  return (
    <div className="px-4 md:px-8 pb-12 max-w-3xl space-y-6">
      <p className="text-[13px] text-black/65 leading-relaxed">
        Changes here are stored in the campus database and pushed to all signed-in users through live updates
        (evaluator load rules, semester filter, and INS forms).
      </p>

      <SectionCard title="INS form signatories">
        <p className="text-xs text-black/60 -mt-2">
          Printed on Faculty, Section, and Room INS views after VPAA publishes the term. Edit signer names and titles below;
          assign roster users for signature images where applicable.
        </p>
        {mode === "doi" ? (
          <div className="space-y-4">
            <p className="text-xs text-black/60">Campus-wide VPAA approval line and Campus Director signature image.</p>
            <InsSignerLabelsEditor
              mode="doi"
              onUpdated={() => {
                notifySystemConfigurationSaved("insSigners");
                dispatchInsCatalogReload();
              }}
            />
            <DoiCampusDirectorSignatureCard />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-black/60">
              {collegeName ? (
                <>
                  College: <strong>{collegeName}</strong> — printed INS lines and roster signers for this college.
                </>
              ) : (
                "Your college INS signatories and print labels."
              )}
            </p>
            <InsSignerLabelsEditor
              mode="college"
              collegeId={collegeId}
              onUpdated={() => {
                notifySystemConfigurationSaved("insSigners");
                dispatchInsCatalogReload();
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-black/80">Campus Director (user)</span>
                <select
                  className="mt-1 w-full h-10 rounded-lg border border-black/20 px-2 text-sm"
                  value={campusDirectorUserId}
                  onChange={(e) => setCampusDirectorUserId(e.target.value)}
                >
                  <option value="">— Not set —</option>
                  {signerUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-black/80">Contract signer (user)</span>
                <select
                  className="mt-1 w-full h-10 rounded-lg border border-black/20 px-2 text-sm"
                  value={contractSignerUserId}
                  onChange={(e) => setContractSignerUserId(e.target.value)}
                >
                  <option value="">— Not set —</option>
                  {signerUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button
              type="button"
              className="bg-[#780301] hover:bg-[#5a0201] text-white"
              disabled={signerSaving || !collegeId}
              onClick={() => void saveCollegeSigners()}
            >
              {signerSaving ? "Saving…" : "Save signatory assignments"}
            </Button>
            {signerMsg ? <p className="text-sm text-emerald-800">{signerMsg}</p> : null}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Teaching load & policy rules">
        <p className="text-xs text-black/60">
          Used by the Evaluator, faculty portal, and policy justification checks. Designation-specific caps from the
          merit system still apply when set on a faculty profile.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {policyFields.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="font-medium text-black/80">{f.label}</span>
              <Input
                type="number"
                min={1}
                step={0.5}
                className="mt-1 h-10"
                value={policyDraft[f.key] ?? ""}
                onChange={(e) =>
                  setPolicyDraft((prev) => ({
                    ...prev,
                    [f.key]: parseFloat(e.target.value) || undefined,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <Button
          type="button"
          className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold"
          disabled={policySaving}
          onClick={() => void savePolicy()}
        >
          {policySaving ? "Saving…" : "Save teaching load policy"}
        </Button>
        {policyMsg ? <p className="text-sm text-emerald-800">{policyMsg}</p> : null}
      </SectionCard>

      <SectionCard title="Faculty rate per hour">
        <p className="text-xs text-black/60">
          Default undergraduate hourly rates from the merit system. Used when computing faculty load compensation on
          profiles and reports.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {rateFields.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="font-medium text-black/80">{f.label}</span>
              <Input
                type="number"
                min={1}
                step={1}
                className="mt-1 h-10"
                value={policyDraft[f.key] ?? ""}
                onChange={(e) =>
                  setPolicyDraft((prev) => ({
                    ...prev,
                    [f.key]: parseFloat(e.target.value) || undefined,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <Button
          type="button"
          className="mt-3 bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold"
          disabled={policySaving}
          onClick={() => void savePolicy()}
        >
          {policySaving ? "Saving…" : "Save rates & policy"}
        </Button>
      </SectionCard>

      <SectionCard title="Academic year & semester">
        {periodLoading ? (
          <p className="text-sm text-black/50">Loading terms…</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {periods.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 px-3 py-2"
              >
                <span>
                  <strong>{p.name}</strong>
                  <span className="text-black/55">
                    {" "}
                    · {p.semester} · {p.academicYear}
                  </span>
                  {p.isCurrent ? (
                    <span className="ml-2 text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  ) : null}
                </span>
                {!p.isCurrent ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void setCurrentPeriod(p.id)}>
                    Set as current
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={(e) => void addPeriod(e)} className="space-y-3 border-t border-black/10 pt-4">
          <p className="text-xs font-semibold text-black/70">Add new academic period</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Display name (e.g. 2nd Sem AY 2025–2026)"
              value={newPeriod.name}
              onChange={(e) => setNewPeriod((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              placeholder="Academic year (e.g. 2025-2026)"
              value={newPeriod.academicYear}
              onChange={(e) => setNewPeriod((p) => ({ ...p, academicYear: e.target.value }))}
              required
            />
            <select
              className="h-10 rounded-lg border border-black/20 px-2 text-sm"
              value={newPeriod.semester}
              onChange={(e) => setNewPeriod((p) => ({ ...p, semester: e.target.value }))}
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="Summer">Summer</option>
            </select>
            <Input
              type="date"
              value={newPeriod.startDate}
              onChange={(e) => setNewPeriod((p) => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              type="date"
              value={newPeriod.endDate}
              onChange={(e) => setNewPeriod((p) => ({ ...p, endDate: e.target.value }))}
            />
          </div>
          <Button type="submit" className="bg-[#780301] hover:bg-[#5a0201] text-white">
            Create & set current
          </Button>
        </form>
        {periodMsg ? <p className="text-sm text-emerald-800">{periodMsg}</p> : null}
      </SectionCard>
    </div>
  );
}
