"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, authApi, profileApi } from "@/lib/api/client";

/** Mirrors the backend cooldown between code sends. */
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

const NETWORK_MESSAGE = "We could not reach OptiCore. Check your internet connection and try again.";

function isNetworkError(e: unknown): boolean {
  return e instanceof ApiClientError && e.status === 0;
}

/**
 * Change the sign-in email: send a code to the NEW address, then confirm it.
 *
 * Shared by every role's profile page (admins, chairmen, students, instructors).
 *
 * A dropped connection used to surface as "Cannot reach API (Failed to fetch)" even when the server
 * had already moved the account — the next "Send code" then said the address was already in use.
 * Now, when the confirm step loses its answer (network error, or "request expired" because a retry
 * found the change already done), the account is re-read: if it already carries the new address the
 * change is reported as done. A success opens a clear "Email updated" dialog.
 */
export function EmailChangeSection({ email }: { email: string }) {
  const router = useRouter();
  /** Shown address; updated right away on success, before the page re-renders from the server. */
  const [currentEmail, setCurrentEmail] = useState(email);
  const [stage, setStage] = useState<"idle" | "entry" | "code">("idle");
  const [draft, setDraft] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  /** The new address, while the "Email updated" dialog is open. */
  const [updatedTo, setUpdatedTo] = useState<string | null>(null);

  useEffect(() => setCurrentEmail(email), [email]);

  useEffect(() => {
    if (!lastSentAt) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((lastSentAt + RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
      setCooldown(left);
      return left;
    };
    if (tick() === 0) return;
    const id = window.setInterval(() => {
      if (tick() === 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [lastSentAt]);

  useEffect(() => {
    if (!updatedTo) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeUpdated();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedTo]);

  function reset() {
    setStage("idle");
    setDraft("");
    setCode("");
    setPendingEmail("");
    setError(null);
  }

  function succeed(newEmail: string) {
    setCurrentEmail(newEmail);
    reset();
    setUpdatedTo(newEmail);
  }

  function closeUpdated() {
    setUpdatedTo(null);
    // The page and the sidebar are rendered from the account on the server; re-read them.
    router.refresh();
  }

  /** Whether the account already carries `target` — the change went through even if its answer was lost. */
  async function accountAlreadyHas(target: string): Promise<boolean | null> {
    try {
      const me = await authApi.me({ forceRefresh: true });
      return (me.user.email ?? "").trim().toLowerCase() === target.trim().toLowerCase();
    } catch {
      return null; // still unreachable
    }
  }

  async function sendCode() {
    const next = draft.trim().toLowerCase();
    if (!next) {
      setError("Enter the new email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await profileApi.requestEmailChange(next);
      setPendingEmail(res.email);
      setStage("code");
      setCode("");
      setLastSentAt(Date.now());
    } catch (e) {
      setError(isNetworkError(e) ? NETWORK_MESSAGE : e instanceof ApiClientError ? e.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  /** "Resend code" re-sends to the address already waiting for confirmation. */
  async function resendCode() {
    if (!pendingEmail) return;
    setBusy(true);
    setError(null);
    try {
      const res = await profileApi.requestEmailChange(pendingEmail);
      setPendingEmail(res.email);
      setCode("");
      setLastSentAt(Date.now());
    } catch (e) {
      // "That is already your email address" here means the earlier confirm did go through.
      if (e instanceof ApiClientError && /already your email/i.test(e.message)) {
        succeed(pendingEmail);
        return;
      }
      setError(isNetworkError(e) ? NETWORK_MESSAGE : e instanceof ApiClientError ? e.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    const value = code.trim();
    if (value.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await profileApi.verifyEmailChange(value);
      succeed(res.email);
    } catch (e) {
      const target = pendingEmail;
      const lostAnswer =
        isNetworkError(e) || (e instanceof ApiClientError && (e.code === "EXPIRED" || e.status === 409));
      if (lostAnswer && target) {
        const done = await accountAlreadyHas(target);
        if (done) {
          succeed(target);
          return;
        }
        if (done === null) {
          setError(
            "We could not reach OptiCore to confirm. Your email may already have changed — refresh the page to check, or try again.",
          );
          return;
        }
      }
      setError(isNetworkError(e) ? NETWORK_MESSAGE : e instanceof ApiClientError ? e.message : "Could not confirm the code.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await profileApi.cancelEmailChange();
    } catch {
      // Nothing pending server-side is fine -- the point is to leave this form.
    } finally {
      setBusy(false);
      reset();
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50 space-y-3">
      <div>
        <div className="text-[12px] text-gray-500">Email</div>
        <div className="font-semibold mt-1 text-gray-900 break-words">{currentEmail}</div>
      </div>

      {stage === "idle" ? (
        <Button type="button" variant="outline" className="bg-white" onClick={() => setStage("entry")}>
          Change email
        </Button>
      ) : null}

      {stage === "entry" ? (
        <div className="space-y-2">
          <label className="block text-[12px] font-semibold text-black/75" htmlFor="profile-new-email">
            New email address
          </label>
          <Input
            id="profile-new-email"
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="you@example.com"
            disabled={busy}
            autoComplete="email"
          />
          <p className="text-[11px] text-black/55">
            We will send a {CODE_LENGTH}-digit code there. Your email only changes once you enter it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-[#780301] hover:bg-[#5a0201] text-white"
              disabled={busy}
              onClick={() => void sendCode()}
            >
              {busy ? "Sending…" : "Send code"}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {stage === "code" ? (
        <div className="space-y-2">
          <label className="block text-[12px] font-semibold text-black/75" htmlFor="profile-email-code">
            Code sent to {pendingEmail}
          </label>
          <Input
            id="profile-email-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="tracking-[0.4em]"
            disabled={busy}
          />
          <p className="text-[11px] text-black/55">
            Check that inbox, including spam. We also told {currentEmail} that this was requested.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-[#780301] hover:bg-[#5a0201] text-white"
              disabled={busy || code.length !== CODE_LENGTH}
              onClick={() => void confirmCode()}
            >
              {busy ? "Confirming…" : "Confirm new email"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="bg-white"
              disabled={busy || cooldown > 0}
              onClick={() => void resendCode()}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void cancel()}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-[12px] text-[#780301]" role="alert">
          {error}
        </p>
      ) : null}

      {updatedTo ? (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeUpdated();
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="email-updated-title"
            aria-describedby="email-updated-body"
            className="oc-toast-enter w-full max-w-md rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50 via-white to-white p-7 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </div>
            <h2 id="email-updated-title" className="mt-4 text-lg font-bold text-emerald-900">
              Email updated successfully
            </h2>
            <p id="email-updated-body" className="mt-2 text-[13px] leading-relaxed text-black/65">
              Your OptiCore account now uses
              <br />
              <strong className="break-all text-black/85">{updatedTo}</strong>
              <br />
              Use this address the next time you sign in.
            </p>
            <Button
              type="button"
              autoFocus
              className="mt-6 bg-[#780301] px-8 text-white hover:bg-[#5a0201]"
              onClick={closeUpdated}
            >
              OK
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
