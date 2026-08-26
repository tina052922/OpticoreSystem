import { Suspense } from "react";
import { VerifyEmailClient } from "@/components/register/VerifyEmailClient";

/**
 * Landing page for the emailed verification link.
 *
 * `useSearchParams` requires a Suspense boundary, otherwise the whole route is
 * forced to client-side rendering at build time.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[var(--color-opticore-bg)]" />}
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
