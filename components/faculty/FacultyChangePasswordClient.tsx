"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, authMutationsApi } from "@/lib/api/client";

export function FacultyChangePasswordClient() {
  const router = useRouter();
  const [userName, setUserName] = useState("Instructor");
  const [userEmail, setUserEmail] = useState<string | null>(null);
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
        if (user?.email) setUserEmail(user.email);
        if (user?.name) setUserName(user.name);
      } catch {
        /* not authenticated */
      }
      setLoading(false);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!currentPassword.trim()) {
      setError("Current password is required.");
      return;
    }
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
      await authMutationsApi.changePassword({ currentPassword, newPassword });
      router.refresh();
      window.location.assign("/faculty");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center text-sm text-black/60">
        Loading…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Set your password</h1>
        <p className="text-sm text-black/65 mt-1">
          You signed in with a temporary password. Choose a new password to continue. You will then be taken to{" "}
          <strong>My Schedule</strong>.
        </p>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
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
          {saving ? "Saving…" : "Save and open my schedule"}
        </Button>
        <p className="text-center text-xs text-black/50">
          <Link href="/faculty" className="text-[#780301] hover:underline">
            Cancel
          </Link>
        </p>
      </form>
    </div>
  );
}
