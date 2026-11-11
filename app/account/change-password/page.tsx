import { Suspense } from "react";
import { UniversalChangePasswordClient } from "@/components/account/UniversalChangePasswordClient";

/** Shell comes from `app/account/layout.tsx`; the form carries its own heading. */
export default function AccountChangePasswordPage() {
  return (
    <Suspense fallback={<div className="px-6 py-12 text-sm text-black/60">Loading…</div>}>
      <UniversalChangePasswordClient />
    </Suspense>
  );
}
