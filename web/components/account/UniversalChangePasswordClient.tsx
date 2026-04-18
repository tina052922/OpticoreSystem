"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { UserRole } from "@/types/db";

function homeForRole(role: UserRole | null): string {
  switch (role) {
    case "instructor":
      return "/faculty/schedule";
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
 * Password update for any authenticated role (Supabase `auth.updateUser`).
 * Optional `?next=` internal path; otherwise redirects to a role-appropriate home.
 */
export function UniversalChangePasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
      const rpc = await supabase.rpc("auth_get_my_user_row");
      const row = rpc.data as { name?: string; role?: UserRole } | null;
      if (row?.name) setUserName(row.name);
      if (row?.role) setRole(row.role);
      setLoading(false);
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
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Not configured");
      const { error: updErr } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });
      if (updErr) throw updErr;

      const nextRaw = searchParams.get("next")?.trim();
      const next =
        nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : homeForRole(role);
      router.refresh();
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
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
          Choose a strong password you have not used elsewhere. You stay signed in on this device after saving.
        </p>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="rounded-lg bg-black/[0.03] border border-black/10 px-3 py-2 text-sm">
          <div className="font-semibold text-black">{userName || "Account"}</div>
          {userEmail ? <div className="text-black/60 truncate">{userEmail}</div> : null}
        </div>
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
        {error ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p> : null}
        <Button type="submit" disabled={saving} className="w-full h-12 bg-[#FF990A] hover:bg-[#e88909] text-white font-semibold">
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
