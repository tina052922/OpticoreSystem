"use client";

import { useState } from "react";
import { DoiChairpersonSignaturesPanel } from "@/components/doi/DoiChairpersonSignaturesPanel";
import { InsSignerLabelsEditor } from "@/components/ins/InsSignerLabelsEditor";
import { DoiCampusDirectorSignatureCard } from "@/components/doi/DoiCampusDirectorSignatureCard";
import { SystemConfigElectronicSignatureCard } from "@/components/admin/SystemConfigElectronicSignatureCard";
import { SystemConfigInstructorEmailCard } from "@/components/admin/SystemConfigInstructorEmailCard";
import { SystemConfigSchedulingPolicyCard } from "@/components/admin/SystemConfigSchedulingPolicyCard";
import { SystemConfigClearSubjectsCard } from "@/components/admin/SystemConfigClearSubjectsCard";
import { SystemConfigAcademicYearCard } from "@/components/admin/SystemConfigAcademicYearCard";
import { notifySystemConfigurationSaved } from "@/contexts/SystemConfigurationContext";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";

export type SystemConfigurationClientProps = {
  mode: "doi" | "college";
  collegeId?: string | null;
  collegeName?: string | null;
};

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-black/10 bg-white shadow-sm p-4 md:p-5 space-y-4">
      <h2 className="text-base font-bold text-[#780301]">{title}</h2>
      {children}
    </section>
  );
}

export function SystemConfigurationClient({
  mode,
  collegeId = null,
  collegeName = null,
}: SystemConfigurationClientProps) {
  const canWriteCampusPolicy = mode === "doi" || mode === "college";
  /** DOI only: the Chairperson signatures tab. */
  const [tab, setTab] = useState<"general" | "chairSignatures">("general");

  return (
    <div className="px-4 md:px-8 pb-12 max-w-3xl space-y-6">
      {mode === "doi" ? (
        <div
          role="tablist"
          aria-label="System configuration sections"
          className="flex gap-1 border-b border-black/10"
        >
          {(
            [
              ["general", "General"],
              ["chairSignatures", "Chairperson signatures"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                tab === key
                  ? "border-[#780301] text-[#780301]"
                  : "border-transparent text-black/55 hover:text-black/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "doi" && tab === "chairSignatures" ? (
        <SectionCard title="Chairperson names & e-signatures">
          <DoiChairpersonSignaturesPanel />
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Faculty load limits">
            <SystemConfigSchedulingPolicyCard />
          </SectionCard>

          {/* DOI only: this decides who may register campus-wide, not per college. */}
          {mode === "doi" ? (
            <SectionCard title="Instructor sign-up email domains">
              <SystemConfigInstructorEmailCard />
            </SectionCard>
          ) : null}
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
                  <p className="text-sm font-medium text-black/80">
                    {collegeName}
                  </p>
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
                {collegeId ? (
                  <SystemConfigElectronicSignatureCard
                    kind="college"
                    collegeId={collegeId}
                  />
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Academic year & semester">
            <SystemConfigAcademicYearCard canWrite={canWriteCampusPolicy} />
          </SectionCard>

          {mode === "doi" ? (
            <SectionCard title="Retest data (danger zone)">
              <SystemConfigClearSubjectsCard />
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  );
}
