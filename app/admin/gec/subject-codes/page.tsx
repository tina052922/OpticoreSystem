import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { SubjectCodesWorkspace } from "@/components/subjects/SubjectCodesWorkspace";

/**
 * Subject codes — the whole campus catalog.
 *
 * GEC subjects are taught across departments, so this page carries no "Search & scope" bar: there is
 * no single department to scope to. Every subject is listed, GEC and major/minor alike, grouped by
 * year level with its semester and department on the row, and the chairman may add, edit and delete
 * like any other chairman.
 */
export default function GecSubjectCodesPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Subject Codes"
        subtitle="Every department's subjects, grouped by year level — semester and department are shown per row."
      />
      <SubjectCodesWorkspace allProgramsCatalog />
    </div>
  );
}
