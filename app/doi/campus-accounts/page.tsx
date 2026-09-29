import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { CampusAccountsWorkspace } from "@/components/admin/CampusAccountsWorkspace";

/** DOI: the one College Admin per college and the one Chairman per department. */
export default function DoiCampusAccountsPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="College Admins & Chairmen"
        subtitle="One admin per college, one chairman per department — register, edit and import accounts"
      />
      <CampusAccountsWorkspace />
    </div>
  );
}
