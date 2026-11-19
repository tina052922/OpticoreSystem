import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { CampusAccountsWorkspace } from "@/components/admin/CampusAccountsWorkspace";

/** DOI: the one College Admin per college and the one Chairperson per department. */
export default function DoiCampusAccountsPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="College Admins & Chairpersons"
        subtitle="One admin per college, one chairperson per department — register, edit and import accounts"
      />
      <CampusAccountsWorkspace />
    </div>
  );
}
