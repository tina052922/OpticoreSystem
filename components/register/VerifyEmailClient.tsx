"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoginContainer } from "@/components/login/LoginContainer";
import { OtpVerificationPanel } from "@/components/register/OtpVerificationPanel";
import { loadPendingRegistration, savePendingRegistration } from "@/lib/auth/pending-registration-state";

/**
 * Standalone code-entry page.
 *
 * Verification moved from an emailed LINK to a 6-digit code typed on the
 * registration screen, so this route now exists for two cases:
 *
 *   1. A user who refreshed or navigated away mid-registration and came back —
 *      the pending signup is restored from localStorage (non-secret UX state
 *      only; the code itself lives on the server).
 *   2. A stale link from an email sent by the previous build. Those carry a
 *      `?token=` that nothing can consume any more, so we explain the change
 *      instead of showing an inscrutable failure.
 */
export function VerifyEmailClient() {
  const [pending, setPending] = useState<
    { email: string; lastSentAt: number } | null
  >(null);
  const [verifiedMessage, setVerifiedMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadPendingRegistration();
    if (saved) setPending({ email: saved.email, lastSentAt: saved.lastSentAt });
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <LoginContainer>
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-[#780301]/20 border-t-[#780301] animate-spin" />
          </div>
          <p className="text-base text-black/70">Loading…</p>
        </div>
      </LoginContainer>
    );
  }

  if (verifiedMessage) {
    return (
      <LoginContainer>
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#15803d"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-black">Email verified</h1>
          <p className="text-base text-black/80">{verifiedMessage}</p>
          <Button
            asChild
            className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold"
          >
            <Link href="/login">Continue to login</Link>
          </Button>
        </div>
      </LoginContainer>
    );
  }

  if (pending) {
    return (
      <LoginContainer>
        <OtpVerificationPanel
          email={pending.email}
          lastSentAt={pending.lastSentAt}
          onVerified={(message) => {
            setPending(null);
            setVerifiedMessage(message);
          }}
          onResent={({ lastSentAt, expiresAt }) => {
            savePendingRegistration({ email: pending.email, lastSentAt, expiresAt });
            setPending({ email: pending.email, lastSentAt });
          }}
          onStartOver={() => setPending(null)}
        />
      </LoginContainer>
    );
  }

  // Nothing in flight: either a stale emailed link, or a direct visit.
  return (
    <LoginContainer>
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-[#780301]/10 flex items-center justify-center">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#780301"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-black">Nothing to verify</h1>
        <p className="text-base text-black/80">
          Verification now uses a 6-digit code shown right after you register,
          instead of a link. If you have an older email with a link, it no longer
          works — please register again to get a code.
        </p>
        <Button
          asChild
          className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold"
        >
          <Link href="/register">Register</Link>
        </Button>
        <p className="text-center text-base">
          <Link href="/login" className="text-[#5483b3] font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </LoginContainer>
  );
}
