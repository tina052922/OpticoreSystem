"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InsSignerLabelsEditor } from "@/components/ins/InsSignerLabelsEditor";
import { DoiCampusDirectorSignatureCard } from "@/components/doi/DoiCampusDirectorSignatureCard";
import { SystemConfigBrandingCard } from "@/components/admin/SystemConfigBrandingCard";
import { SystemConfigElectronicSignatureCard } from "@/components/admin/SystemConfigElectronicSignatureCard";
import {
  adminApi,
  semestersApi,
  ApiClientError,
} from "@/lib/api/client";
import { notifySystemConfigurationSaved } from "@/contexts/SystemConfigurationContext";
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
  const canWriteCampusPolicy = mode === "doi" || mode === "college";

  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [periodLoading, setPeriodLoading] = useState(true);
  const [periodMsg, setPeriodMsg] = useState<string | null>(null);
  const [newPeriod, setNewPeriod] = useState({ name: "", semester: "1", academicYear: "", startDate: "", endDate: "" });

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

  return (
    <div className="px-4 md:px-8 pb-12 max-w-3xl space-y-6">
      <SectionCard title="Branding">
        <SystemConfigBrandingCard />
      </SectionCard>

      <SectionCard title="INS form layout">
        <p className="text-sm text-black/65 leading-relaxed">
          Printed INS Forms 5A, 5B, and 5C stay aligned with the official CTU paper layout
          (grid, signatures, and field order). A free-form layout editor is not enabled: if
          the official form changes, staff would otherwise rebuild OptiCore to match — or
          go back to Excel / SPA.
        </p>
        <p className="text-sm text-black/65 leading-relaxed">
          Letterhead image, university name, and an optional print footer are under Branding.
          Confirm with the team before adding layout knobs such as margins or banner size.
        </p>
      </SectionCard>
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
            <SystemConfigElectronicSignatureCard kind="doi" />
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
            {collegeId ? <SystemConfigElectronicSignatureCard kind="college" collegeId={collegeId} /> : null}
          </div>
        )}
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
