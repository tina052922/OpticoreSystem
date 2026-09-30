import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { SubjectCodesWorkspace } from "@/components/subjects/SubjectCodesWorkspace";

/**
 * Subject codes — the whole campus catalog.
 *
 * GEC subjects are taught across departments, so this page carries no "Search & scope" bar: there is
 * no single department to scope to. Every subject is listed, GEC and major alike, grouped by year
 * level with its semester and department on the row — the surrounding rows are the context that
 * makes a general education catalog readable.
 *
 * Editing is narrower than reading: only general education subjects. A major subject belongs to its
 * own department's chairman, and the server refuses the write regardless of what this page shows.
 */
export default function GecSubjectCodesPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Subject Codes"
        subtitle="Every department's subjects, grouped by year level. You can edit the GEC and GEE subjects; the rest are shown for reference."
      />
      <SubjectCodesWorkspace allProgramsCatalog editableScope="gec" />
    </div>
  );
}
