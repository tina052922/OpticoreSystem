"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InsSignerLabelsEditor } from "@/components/ins/InsSignerLabelsEditor";
import { DoiCampusDirectorSignatureCard } from "@/components/doi/DoiCampusDirectorSignatureCard";
import {
  adminApi,
  semestersApi,
  systemConfigApi,
  ApiClientError,
} from "@/lib/api/client";
import {
  DEFAULT_SCHEDULING_POLICY,
  mergeSchedulingPolicyDraft,
  type SchedulingPolicyConfig,
} from "@/lib/system-configuration/scheduling-policy";
import { DESIGNATION_POLICIES } from "@/lib/faculty/designation-system";
import {
  notifySystemConfigurationSaved,
  useSystemConfiguration,
} from "@/contexts/SystemConfigurationContext";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import type { AcademicPeriod } from "@/types/db";

export type SystemConfigurationClientProps = {
  mode: "doi" | "college";
  collegeId?: string | null;
  collegeName?: string | null;
};

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
  const canWriteCampusPolicy = mode === "doi";

  const [policyDraft, setPolicyDraft] = useState<SchedulingPolicyConfig>(DEFAULT_SCHEDULING_POLICY);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMsg, setPolicyMsg] = useState<string | null>(null);

  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [periodLoading, setPeriodLoading] = useState(true);
  const [periodMsg, setPeriodMsg] = useState<string | null>(null);
  const [newPeriod, setNewPeriod] = useState({ name: "", semester: "1", academicYear: "", startDate: "", endDate: "" });

  useEffect(() => {
    setPolicyDraft(mergeSchedulingPolicyDraft(schedulingPolicy, policyConstants));
  }, [schedulingPolicy, policyConstants]);

  const loadPeriods = useCallback(async () => {
    setPeriodLoading(true);
    try {
      const data = await semestersApi.list();
      setPeriods(data.semesters as AcademicPeriod[]);
    } catch (e) {
      setPeriodMsg(e instanceof ApiClientError ? e.message : "Could not load periods");
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  async function savePolicy() {
    setPolicySaving(true);
    setPolicyMsg(null);
    try {
      await systemConfigApi.update({ schedulingPolicy: policyDraft });
      setPolicyMsg("Teaching load policy saved. All users will see updated limits immediately.");
      await reloadPolicy();
      notifySystemConfigurationSaved("schedulingPolicy");
    } catch (e) {
      setPolicyMsg(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setPolicySaving(false);
    }
  }

  async function setCurrentPeriod(periodId: string) {
    setPeriodMsg(null);
    try {
      await adminApi.setCurrentAcademicPeriod(periodId);
      setPeriodMsg("Current academic period updated campus-wide.");
      await loadPeriods();
      notifySystemConfigurationSaved("academicPeriod");
    } catch (e) {
      setPeriodMsg(e instanceof ApiClientError ? e.message : "Update failed");
    }
  }

  async function addPeriod(e: React.FormEvent) {
    e.preventDefault();
    setPeriodMsg(null);
    try {
      await adminApi.createAcademicPeriod({
        name: newPeriod.name.trim(),
        semester: newPeriod.semester.trim(),
        academicYear: newPeriod.academicYear.trim(),
        startDate: newPeriod.startDate || "",
        endDate: newPeriod.endDate || "",
        setCurrent: true,
      });
      setNewPeriod({ name: "", semester: "1", academicYear: "", startDate: "", endDate: "" });
      setPeriodMsg("Academic period created and set as current.");
      await loadPeriods();
      notifySystemConfigurationSaved("academicPeriod");
    } catch (e) {
      setPeriodMsg(e instanceof ApiClientError ? e.message : "Create failed");
    }
  }

  const policyFields: { key: Exclude<keyof SchedulingPolicyConfig, "ratePerHourByDesignation">; label: string; hint?: string }[] = [
    { key: "standardWeeklyTeachingHours", label: "Standard weekly teaching hours (organic faculty)" },
    { key: "parttimeMaxWeeklyHours", label: "Part-time weekly maximum" },
    { key: "maxWeeklyLabContactHours", label: "Weekly lab contact maximum" },
    { key: "maxWeeklyLectureOverloadHours", label: "Weekly lecture overload maximum" },
    { key: "maxWeeklyResidentContactHours", label: "Resident faculty weekly reference maximum" },
    { key: "defaultMaxFacultyHoursPerWeek", label: "Default GA / optimizer soft cap (hrs/week)" },
  ];

  const rateFields: { key: Exclude<keyof SchedulingPolicyConfig, "ratePerHourByDesignation">; label: string }[] = [
    { key: "ratePerHourDoctorate", label: "Rate per hour — Doctorate (₱)" },
    { key: "ratePerHourMasters", label: "Rate per hour — Master’s (₱)" },
    { key: "ratePerHourBaccalaureate", label: "Rate per hour — Baccalaureate (₱)" },
  ];

  const designationOptions = DESIGNATION_POLICIES.filter((d) => d.key !== "Regular Faculty");

  return (
    <div className="px-4 md:px-8 pb-12 max-w-3xl space-y-6">
      <SectionCard title="INS form signatories">
        {mode === "doi" ? (
          <div className="space-y-4">
            <InsSignerLabelsEditor
              mode="doi"
              layout="config"
              onUpdated={() => {
                notifySystemConfigurationSaved("insSigners");
                dispatchInsCatalogReload();
              }}
            />
            <DoiCampusDirectorSignatureCard />
          </div>
        ) : (
          <div className="space-y-4">
            {collegeName ? (
              <p className="text-sm font-medium text-black/80">{collegeName}</p>
            ) : null}
            <InsSignerLabelsEditor
              mode="college"
              collegeId={collegeId}
              layout="config"
              onUpdated={() => {
                notifySystemConfigurationSaved("insSigners");
                dispatchInsCatalogReload();
              }}
            />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Teaching load & policy rules">
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
        {canWriteCampusPolicy ? (
        <Button
          type="button"
          className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold"
          disabled={policySaving}
          onClick={() => void savePolicy()}
        >
          {policySaving ? "Saving…" : "Save teaching load policy"}
        </Button>
        ) : (
          <p className="text-xs text-black/55">Campus-wide teaching load policy is set by VPAA / DOI.</p>
        )}
        {policyMsg ? <p className="text-sm text-emerald-800">{policyMsg}</p> : null}
      </SectionCard>

      <SectionCard title="Faculty rate per hour">
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
        {canWriteCampusPolicy ? (
        <Button
          type="button"
          className="mt-3 bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold"
          disabled={policySaving}
          onClick={() => void savePolicy()}
        >
          {policySaving ? "Saving…" : "Save rates & policy"}
        </Button>
        ) : null}
      </SectionCard>

      <SectionCard title="Rate per hour by designation">
        <p className="text-sm text-black/60">
          Optional override for faculty holding a designation (e.g. Campus Director, Department Chairperson).
          When set, this rate is used instead of the degree-based rate above. Leave blank to use the degree rate.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {designationOptions.map((d) => (
            <label key={d.key} className="block text-sm">
              <span className="font-medium text-black/80">{d.label} (₱/hr)</span>
              <Input
                type="number"
                min={0}
                step={1}
                className="mt-1 h-10"
                placeholder="Use degree-based rate"
                value={policyDraft.ratePerHourByDesignation?.[d.label] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setPolicyDraft((prev) => {
                    const next = { ...(prev.ratePerHourByDesignation ?? {}) };
                    if (!v) {
                      delete next[d.label];
                    } else {
                      const n = parseFloat(v);
                      if (Number.isFinite(n) && n > 0) next[d.label] = n;
                    }
                    return { ...prev, ratePerHourByDesignation: next };
                  });
                }}
              />
            </label>
          ))}
        </div>
        {canWriteCampusPolicy ? (
        <Button
          type="button"
          className="mt-3 bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold"
          disabled={policySaving}
          onClick={() => void savePolicy()}
        >
          {policySaving ? "Saving…" : "Save designation rates"}
        </Button>
        ) : null}
        {policyMsg ? <p className="text-sm text-emerald-800">{policyMsg}</p> : null}
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
                {!p.isCurrent && canWriteCampusPolicy ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void setCurrentPeriod(p.id)}>
                    Set as current
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canWriteCampusPolicy ? (
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
        ) : null}
        {periodMsg ? <p className="text-sm text-emerald-800">{periodMsg}</p> : null}
      </SectionCard>
    </div>
  );
}
