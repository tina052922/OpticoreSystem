import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyChangePasswordClient } from "@/components/faculty/FacultyChangePasswordClient";

export default function FacultyChangePasswordPage() {
  return (
    <div>
      <ChairmanPageHeader title="Change password" subtitle="Required when your account uses a temporary password." />
      <FacultyChangePasswordClient />
    </div>
  );
}
