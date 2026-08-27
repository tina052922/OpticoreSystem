"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ApiClientError, registerApi } from "@/lib/api/client";
import { clearPendingRegistration } from "@/lib/auth/pending-registration-state";

/** Mirrors the backend's per-signup resend cooldown. */
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

type Props = {
  email: string;
  /** Epoch ms of the last send, for the resend countdown. */
  lastSentAt: number;
  onVerified: (message: string) => void;
  /** Called after a resend so the parent can persist the new timestamps. */
  onResent: (next: { lastSentAt: number; expiresAt: number }) => void;
  /** Abandon this signup and return to the form. */
  onStartOver: () => void;
};

const secondsLeft = (lastSentAt: number) =>
  Math.max(
    0,
    Math.ceil((lastSentAt + RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000),
  );

export function OtpVerificationPanel({
  email,
  lastSentAt,
  onVerified,
  onResent,
  onStartOver,
}: Props) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Set when the signup is gone server-side and retrying is pointless. */
  const [dead, setDead] = useState(false);
  const [cooldown, setCooldown] = useState(() => secondsLeft(lastSentAt));
  const [resending, setResending] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCooldown(secondsLeft(lastSentAt));
  }, [lastSentAt]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function submit(value: string) {
    if (submitting || dead) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await registerApi.verifyEmail({ email, code: value });
      clearPendingRegistration();
      onVerified(res.message);
    } catch (err) {
      const apiErr = err instanceof ApiClientError ? err : null;
      // EXPIRED / TOO_MANY_ATTEMPTS mean the server dropped the signup — the
      // only way forward is to register again, so stop offering "verify".
      if (apiErr && (apiErr.code === "EXPIRED" || apiErr.code === "TOO_MANY_ATTEMPTS")) {
        setDead(true);
        clearPendingRegistration();
      }
      setError(
        apiErr?.message ??
          (err instanceof Error ? err.message : "Could not verify that code."),
      );
      setCode("");
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function onChange(raw: string) {
    // Accept a pasted "123 456" or "123-456" without making the user clean it.
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    // Auto-submit on the final digit: the code is fixed-length, so making the
    // user also press a button is pure friction.
    if (digits.length === CODE_LENGTH) void submit(digits);
  }

  async function onResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await registerApi.resendVerification(email);
      const now = Date.now();
      onResent({
        lastSentAt: now,
        expiresAt: now + res.expiresInMinutes * 60_000,
      });
      setDead(false);
      setCode("");
      setNotice("We sent a new code. The previous one no longer works.");
      inputRef.current?.focus();
    } catch (err) {
      const apiErr = err instanceof ApiClientError ? err : null;
      if (apiErr?.code === "EXPIRED") {
        setDead(true);
        clearPendingRegistration();
      }
      setError(apiErr?.message ?? "Could not resend the code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-[#780301]/10 flex items-center justify-center">
          <svg
            width="38"
            height="38"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#780301"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-black">Enter your code</h1>
        <p className="text-base text-black/80">
          We sent a {CODE_LENGTH}-digit code to <strong>{email}</strong>.
        </p>
        <p className="text-sm text-black/55">
          Can&apos;t find it? Check your spam folder.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="otp" className="sr-only">
          Verification code
        </label>
        <input
          ref={inputRef}
          id="otp"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          disabled={submitting || dead}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "otp-error" : undefined}
          className="h-16 w-full rounded-xl border border-black/25 bg-white text-center text-3xl font-semibold tracking-[0.4em] shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[#FF990A]/40 disabled:opacity-60"
        />
        <p className="text-sm text-black/55">
          The code expires shortly — request a new one if it stops working.
        </p>
      </div>

      {error ? (
        <div
          id="otp-error"
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3"
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
          {notice}
        </div>
      ) : null}

      {dead ? (
        <Button
          type="button"
          onClick={onStartOver}
          className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold"
        >
          Register again
        </Button>
      ) : (
        <>
          <Button
            type="button"
            onClick={() => void submit(code)}
            disabled={code.length !== CODE_LENGTH || submitting}
            className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold disabled:opacity-60"
          >
            {submitting ? "Verifying…" : "Verify email"}
          </Button>

          <Button
            type="button"
            onClick={() => void onResend()}
            disabled={cooldown > 0 || resending}
            className="w-full h-12 bg-white hover:bg-black/[0.04] text-[#780301] border border-[#780301]/30 rounded-xl text-base font-semibold disabled:opacity-60"
          >
            {resending
              ? "Sending…"
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : "Resend code"}
          </Button>
        </>
      )}

      <p className="text-center text-base">
        <button
          type="button"
          onClick={onStartOver}
          className="text-[#5483b3] font-medium hover:underline"
        >
          Use a different email
        </button>
        <span className="text-black/40"> · </span>
        <Link href="/login" className="text-[#5483b3] font-medium hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
