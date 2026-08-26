"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoginContainer } from "@/components/login/LoginContainer";
import { ApiClientError, registerApi } from "@/lib/api/client";

type State =
  | { kind: "verifying" }
  | { kind: "success"; message: string; alreadyVerified: boolean }
  | { kind: "error"; message: string; expired: boolean };

export function VerifyEmailClient() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "verifying" });

  /**
   * React 18 StrictMode double-invokes effects in development. The endpoint is
   * idempotent (a consumed token reports "already verified"), but guarding here
   * avoids a confusing duplicate request in the network tab.
   */
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!token) {
      setState({
        kind: "error",
        message: "This link is missing its verification token.",
        expired: false,
      });
      return;
    }

    void (async () => {
      try {
        const res = await registerApi.verifyEmail(token);
        setState({
          kind: "success",
          message: res.message,
          alreadyVerified: res.alreadyVerified,
        });
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : "We couldn't verify this link. Please try again.";
        setState({
          kind: "error",
          message,
          // Surfaced so we can offer "register again" rather than a dead end.
          expired: err instanceof ApiClientError && /expired/i.test(err.message),
        });
      }
    })();
  }, [token]);

  return (
    <LoginContainer>
      <div className="space-y-6 text-center">
        {state.kind === "verifying" ? (
          <>
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#780301]/20 border-t-[#780301] animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-black">Verifying your email…</h1>
            <p className="text-base text-black/70">This only takes a moment.</p>
          </>
        ) : null}

        {state.kind === "success" ? (
          <>
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
            <h1 className="text-2xl font-bold text-black">
              {state.alreadyVerified ? "Already verified" : "Email verified"}
            </h1>
            <p className="text-base text-black/80">{state.message}</p>
            <Button
              asChild
              className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold"
            >
              <Link href="/login">Continue to login</Link>
            </Button>
          </>
        ) : null}

        {state.kind === "error" ? (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b91c1c"
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
            <h1 className="text-2xl font-bold text-black">
              {state.expired ? "Link expired" : "Verification failed"}
            </h1>
            <p className="text-base text-black/80">{state.message}</p>
            <Button
              asChild
              className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold"
            >
              <Link href="/register">Register again</Link>
            </Button>
            <p className="text-center text-base">
              <Link href="/login" className="text-[#5483b3] font-medium hover:underline">
                Back to login
              </Link>
            </p>
          </>
        ) : null}
      </div>
    </LoginContainer>
  );
}
