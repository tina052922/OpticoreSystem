"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, profileApi } from "@/lib/api/client";

/** Mirrors the backend cooldown between code sends. */
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

export type AdminProfileCardProps = {
  fullName: string;
  /** Shown as Employee ID; falls back to internal user id when missing. */
  employeeId?: string | null;
  roleLabel: string;
  /** College / department line */
  collegeLine: string;
  email: string;
  accountStatus?: string;
  /** Extra grid rows (e.g. program scope for chairman). */
  extraRows?: Array<{ label: string; value: string }>;
  /** Optional second line under the name (e.g. role • college) */
  subheading?: string;
  /**
   * Turns "Edit Profile" into a working form for the signed-in account.
   *
   * Off by default: this card is shared by every admin role, and the button was a disabled
   * placeholder everywhere before. Only pages that opt in get the editor.
   */
  editable?: boolean;
  /** The stored employee number, when it differs from the `employeeId` shown (which may be a fallback). */
  storedEmployeeId?: string | null;
  showChangePassword?: boolean;
  /**
   * Hides "Edit Profile" entirely, rather than showing it disabled.
   *
   * A greyed-out button is a promise the page does not keep; where a role cannot edit its own
   * profile, showing nothing is more honest than showing something that never responds.
   */
  showEditProfile?: boolean;
  /**
   * What the identity number is called here. Students carry a Student ID, staff an Employee ID.
   */
  idLabel?: string;
  /**
   * Whether the holder may change that number.
   *
   * A student's is issued by the registrar and is how their enrolment is matched, so they read it
   * rather than edit it. Staff set their own.
   */
  allowIdEdit?: boolean;
};

/**
 * Shared profile card — matches Chairman profile layout for all admin roles.
 */
