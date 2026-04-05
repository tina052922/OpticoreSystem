import type { ReactNode } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";

type ChairmanScopedPageProps = {
  title: string;
  subtitle: string;
  chairmanCollegeId: string | null;
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
  children: ReactNode;
};

/** Chairman pages: program-only scope bar (no college/campus switcher) + shared header styling. */
export function ChairmanScopedPage({
  title,
  subtitle,
  chairmanCollegeId,
  chairmanProgramId = null,
  chairmanProgramCode = null,
  chairmanProgramName = null,
  children,
}: ChairmanScopedPageProps) {
  return (
    <div>
      <ChairmanPageHeader title={title} subtitle={subtitle} />
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <CampusScopeFilters
          variant="chairman"
          chairmanCollegeId={chairmanCollegeId}
          chairmanProgramId={chairmanProgramId}
          chairmanProgramCode={chairmanProgramCode}
          chairmanProgramName={chairmanProgramName}
        />
      </div>
      {children}
    </div>
  );
}
