import { Suspense } from "react";
import type { Metadata } from "next";
import { ForgotPasswordClient } from "@/components/auth/ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Forgot password · OptiCore",
  // Recovery screens have no business in search results.
  robots: { index: false, follow: false },
};

/**
 * `useSearchParams` (for the `?email=` prefill) requires a Suspense boundary,
 * otherwise the whole route is forced to client-side rendering at build time.
 */
export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[var(--color-opticore-bg)]" />}
    >
      <ForgotPasswordClient />
    </Suspense>
  );
}
