"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, authApi, authExtraApi } from "@/lib/api/client";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [firstTime, setFirstTime] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { user } = await authApi.me();
        setUserEmail(user.email);
        setUserName(user.name ?? "");
        setRole((user.role as UserRole) ?? null);
        setFirstTime(Boolean(user.mustChangePassword));
      } catch {
        // If me() fails (e.g. session expired), middleware will redirect.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      const nextRaw = searchParams.get("next")?.trim();
      const next =
        nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : homeForRole(role);
      router.refresh();
      router.replace(next);
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
          {firstTime
            ? "First-time setup: choose your new password. You will not need to enter your temporary password again."
            : "Choose a strong password you have not used elsewhere. You stay signed in on this device after saving."}
        </p>
      </div>

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
            <Input
              type="password"
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
          <Input
            type="password"
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
          <Input
            type="password"
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
    </div>
  );
}
