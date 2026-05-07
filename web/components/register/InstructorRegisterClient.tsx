"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginContainer } from "@/components/login/LoginContainer";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CollegeRow = { id: string; code: string; name: string };

export function InstructorRegisterClient() {
  const [phase, setPhase] = useState<"register" | "otp">("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [colleges, setColleges] = useState<CollegeRow[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [otpGenerated, setOtpGenerated] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");

  function makeOtp(): string {
    const n = Math.floor(Math.random() * 1_000_000);
    return String(n).padStart(6, "0");
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/colleges", { cache: "no-store" });
        const data = (await res.json()) as { colleges?: CollegeRow[] };
        if (!cancelled) setColleges(data.colleges ?? []);
      } catch {
        if (!cancelled) setColleges([]);
      } finally {
        if (!cancelled) setLoadingColleges(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setOtpGenerated(null);
    setOtpInput("");
    if (!employeeId.trim() || employeeId.trim().length < 2) {
      setError("Employee ID is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register-instructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          employeeId: employeeId.trim(),
          collegeId: collegeId || null,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        temporaryPassword?: string;
      };
      if (!res.ok) throw new Error(data.error || "Registration failed");
      const tempPassword = data.temporaryPassword ?? "";
      if (!tempPassword) throw new Error("Temporary password not returned.");

      // Auto sign-in using the server-generated temporary password
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: tempPassword,
      });
      if (signInErr) throw signInErr;

      setSuccess(data.message ?? "Account created.");
      setOtpGenerated(makeOtp());
      setOtpInput("");
      setPhase("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!otpGenerated) return;
    const normalized = otpInput.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      setError("Enter the 6-digit code.");
      return;
    }
    if (normalized !== otpGenerated) {
      setError("Incorrect code.");
      return;
    }
    window.location.assign("/faculty/change-password");
  }

  return (
    <LoginContainer>
      <div className="space-y-8">
        <div className="flex justify-center">
          <div className="w-32 h-32 sm:w-36 sm:h-36 shrink-0 rounded-full overflow-hidden ring-2 ring-black/[0.06] shadow-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CTU_LOGO_PNG}
              alt="Cebu Technological University"
              width={144}
              height={144}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.includes("ctu-logo.svg")) el.src = "/login/ctu-logo.svg";
              }}
            />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-medium text-[#181818] tracking-tight">
            Cebu Technological University
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold text-black">Instructor registration</h2>
        </div>

        {success ? (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <p className="text-sm font-medium">{success}</p>
            {phase === "otp" && otpGenerated ? (
              <form onSubmit={(e) => void onVerifyOtp(e)} className="space-y-4">
                <div className="mx-auto inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-6 py-3 text-3xl font-black tracking-[0.35em] tabular-nums">
                  {otpGenerated}
                </div>
                <Input
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="Enter 6-digit code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-12 text-center tracking-[0.25em] tabular-nums"
                  required
                />
                {error ? (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>
                ) : null}
                <Button type="submit" className="w-full h-12 bg-[#780301] hover:bg-[#5a0201] text-white">
                  Verify OTP
                </Button>
              </form>
            ) : (
              <Button asChild className="w-full h-12 bg-[#780301] hover:bg-[#5a0201] text-white">
                <Link href="/login">Continue to sign in</Link>
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="ins-name" className="block text-lg font-medium text-[#181818]">
                Full name
              </label>
              <Input
                id="ins-name"
                placeholder="Last name, First name M.I."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className="h-14 rounded-xl border-black/25 shadow-md text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ins-email" className="block text-lg font-medium text-[#181818]">
                Gmail address
              </label>
              <Input
                id="ins-email"
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-14 rounded-xl border-black/25 shadow-md text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ins-employee-id" className="block text-lg font-medium text-[#181818]">
                Employee ID
              </label>
              <Input
                id="ins-employee-id"
                placeholder="CTU employee / staff ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                autoComplete="off"
                className="h-14 rounded-xl border-black/25 shadow-md text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ins-college" className="block text-lg font-medium text-[#181818]">
                Home college <span className="text-black/50 font-normal">(optional)</span>
              </label>
              <select
                id="ins-college"
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                disabled={loadingColleges}
                className="flex h-14 w-full rounded-xl border border-black/25 bg-white px-3 text-base shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[#FF990A]/40"
              >
                <option value="">Select college…</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {error ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>
            ) : null}

            <Button
              type="submit"
              disabled={submitting || loadingColleges}
              className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold"
            >
              {submitting ? "Creating account…" : "Register"}
            </Button>

            <p className="text-center text-base">
              <Link href="/login" className="text-[#5483b3] font-medium hover:underline">
                Back to sign in
              </Link>
              {" · "}
              <Link href="/register" className="text-[#5483b3] font-medium hover:underline">
                Student registration
              </Link>
            </p>
          </form>
        )}
      </div>
    </LoginContainer>
  );
}
