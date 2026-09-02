"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginContainer } from "@/components/login/LoginContainer";
import { ApiClientError, authApi } from "@/lib/api/client";

/** Mirrors the backend's per-request resend cooldown. */
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;
/** Must match the backend's MIN_PASSWORD_LENGTH. */
const MIN_PASSWORD_LENGTH = 8;

type Stage = "email" | "code" | "password" | "done";

const secondsLeft = (lastSentAt: number) =>
  Math.max(
    0,
    Math.ceil((lastSentAt + RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000),
  );

const messageOf = (err: unknown, fallback: string) =>
  err instanceof ApiClientError
    ? err.message
    : err instanceof Error
      ? err.message
      : fallback;

/**
 * Password reset: email → 6-digit code → new password.
 *
 * 🔒 Nothing here is persisted. The reset ticket in particular lives in
 * component state only — it authorises a password change, so writing it to
 * localStorage or a query string would leave a usable credential lying around
 * for any script on this origin (or in browser history / server logs).
 *
 * A refresh therefore restarts the flow. That is the intended trade: this is a
 * short, one-sitting task, unlike registration where resuming is worth the
 * (non-secret) stored state.
 */
export function ForgotPasswordClient() {
  const params = useSearchParams();
  const [stage, setStage] = useState<Stage>("email");

  /**
   * Prefilled from `?email=` when arriving from the login form.
   *
   * Safe to trust as a value: it only populates a text input the user can edit,
   * and the server is the sole authority on whether it maps to an account.
   * Nothing is sent until they submit.
   */
  const [email, setEmail] = useState(() => params.get("email")?.trim().toLowerCase() ?? "");
  const [code, setCode] = useState("");
  const [resetTicket, setResetTicket] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Set when the server dropped the request and retrying the code is pointless. */
  const [dead, setDead] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const codeRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === "code") codeRef.current?.focus();
    if (stage === "password") passwordRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    setCooldown(secondsLeft(lastSentAt));
  }, [lastSentAt]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function resetFlow() {
    setStage("email");
    setCode("");
    setResetTicket(null);
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setNotice(null);
    setDead(false);
  }

  // ── Stage 1: request the code ───────────────────────────────────────────
  async function onRequestCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await authApi.forgotPassword(trimmed);
      setEmail(trimmed);
      setLastSentAt(Date.now());
      setStage("code");
    } catch (err) {
      setError(messageOf(err, "Could not send the reset code."));
    } finally {
      setBusy(false);
    }
  }

  // ── Stage 2: verify the code ────────────────────────────────────────────
  async function submitCode(value: string) {
    if (busy || dead) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await authApi.verifyPasswordResetCode({ email, code: value });
      setResetTicket(res.resetTicket);
      setStage("password");
    } catch (err) {
      const apiErr = err instanceof ApiClientError ? err : null;
      // EXPIRED / TOO_MANY_ATTEMPTS mean the server destroyed the request —
      // the only way forward is to start over, so stop offering "verify".
      if (apiErr?.code === "EXPIRED" || apiErr?.code === "TOO_MANY_ATTEMPTS") {
        setDead(true);
      }
      setError(messageOf(err, "Could not verify that code."));
      setCode("");
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  function onCodeChange(raw: string) {
    // Accept a pasted "123 456" or "123-456" without making the user clean it.
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    // The code is fixed-length, so requiring a button press too is pure friction.
    if (digits.length === CODE_LENGTH) void submitCode(digits);
  }

  async function onResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      await authApi.resendPasswordResetCode(email);
      setLastSentAt(Date.now());
      setDead(false);
      setCode("");
      setNotice("We sent a new code. The previous one no longer works.");
      codeRef.current?.focus();
    } catch (err) {
      setError(messageOf(err, "Could not resend the code."));
    } finally {
      setResending(false);
    }
  }

  // ── Stage 3: set the new password ───────────────────────────────────────
  async function onSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !resetTicket) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword({ resetTicket, newPassword: password });
      // Drop the ticket the moment it is spent, so a later render can't reuse it.
      setResetTicket(null);
      setPassword("");
      setConfirmPassword("");
      setStage("done");
    } catch (err) {
      const apiErr = err instanceof ApiClientError ? err : null;
      // The ticket is single-use and already burnt server-side; there is
      // nothing left to retry on this screen.
      if (apiErr?.code === "TICKET_INVALID") {
        setResetTicket(null);
        setStage("email");
        setCode("");
      }
      setError(messageOf(err, "Could not update the password."));
    } finally {
      setBusy(false);
    }
  }

  const alerts = (
    <>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </div>
      ) : null}
    </>
  );

  const backToLogin = (
    <p className="text-center text-sm">
      <Link href="/login" className="font-medium text-[#5483b3] hover:underline">
        Back to sign in
      </Link>
    </p>
  );

  if (stage === "done") {
    return (
      <LoginContainer>
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
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
          <h1 className="text-2xl font-bold text-black">Password updated</h1>
          <p className="text-base text-black/80">
            You can now sign in with your new password.
          </p>
          <Button
            asChild
            className="h-14 w-full rounded-xl bg-[#780301] text-lg font-semibold text-white shadow-lg hover:bg-[#5a0201]"
          >
            <Link href="/login">Continue to sign in</Link>
          </Button>
        </div>
      </LoginContainer>
    );
  }

  if (stage === "password") {
    return (
      <LoginContainer>
        <form onSubmit={onSetPassword} className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-black">Set a new password</h1>
            <p className="text-base text-black/80">
              Choose a new password for <strong>{email}</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-[#181818]"
            >
              New password
            </label>
            <div className="relative">
              <Input
                ref={passwordRef}
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-12 rounded-lg border-neutral-300 bg-sky-50/60 pr-11 text-sm shadow-sm placeholder:text-neutral-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#636364] outline-none hover:text-[#181818] focus-visible:ring-2 focus-visible:ring-black/20"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <Eye className="size-5" />
                ) : (
                  <EyeOff className="size-5" />
                )}
              </button>
            </div>
            <p className="text-sm text-black/55">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-[#181818]"
            >
              Confirm new password
            </label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              autoComplete="new-password"
              placeholder="••••••••"
              className="h-12 rounded-lg border-neutral-300 bg-sky-50/60 text-sm shadow-sm placeholder:text-neutral-500"
              required
            />
          </div>

          {alerts}

          <Button
            type="submit"
            disabled={busy}
            className="h-14 w-full rounded-xl bg-[#780301] text-lg font-semibold text-white shadow-lg hover:bg-[#5a0201] disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update password"}
          </Button>

          {backToLogin}
        </form>
      </LoginContainer>
    );
  }

  if (stage === "code") {
    return (
      <LoginContainer>
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-black">Enter your code</h1>
            <p className="text-base text-black/80">
              If an account exists for <strong>{email}</strong>, we sent it a{" "}
              {CODE_LENGTH}-digit code.
            </p>
            <p className="text-sm text-black/55">
              Can&apos;t find it? Check your spam folder.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="reset-code" className="sr-only">
              Reset code
            </label>
            <input
              ref={codeRef}
              id="reset-code"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              disabled={busy || dead}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-invalid={Boolean(error)}
              className="h-16 w-full rounded-xl border border-black/25 bg-white text-center text-3xl font-semibold tracking-[0.4em] shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[#FF990A]/40 disabled:opacity-60"
            />
            <p className="text-sm text-black/55">
              The code expires shortly — request a new one if it stops working.
            </p>
          </div>

          {alerts}

          {dead ? (
            <Button
              type="button"
              onClick={resetFlow}
              className="h-14 w-full rounded-xl bg-[#780301] text-lg font-semibold text-white shadow-lg hover:bg-[#5a0201]"
            >
              Start over
            </Button>
          ) : (
            <>
              <Button
                type="button"
                onClick={() => void submitCode(code)}
                disabled={code.length !== CODE_LENGTH || busy}
                className="h-14 w-full rounded-xl bg-[#780301] text-lg font-semibold text-white shadow-lg hover:bg-[#5a0201] disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Verify code"}
              </Button>

              <Button
                type="button"
                onClick={() => void onResend()}
                disabled={cooldown > 0 || resending}
                className="h-12 w-full rounded-xl border border-[#780301]/30 bg-white text-base font-semibold text-[#780301] hover:bg-black/[0.04] disabled:opacity-60"
              >
                {resending
                  ? "Sending…"
                  : cooldown > 0
                    ? `Resend code in ${cooldown}s`
                    : "Resend code"}
              </Button>
            </>
          )}

          <p className="text-center text-sm">
            <button
              type="button"
              onClick={resetFlow}
              className="font-medium text-[#5483b3] hover:underline"
            >
              Use a different email
            </button>
            <span className="text-black/40"> · </span>
            <Link
              href="/login"
              className="font-medium text-[#5483b3] hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </LoginContainer>
    );
  }

  return (
    <LoginContainer>
      <form onSubmit={onRequestCode} className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-black">Forgot password</h1>
          <p className="text-base text-black/80">
            Enter your email and we&apos;ll send you a {CODE_LENGTH}-digit code
            to reset your password.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="reset-email"
            className="block text-sm font-medium text-[#181818]"
          >
            Email
          </label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            autoComplete="email"
            placeholder="Enter your email"
            className="h-12 rounded-lg border-neutral-300 bg-sky-50/60 text-sm shadow-sm placeholder:text-neutral-500"
            required
          />
        </div>

        {alerts}

        <Button
          type="submit"
          disabled={busy}
          className="h-14 w-full rounded-xl bg-[#780301] text-lg font-semibold text-white shadow-lg hover:bg-[#5a0201] disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send code"}
        </Button>

        {backToLogin}
      </form>
    </LoginContainer>
  );
}