export function AdminProfileCard({
  fullName,
  employeeId,
  roleLabel,
  collegeLine,
  email,
  accountStatus = "Active",
  extraRows = [],
  subheading,
  editable = false,
  storedEmployeeId,
  showChangePassword = true,
  showEditProfile = true,
  idLabel = "Employee ID",
  allowIdEdit = true,
}: AdminProfileCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState(fullName);
  const [employeeIdDraft, setEmployeeIdDraft] = useState(storedEmployeeId ?? "");

  /**
   * The email is changed on its own, not with Save.
   *
   * It is the sign-in identity, so it only moves once a code sent to the NEW address comes back --
   * typing it into the form and pressing Save would let anyone with a borrowed session point the
   * account at their own inbox.
   */
  const [emailStage, setEmailStage] = useState<"idle" | "entry" | "code">("idle");
  const [emailDraft, setEmailDraft] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [cooldown, setCooldown] = useState(0);

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

  function resetEmailFlow() {
    setEmailStage("idle");
    setEmailDraft("");
    setEmailCode("");
    setPendingEmail("");
    setEmailError(null);
  }

  async function sendEmailCode() {
    const next = emailDraft.trim().toLowerCase();
    if (!next) {
      setEmailError("Enter the new email address.");
      return;
    }
    setEmailBusy(true);
    setEmailError(null);
    try {
      const res = await profileApi.requestEmailChange(next);
      setPendingEmail(res.email);
      setEmailStage("code");
      setEmailCode("");
      setLastSentAt(Date.now());
    } catch (e) {
      setEmailError(e instanceof ApiClientError ? e.message : "Could not send the code.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function confirmEmailCode() {
    const code = emailCode.trim();
    if (code.length !== CODE_LENGTH) {
      setEmailError(`Enter the ${CODE_LENGTH}-digit code.`);
      return;
    }
    setEmailBusy(true);
    setEmailError(null);
    try {
      const res = await profileApi.verifyEmailChange(code);
      resetEmailFlow();
      setMessage(`Email changed to ${res.email}.`);
      router.refresh();
    } catch (e) {
      setEmailError(e instanceof ApiClientError ? e.message : "Could not confirm the code.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function cancelEmailChange() {
    setEmailBusy(true);
    try {
      await profileApi.cancelEmailChange();
    } catch {
      // Nothing pending server-side is fine -- the point is to leave this form.
    } finally {
      setEmailBusy(false);
      resetEmailFlow();
    }
  }

  const idLine = employeeId?.trim() || "—";

  const baseRows: Array<[string, string]> = [
    [idLabel, idLine],
    ["Role", roleLabel],
    ["College / Department", collegeLine],
    ["Email", email],
    ["Account Status", accountStatus],
  ];

  const extraGrid = extraRows.map((r) => [r.label, r.value] as [string, string]);
  const allRows = [...baseRows, ...extraGrid];

  function startEdit() {
    setNameDraft(fullName);
    setEmployeeIdDraft(storedEmployeeId ?? "");
    setError(null);
    setMessage(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
    resetEmailFlow();
  }

  async function save() {
    const name = nameDraft.trim();
    if (!name) {
      setError("Enter your full name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await profileApi.updateDetails(
        // A read-only number is never sent, so a stale draft cannot overwrite it.
        allowIdEdit ? { name, employeeId: employeeIdDraft.trim() || null } : { name },
      );
      setEditing(false);
      setMessage("Profile saved.");
      // The page is server-rendered from /api/auth/me, so re-fetch it rather than
      // patching local state — the sidebar reads the same name.
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 max-w-[900px]">
      <div className="text-[22px] font-semibold text-gray-900">{fullName}</div>
      {subheading ? (
        <div className="text-[13px] text-gray-600 mt-1">{subheading}</div>
      ) : (
        <div className="text-[13px] text-gray-600 mt-1">
          {roleLabel} • {collegeLine}
        </div>
      )}

      {editing ? (
        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[12px] font-semibold text-black/75" htmlFor="profile-full-name">
                Full name
              </label>
              <Input
                id="profile-full-name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                disabled={saving}
                autoComplete="name"
              />
            </div>
            {allowIdEdit ? (
              <div className="space-y-1">
                <label className="block text-[12px] font-semibold text-black/75" htmlFor="profile-employee-id">
                  {idLabel}
                </label>
                <Input
                  id="profile-employee-id"
                  value={employeeIdDraft}
                  onChange={(e) => setEmployeeIdDraft(e.target.value)}
                  placeholder="Leave blank if you have none"
                  disabled={saving}
                  autoComplete="off"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-[12px] font-semibold text-black/75">{idLabel}</div>
                <div className="h-10 flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 tabular-nums">
                  {idLine}
                </div>
                <p className="text-[11px] text-gray-500">Issued by the registrar — ask them to correct it.</p>
              </div>
            )}
          </div>

          {/* Email moves on its own, only once a code sent to the new address comes back. */}
          <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50 space-y-3">
            <div>
              <div className="text-[12px] text-gray-500">Email</div>
              <div className="font-semibold mt-1 text-gray-900 break-words">{email}</div>
            </div>

            {emailStage === "idle" ? (
              <Button type="button" variant="outline" className="bg-white" onClick={() => setEmailStage("entry")}>
                Change email
              </Button>
            ) : null}

            {emailStage === "entry" ? (
              <div className="space-y-2">
                <label className="block text-[12px] font-semibold text-black/75" htmlFor="profile-new-email">
                  New email address
                </label>
                <Input
                  id="profile-new-email"
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="you@gmail.com"
                  disabled={emailBusy}
                  autoComplete="email"
                />
                <p className="text-[11px] text-black/55">
                  We will send a {CODE_LENGTH}-digit code there. Your email only changes once you enter it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="bg-[#780301] hover:bg-[#5a0201] text-white"
                    disabled={emailBusy}
                    onClick={() => void sendEmailCode()}
                  >
                    {emailBusy ? "Sending…" : "Send code"}
                  </Button>
                  <Button type="button" variant="ghost" disabled={emailBusy} onClick={resetEmailFlow}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {emailStage === "code" ? (
              <div className="space-y-2">
                <label className="block text-[12px] font-semibold text-black/75" htmlFor="profile-email-code">
                  Code sent to {pendingEmail}
                </label>
                <Input
                  id="profile-email-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={CODE_LENGTH}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="tracking-[0.4em]"
                  disabled={emailBusy}
                />
                <p className="text-[11px] text-black/55">
                  Check that inbox, including spam. We also told {email} that this was requested.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="bg-[#780301] hover:bg-[#5a0201] text-white"
                    disabled={emailBusy || emailCode.length !== CODE_LENGTH}
                    onClick={() => void confirmEmailCode()}
                  >
                    {emailBusy ? "Confirming…" : "Confirm new email"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white"
                    disabled={emailBusy || cooldown > 0}
                    onClick={() => void sendEmailCode()}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </Button>
                  <Button type="button" variant="ghost" disabled={emailBusy} onClick={() => void cancelEmailChange()}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {emailError ? <p className="text-[12px] text-[#780301]">{emailError}</p> : null}
          </div>

          {/*
            Role and college decide what this account can reach, so they are not editable from your
            own profile -- a DOI admin asks for those to be changed, they do not set them.
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[14px]">
            {[
              ["Role", roleLabel],
              ["College / Department", collegeLine],
            ].map(([k, v]) => (
              <div key={k} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <div className="text-[12px] text-gray-500">{k}</div>
                <div className="font-semibold mt-1 text-gray-900 break-words">{v}</div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-gray-500">
            Role and college are set by the campus administrator and cannot be changed here.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="bg-[#FF990A] hover:bg-[#e88909] text-white"
              type="button"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="outline" className="bg-white" type="button" disabled={saving} onClick={cancelEdit}>
              Cancel
            </Button>
            {error ? <p className="text-[12px] text-[#780301] self-center">{error}</p> : null}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-[14px]">
            {allRows.map(([k, v]) => (
              <div key={k} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <div className="text-[12px] text-gray-500">{k}</div>
                <div className="font-semibold mt-1 text-gray-900 break-words">{v}</div>
              </div>
            ))}
          </div>

          {showEditProfile || showChangePassword || message ? (
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              {showEditProfile ? (
                <Button
                  className="bg-[#FF990A] hover:bg-[#e88909] text-white"
                  type="button"
                  disabled={!editable}
                  onClick={editable ? startEdit : undefined}
                >
                  Edit Profile
                </Button>
              ) : null}
              {showChangePassword ? (
                <Button variant="outline" className="bg-white" type="button" disabled>
                  Change Password
                </Button>
              ) : null}
              {message ? <p className="text-[12px] text-emerald-800 self-center">{message}</p> : null}
            </div>
          ) : null}
        </>
      )}

      <p className="text-[12px] text-gray-500 mt-6">
        Profile data is loaded from your account. {idLabel} may mirror your internal user record when no separate
        number is stored.
      </p>
    </div>
  );
}
