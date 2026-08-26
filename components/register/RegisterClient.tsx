"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginContainer } from "@/components/login/LoginContainer";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { registerApi, apiFetch, ApiClientError } from "@/lib/api/client";

type CollegeRow = { id: string; code: string; name: string };
type ProgramRow = { id: string; code: string; name: string; collegeId: string };
type SectionRow = { id: string; name: string; programId: string; yearLevel: number };

/** Mirrors the backend's per-signup resend cooldown. */
const RESEND_COOLDOWN_SECONDS = 60;

export function RegisterClient() {
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

  /**
   * Set once the verification email is away. Registration deliberately creates
   * no account, so there is nothing to log into yet — we swap the form for a
   * "check your inbox" panel instead of redirecting.
   */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState("");
  const [resendState, setResendState] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [collegesRes, programsRes, sectionsRes] = await Promise.all([
          apiFetch<{ colleges: CollegeRow[] }>("/api/catalog/public/colleges", { method: "GET", retryOn401: false }),
          apiFetch<{ programs: ProgramRow[] }>("/api/catalog/public/programs", { method: "GET", retryOn401: false }),
          apiFetch<{ sections: SectionRow[] }>("/api/catalog/public/sections", { method: "GET", retryOn401: false }),
        ]);
        if (!cancelled) {
          setColleges(collegesRes.colleges);
          setPrograms(programsRes.programs);
          setSections(sectionsRes.sections);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiClientError ? e.message : "Could not load catalog");
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
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

    // Must match the backend's MIN_PASSWORD_LENGTH, otherwise the form accepts
    // a password the API will reject.
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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

    const normalizedEmail = email.trim().toLowerCase();

    setSubmitting(true);
    try {
      const res = await registerApi.student({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        programId,
        sectionId,
        yearLevel,
        studentId: studentId.trim() || "",
      });

      /**
       * No auto-login here: `register-student` only stores a pending signup and
       * emails a link. The account does not exist until `/verify-email` is
       * opened, so attempting to sign in now would always fail.
       */
      setSentMessage(res.message);
      setSentTo(normalizedEmail);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      // Don't keep the plaintext password in component state any longer than
      // the request needs it.
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (!sentTo || cooldown > 0) return;
    setResendState({ kind: "sending" });
    try {
      await registerApi.resendVerification(sentTo);
      setResendState({ kind: "sent" });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setResendState({
        kind: "error",
        message: err instanceof ApiClientError ? err.message : "Could not resend the email.",
      });
    }
  }

  if (sentTo) {
    return (
      <LoginContainer>
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[#780301]/10 flex items-center justify-center">
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#780301"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-black">Check your email</h1>
          <p className="text-base text-black/80">{sentMessage}</p>
          <p className="text-base text-black/80">
            We sent a verification link to <strong>{sentTo}</strong>. Open it to finish
            creating your account — no account exists until you do.
          </p>
          <p className="text-sm text-black/55">
            Can&apos;t find it? Check your spam folder.
          </p>

          {resendState.kind === "error" ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              {resendState.message}
            </div>
          ) : null}
          {resendState.kind === "sent" && cooldown > 0 ? (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
              Verification email sent again.
            </div>
          ) : null}

          <Button
            type="button"
            onClick={() => void onResend()}
            disabled={cooldown > 0 || resendState.kind === "sending"}
            className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold disabled:opacity-60"
          >
            {resendState.kind === "sending"
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend email"}
          </Button>

          <p className="text-center text-base">
            <Link href="/login" className="text-[#5483b3] font-medium hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </LoginContainer>
    );
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
              placeholder="yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-14 rounded-xl border-black/25 shadow-md text-base placeholder:text-[#636364]"
              required
            />
            <p className="text-sm text-black/55">
              Student registration requires a Gmail address. We&apos;ll send a
              verification link there.
            </p>
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
              minLength={8}
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
              minLength={8}
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
