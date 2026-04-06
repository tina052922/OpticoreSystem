"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginContainer } from "@/components/login/LoginContainer";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getDefaultHomeForRole } from "@/lib/auth/role-home";

type CollegeRow = { id: string; code: string; name: string };
type ProgramRow = { id: string; code: string; name: string; collegeId: string };
type SectionRow = { id: string; name: string; programId: string; yearLevel: number };

export function RegisterClient() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [programId, setProgramId] = useState("");
  const [yearLevel, setYearLevel] = useState<number>(1);
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");

  const [colleges, setColleges] = useState<CollegeRow[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase is not configured.");
        setLoadingCatalog(false);
        return;
      }
      const [{ data: col }, { data: prog }, { data: sec }] = await Promise.all([
        supabase.from("College").select("id, code, name").order("code"),
        supabase.from("Program").select("id, code, name, collegeId").order("code"),
        supabase.from("Section").select("id, name, programId, yearLevel").order("name"),
      ]);
      if (!cancelled) {
        setColleges((col ?? []) as CollegeRow[]);
        setPrograms((prog ?? []) as ProgramRow[]);
        setSections((sec ?? []) as SectionRow[]);
        setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const programsForCollege = useMemo(() => {
    if (!collegeId) return [];
    return programs.filter((p) => p.collegeId === collegeId);
  }, [programs, collegeId]);

  const sectionOptions = useMemo(() => {
    if (!programId) return [];
    return sections.filter((s) => s.programId === programId && s.yearLevel === yearLevel);
  }, [sections, programId, yearLevel]);

  useEffect(() => {
    setProgramId("");
  }, [collegeId]);

  useEffect(() => {
    setSectionId("");
  }, [programId, yearLevel]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!collegeId) {
      setError("Select your college / department.");
      return;
    }
    if (!programId || !sectionId) {
      setError("Select program, year level, and section.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Missing Supabase environment variables.");

      const regRes = await fetch("/api/auth/register-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          programId,
          sectionId,
          yearLevel,
          studentId: studentId.trim() || null,
        }),
      });
      const regJson = (await regRes.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!regRes.ok) {
        throw new Error(regJson?.error ?? "Registration failed");
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInErr) throw signInErr;

      const { data: rpc, error: rpcReadErr } = await supabase.rpc("auth_get_my_user_row");
      if (rpcReadErr) throw rpcReadErr;
      const role =
        rpc && typeof rpc === "object" && rpc !== null && "role" in rpc
          ? String((rpc as { role: string }).role).trim()
          : "";
      if (role === "student") {
        router.refresh();
        window.location.assign(getDefaultHomeForRole("student"));
        return;
      }
      window.location.assign("/student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
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
          <h2 className="text-xl sm:text-2xl font-bold text-black">Create account</h2>
          <p className="text-base sm:text-lg text-black/90">
            to continue OptiCore–Campus Intelligence System
          </p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-lg font-medium text-[#181818]">
              Full name
            </label>
            <Input
              id="fullName"
              placeholder="Last name, First name M.I."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className="h-14 rounded-xl border-black/25 shadow-md text-base placeholder:text-[#636364]"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-email" className="block text-lg font-medium text-[#181818]">
              Email
            </label>
            <Input
              id="reg-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-14 rounded-xl border-black/25 shadow-md text-base placeholder:text-[#636364]"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-password" className="block text-lg font-medium text-[#181818]">
              Password
            </label>
            <Input
              id="reg-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="h-14 rounded-xl border-black/25 shadow-md text-base placeholder:text-[#636364]"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-lg font-medium text-[#181818]">
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="h-14 rounded-xl border-black/25 shadow-md text-base placeholder:text-[#636364]"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="college" className="block text-lg font-medium text-[#181818]">
              College / Department
            </label>
            <select
              id="college"
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              disabled={loadingCatalog}
              className="flex h-14 w-full rounded-xl border border-black/25 bg-white px-3 text-base shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[#FF990A]/40"
              required
            >
              <option value="">Select college…</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="program" className="block text-lg font-medium text-[#181818]">
              Program
            </label>
            <select
              id="program"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              disabled={loadingCatalog || !collegeId}
              className="flex h-14 w-full rounded-xl border border-black/25 bg-white px-3 text-base shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[#FF990A]/40"
              required
            >
              <option value="">{!collegeId ? "Select college first…" : "Select program…"}</option>
              {programsForCollege.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="yearLevel" className="block text-lg font-medium text-[#181818]">
              Year level
            </label>
            <select
              id="yearLevel"
              value={yearLevel}
              onChange={(e) => setYearLevel(parseInt(e.target.value, 10))}
              className="flex h-14 w-full rounded-xl border border-black/25 bg-white px-3 text-base shadow-md outline-none focus-visible:ring-2 focus-visible:ring-black/10"
              required
            >
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>
                  {y}
                  {y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} year
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="section" className="block text-lg font-medium text-[#181818]">
              Section
            </label>
            <select
              id="section"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!programId || sectionOptions.length === 0}
              className="flex h-14 w-full rounded-xl border border-black/25 bg-white px-3 text-base shadow-md outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:opacity-60"
              required
            >
              <option value="">
                {!programId ? "Select program first…" : sectionOptions.length === 0 ? "No section for this year" : "Select section…"}
              </option>
              {sectionOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="studentId" className="block text-lg font-medium text-[#181818]">
              Student ID <span className="text-black/50 font-normal">(optional)</span>
            </label>
            <Input
              id="studentId"
              placeholder="University ID number"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="h-14 rounded-xl border-black/25 shadow-md text-base placeholder:text-[#636364]"
            />
          </div>

          {error ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>
          ) : null}

          <Button
            type="submit"
            disabled={submitting || loadingCatalog}
            className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold tracking-wide"
          >
            {submitting ? "Creating account…" : "Register"}
          </Button>

          <p className="text-center text-base">
            <span className="text-[#595959]">Already have an account? </span>
            <Link href="/login" className="text-[#5483b3] font-medium hover:underline">
              Login
            </Link>
          </p>

          <p className="text-center text-xs text-black/45 leading-relaxed">
            Instructors with Gmail can also{" "}
            <Link href="/register/instructor" className="text-[#5483b3] hover:underline">
              self-register
            </Link>
            . Staff with admin credentials:{" "}
            <Link href="/login" className="text-[#5483b3] hover:underline">
              Sign in
            </Link>
            .
          </p>
        </form>
      </div>
    </LoginContainer>
  );
}
