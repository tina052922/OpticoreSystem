import { Suspense } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { UniversalChangePasswordClient } from "@/components/account/UniversalChangePasswordClient";

export default function AccountChangePasswordPage() {
  return (
    <div>
      <ChairmanPageHeader title="Change password" subtitle="Update your OptiCore sign-in password." />
      <Suspense fallback={<div className="px-6 py-12 text-sm text-black/60">Loading…</div>}>
        <UniversalChangePasswordClient />
      </Suspense>
    </div>
  );
}
