"use client";

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

  return (
    <div className="px-4 md:px-8 pb-12 max-w-3xl space-y-6">
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
        <SystemConfigAcademicYearCard canWrite={canWriteCampusPolicy} />
      </SectionCard>

      {mode === "doi" ? (
        <SectionCard title="Retest data (danger zone)">
          <SystemConfigClearSubjectsCard />
        </SectionCard>
      ) : null}
    </div>
  );
}
