"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catalogApi, profileApi } from "@/lib/api/client";
import { EmailChangeSection } from "@/components/profile/EmailChangeSection";
import { useActionToast } from "@/components/alerts/useActionToast";

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
  /**
   * Program Chairman: lets them change the program they chair, within their own college. Everything
   * that follows a chairman's program (plotting, the INS "Reviewed & Certified by" line, dashboards)
   * moves with it. Omit for roles without a program.
   */
  programScope?: { programId: string | null; collegeId: string | null };
  /** "sevenDigits": a Student ID — digits only, exactly 7, as at registration. */
  idInputMode?: "free" | "sevenDigits";
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
  programScope,
  idInputMode = "free",
}: AdminProfileCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useActionToast();
  const [nameDraft, setNameDraft] = useState(fullName);
  const [employeeIdDraft, setEmployeeIdDraft] = useState(storedEmployeeId ?? "");
  const [programDraft, setProgramDraft] = useState(programScope?.programId ?? "");
  const [programOptions, setProgramOptions] = useState<{ id: string; code: string; name: string }[]>([]);

  // The chairman's own college's programs, loaded only when the editor opens.
  useEffect(() => {
    if (!editing || !programScope) return;
    let alive = true;
    catalogApi
      .programs()
      .then((r) => {
        if (!alive) return;
        const list = (r.programs ?? [])
          .filter((p) => !programScope.collegeId || p.collegeId === programScope.collegeId)
          .sort((a, b) => a.code.localeCompare(b.code));
        setProgramOptions(list);
      })
      .catch(() => alive && setProgramOptions([]));
    return () => {
      alive = false;
    };
  }, [editing, programScope]);

  const idLine = employeeId?.trim() || "—";

  const baseRows: Array<[string, string]> = [
    ["Full name", fullName?.trim() || "—"],
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
    setProgramDraft(programScope?.programId ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function save() {
    const name = nameDraft.trim();
    if (!name) {
      toast.refuse("Enter your full name");
      return;
    }
    if (allowIdEdit && idInputMode === "sevenDigits" && !/^\d{7}$/.test(employeeIdDraft.trim())) {
      toast.refuse(`${idLabel} must be exactly 7 digits`);
      return;
    }
    const programChanged = Boolean(programScope && programDraft && programDraft !== (programScope.programId ?? ""));
    setSaving(true);
    try {
      await profileApi.updateDetails({
        name,
        // A read-only number is never sent, so a stale draft cannot overwrite it.
        ...(allowIdEdit ? { employeeId: employeeIdDraft.trim() || null } : {}),
        ...(programChanged ? { chairmanProgramId: programDraft } : {}),
      });
      setEditing(false);
      if (programChanged) {
        const code = programOptions.find((p) => p.id === programDraft)?.code ?? "the new program";
        toast.ok("Profile updated successfully", `You are now the Program Chairman of ${code}.`);
      } else {
        toast.ok("Profile updated successfully");
      }
      // The page is server-rendered from /api/auth/me, so re-fetch it rather than
      // patching local state — the sidebar reads the same name.
      router.refresh();
    } catch (e) {
      toast.fail(e, "Could not save your profile", "admin profile");
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
                  onChange={(e) =>
                    setEmployeeIdDraft(
                      idInputMode === "sevenDigits" ? e.target.value.replace(/\D/g, "").slice(0, 7) : e.target.value,
                    )
                  }
                  placeholder={idInputMode === "sevenDigits" ? "7 digits, e.g. 2310456" : "Leave blank if you have none"}
                  inputMode={idInputMode === "sevenDigits" ? "numeric" : undefined}
                  maxLength={idInputMode === "sevenDigits" ? 7 : undefined}
                  disabled={saving}
                  autoComplete="off"
                />
                {idInputMode === "sevenDigits" ? (
                  <p className="text-[11px] text-gray-500">Exactly 7 digits, as on your registration.</p>
                ) : null}
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

          {programScope ? (
            <div className="space-y-1">
              <label className="block text-[12px] font-semibold text-black/75" htmlFor="profile-program-scope">
                Program scope
              </label>
              <select
                id="profile-program-scope"
                className="h-10 w-full max-w-md rounded-md border border-gray-300 bg-white px-3 text-sm"
                value={programDraft}
                onChange={(e) => setProgramDraft(e.target.value)}
                disabled={saving || programOptions.length === 0}
              >
                {programOptions.length === 0 ? <option value={programDraft}>Loading programs…</option> : null}
                {programOptions.length > 0 && !programDraft ? <option value="">Choose a program…</option> : null}
                {programOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500">
                The program you chair. Changing it moves your plotting, dashboards and your name on the INS
                forms (“Reviewed &amp; Certified by”) to the new program. Only programs in your college that
                have no chairman yet can be chosen.
              </p>
            </div>
          ) : null}

          {/*
            Email moves on its own, only once a code sent to the new address comes back: it is the
            sign-in identity, so Save never changes it. Shared with the instructor profile page.
          */}
          <EmailChangeSection email={email} />

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

          {showEditProfile || showChangePassword ? (
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
                // The shared change-password page (every role); Cancel brings them back here.
                <Button variant="outline" className="bg-white" asChild>
                  <Link href={`/account/change-password?next=${encodeURIComponent(pathname || "/")}`}>
                    Change Password
                  </Link>
                </Button>
              ) : null}
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
