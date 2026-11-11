"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiClientError, authApi, authExtraApi, authMutationsApi } from "@/lib/api/client";
import type { UserRole } from "@/types/db";

function homeForRole(role: UserRole | null): string {
  switch (role) {
    case "instructor":
      return "/faculty";
    case "chairman_admin":
      return "/chairman/dashboard";
    case "college_admin":
      return "/admin/college";
    case "cas_admin":
      return "/admin/cas";
    case "gec_chairman":
      return "/admin/gec";
    case "doi_admin":
      return "/doi/dashboard";
    default:
      return "/";
  }
}

/**
 * Password update for any authenticated role.
 *
 * Flows:
 *   • First-time setup (`mustChangePassword=true`): only the new
 *     password is required; the backend validates the user is in setup
 *     mode and skips the "current password" check.
 *   • Normal change: requires the current password.
 *
 * The component asks `authApi.me()` to learn the current user's name,
 * email, role, and whether they're in first-time setup.
 */
export function UniversalChangePasswordClient() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [firstTime, setFirstTime] = useState(false);
  /**
   * Whether the address still has to be proved.
   *
   * An admin-created account carries an address somebody else typed. Choosing a password before
   * proving it would let whoever answered a mistyped address claim the account with a secret of
   * their own, so this step comes first and the password form is not rendered until it passes.
   */
  const [needsEmailCheck, setNeedsEmailCheck] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeNote, setCodeNote] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** Seconds left before the post-update sign-out; null until the password has been changed. */
  const [redirectIn, setRedirectIn] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const { user } = await authApi.me();
        setUserEmail(user.email);
        setUserName(user.name ?? "");
        setRole((user.role as UserRole) ?? null);
        setFirstTime(Boolean(user.mustChangePassword));
        setNeedsEmailCheck(user.firstLoginStep === "verifyEmail");
      } catch {
        // If me() fails (e.g. session expired), middleware will redirect.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * After a successful change the session is ended and the user signs in again with the new
   * password — confirming it works, and closing any session opened with the old one.
   */
  async function signOutToLogin() {
    try {
      await authApi.logout();
    } catch {
      /* the redirect below still ends the visit */
    }
    window.location.replace("/login?notice=password_changed");
  }

  useEffect(() => {
    if (redirectIn == null) return;
    if (redirectIn <= 0) {
      void signOutToLogin();
      return;
    }
    const t = window.setTimeout(() => setRedirectIn((n) => (n == null ? n : n - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [redirectIn]);

  async function sendCode() {
    setCodeBusy(true);
    setError(null);
    setCodeNote(null);
    try {
      const res = await authMutationsApi.sendFirstLoginCode();
      if (res.alreadyVerified) {
        setNeedsEmailCheck(false);
        return;
      }
      setCodeSent(true);
      setCodeNote(`Code sent to ${res.email ?? "your email"}.`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not send the code.");
    } finally {
      setCodeBusy(false);
    }
  }

  async function confirmCode() {
    setCodeBusy(true);
    setError(null);
    try {
      await authMutationsApi.verifyFirstLoginCode(code.trim());
      setNeedsEmailCheck(false);
      setCodeNote(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not confirm that code.");
    } finally {
      setCodeBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (!firstTime && currentPassword.length === 0) {
      setError("Please enter your current password.");
      return;
    }
    setSaving(true);
    try {
      await authExtraApi.changePassword({
        currentPassword: firstTime ? undefined : currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setRedirectIn(5);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update password",
      );
    } finally {
      setSaving(false);
    }
  }

  if (redirectIn != null) {
    const secondsLeft = Math.max(redirectIn, 0);
    return (
      /* Centered modal over a blurred backdrop; the page behind stays visible but out of focus. */
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
        role="presentation"
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="pw-updated-title"
          aria-describedby="pw-updated-body"
          className="oc-toast-enter w-full max-w-md rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50 via-white to-white p-7 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
        >
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </span>
          <h2 id="pw-updated-title" className="mt-4 text-xl font-bold text-gray-900">
            Password updated successfully
          </h2>
          <p id="pw-updated-body" className="mt-2 text-sm leading-relaxed text-black/70">
            Your password has been changed. For your security, you will be signed out and asked to sign in again
            with your new password.
          </p>
          <p className="mt-4 text-sm font-medium text-black/60" aria-live="polite">
            {secondsLeft > 0 ? (
              <>
                Redirecting to the sign-in page in{" "}
                <span className="tabular-nums font-semibold text-[#780301]">{secondsLeft}</span> second
                {secondsLeft === 1 ? "" : "s"}…
              </>
            ) : (
              "Signing you out…"
            )}
          </p>
          <Button
            type="button"
            autoFocus
            className="mt-5 h-11 w-full bg-[#780301] text-white hover:bg-[#5a0201]"
            onClick={() => void signOutToLogin()}
            disabled={secondsLeft === 0}
          >
            Sign in now
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-black/60 bg-[var(--color-opticore-bg,#F8F8F8)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Change password</h1>
        <p className="text-sm text-black/65 mt-1">
          {needsEmailCheck
            ? "First, confirm your email address. Your account was set up by an administrator, so we check the address reaches you before you choose a password."
            : firstTime
              ? "First-time setup: choose your new password. You will not need to enter your temporary password again."
              : "Choose a strong password you have not used elsewhere. You stay signed in on this device after saving."}
        </p>
      </div>

      {needsEmailCheck ? (
        <div className="space-y-4 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="rounded-lg bg-black/[0.03] border border-black/10 px-3 py-2 text-sm">
            <div className="font-semibold text-black">{userName || "Account"}</div>
            {userEmail ? <div className="text-black/60 truncate">{userEmail}</div> : null}
          </div>
          <p className="text-sm text-black/70">
            Confirm this is your address before setting a password. We will email you a 6-digit code.
          </p>
          {codeSent ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800" htmlFor="first-login-code">
                Enter the code
              </label>
              <Input
                id="first-login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="h-12 tracking-[0.4em]"
                placeholder="000000"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.replace(/\D/g, ""))}
                disabled={codeBusy}
              />
            </div>
          ) : null}
          {codeNote ? <p className="text-sm text-black/60">{codeNote}</p> : null}
          {error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {codeSent ? (
              <Button
                type="button"
                className="h-12 bg-[#FF990A] hover:bg-[#e88909] text-white font-semibold"
                disabled={codeBusy || code.trim().length !== 6}
                onClick={() => void confirmCode()}
              >
                {codeBusy ? "Checking…" : "Confirm email"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-12"
              disabled={codeBusy}
              onClick={() => void sendCode()}
            >
              {codeSent ? "Send another code" : codeBusy ? "Sending…" : "Email me a code"}
            </Button>
          </div>
        </div>
      ) : (
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-xl border border-black/10 bg-white p-6 shadow-sm"
      >
        <div className="rounded-lg bg-black/[0.03] border border-black/10 px-3 py-2 text-sm">
          <div className="font-semibold text-black">{userName || "Account"}</div>
          {userEmail ? <div className="text-black/60 truncate">{userEmail}</div> : null}
        </div>
        {!firstTime ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800">Current password</label>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="h-12"
              required
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-800">New password</label>
          <PasswordInput
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="h-12"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-800">Confirm new password</label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="h-12"
            required
          />
        </div>
        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
        ) : null}
        <Button
          type="submit"
          disabled={saving}
          className="w-full h-12 bg-[#FF990A] hover:bg-[#e88909] text-white font-semibold"
        >
          {saving ? "Saving…" : "Update password"}
        </Button>
        <p className="text-center text-xs text-black/50">
          <Link href={homeForRole(role)} className="text-[#780301] hover:underline">
            Cancel
          </Link>
        </p>
      </form>
      )}
    </div>
  );
}
