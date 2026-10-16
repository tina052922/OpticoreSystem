"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthFormHeader } from "@/components/login/AuthFormHeader";
import { LoginContainer } from "@/components/login/LoginContainer";
import { useCampusBranding } from "@/contexts/CampusBrandingContext";
import { registerApi, apiFetch } from "@/lib/api/client";
import { OtpVerificationPanel } from "@/components/register/OtpVerificationPanel";
import {
  clearPendingRegistration,
  loadPendingRegistration,
  savePendingRegistration,
} from "@/lib/auth/pending-registration-state";
import { useActionToast } from "@/components/alerts/useActionToast";

/** One field style across every signed-out form, so sign-in and register stop diverging. */
const FIELD_CLASS =
  "h-11 rounded-lg border-black/15 bg-white text-sm shadow-sm placeholder:text-black/35 focus-visible:ring-2 focus-visible:ring-[#780301]/25";
const SELECT_CLASS =
  "flex h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#780301]/25 disabled:opacity-60";
const LABEL_CLASS = "block text-sm font-medium text-[#181818]";

type CollegeRow = { id: string; code: string; name: string };
type ProgramRow = {
  id: string;
  code: string;
  name: string;
  collegeId: string;
  yearCount?: number | null;
};
type SectionRow = { id: string; name: string; programId: string; yearLevel: number };

function yearOptionsForProgram(program: ProgramRow | undefined): number[] {
  const n =
    typeof program?.yearCount === "number" && program.yearCount >= 1 && program.yearCount <= 6
      ? program.yearCount
      : 4;
  return Array.from({ length: n }, (_, i) => i + 1);
}

export function RegisterClient() {
  const branding = useCampusBranding();
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
  const toast = useActionToast();

  /**
   * Set once the code is away. Registration deliberately creates no account, so
   * there is nothing to log into yet — we swap the form for the OTP panel.
   *
   * Only non-secret UX state is persisted; the code itself never leaves the
   * server. See `lib/auth/pending-registration-state.ts`.
   */
  const [pending, setPending] = useState<
    { email: string; lastSentAt: number } | null
  >(null);
  const [verifiedMessage, setVerifiedMessage] = useState<string | null>(null);

  // Resume the code screen after a refresh or an accidental navigation.
  useEffect(() => {
    const saved = loadPendingRegistration();
    if (saved) setPending({ email: saved.email, lastSentAt: saved.lastSentAt });
  }, []);

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
          toast.fail(e, "Could not load colleges and programs", "student registration");
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const programsForCollege = useMemo(() => {
    if (!collegeId) return [];
    return programs.filter((p) => p.collegeId === collegeId);
  }, [programs, collegeId]);

  const sectionOptions = useMemo(() => {
    if (!programId) return [];
    return sections.filter((s) => s.programId === programId && s.yearLevel === yearLevel);
  }, [sections, programId, yearLevel]);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === programId),
    [programs, programId],
  );

  const yearOptions = useMemo(() => yearOptionsForProgram(selectedProgram), [selectedProgram]);

  useEffect(() => {
    setProgramId("");
  }, [collegeId]);

  useEffect(() => {
    setSectionId("");
  }, [programId, yearLevel]);

  useEffect(() => {
    if (yearOptions.includes(yearLevel)) return;
    setYearLevel(yearOptions[0] ?? 1);
  }, [yearOptions, yearLevel]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Must match the backend's MIN_PASSWORD_LENGTH, otherwise the form accepts
    // a password the API will reject.
    if (password.length < 8) {
      toast.refuse("Password is too short", "Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.refuse("Passwords do not match", "Type the same password in both boxes.");
      return;
    }
    if (!collegeId) {
      toast.refuse("Choose your college", "Pick the college you are enrolled in.");
      return;
    }
    if (!programId || !sectionId) {
      toast.refuse("Finish your enrolment details", "Program, year level and section are all needed.");
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
       * No auto-login here: `register-student` only holds the signup in server
       * memory and emails a code. The account does not exist until the code is
       * confirmed, so attempting to sign in now would always fail.
       */
      const now = Date.now();
      savePendingRegistration({
        email: normalizedEmail,
        lastSentAt: now,
        expiresAt: now + res.expiresInMinutes * 60_000,
      });
      setPending({ email: normalizedEmail, lastSentAt: now });

      // Don't keep the plaintext password in component state any longer than
      // the request needs it.
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.fail(err, "Could not complete your registration", "student registration");
    } finally {
      setSubmitting(false);
    }
  }

  /** Abandon the in-flight signup and return to a clean form. */
  function startOver() {
    clearPendingRegistration();
    setPending(null);
    setVerifiedMessage(null);
  }

  if (verifiedMessage) {
    return (
      <LoginContainer>
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#15803d"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-black">Email verified</h1>
          <p className="text-base text-black/80">{verifiedMessage}</p>
          <Button
            asChild
            className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold"
          >
            <Link href="/login">Continue to login</Link>
          </Button>
        </div>
      </LoginContainer>
    );
  }

  if (pending) {
    return (
      <LoginContainer>
        <OtpVerificationPanel
          email={pending.email}
          lastSentAt={pending.lastSentAt}
          onVerified={(message) => {
            setPending(null);
            setVerifiedMessage(message);
          }}
          onResent={({ lastSentAt, expiresAt }) => {
            savePendingRegistration({ email: pending.email, lastSentAt, expiresAt });
            setPending({ email: pending.email, lastSentAt });
          }}
          onStartOver={startOver}
        />
      </LoginContainer>
    );
  }

  return (
    <LoginContainer>
      <AuthFormHeader
        title="Create your account"
        subtitle={`Student registration for ${branding.headerTitle} — Campus Intelligence System.`}
      />

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
        {/* Grouped so seven fields read as two short steps rather than one long column. */}
        <fieldset className="space-y-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
            Your details
          </legend>

          <div className="space-y-1.5">
            <label htmlFor="fullName" className={LABEL_CLASS}>
              Full name
            </label>
            <Input
              id="fullName"
              placeholder="Last name, First name M.I."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className={FIELD_CLASS}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-email" className={LABEL_CLASS}>
              Email
            </label>
            <Input
              id="reg-email"
              type="email"
              placeholder="yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={FIELD_CLASS}
              required
            />
            <p className="text-xs leading-relaxed text-black/50">
              Use a Gmail address — the verification code is sent there.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="reg-password" className={LABEL_CLASS}>
                Password
              </label>
              <PasswordInput
                id="reg-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={FIELD_CLASS}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className={LABEL_CLASS}>
                Confirm password
              </label>
              <PasswordInput
                id="confirmPassword"
                placeholder="Repeat it"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={FIELD_CLASS}
                required
                minLength={8}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-black/[0.07] pt-5">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
            Your program
          </legend>

          <div className="space-y-1.5">
            <label htmlFor="college" className={LABEL_CLASS}>
              College / Department
            </label>
            <select
              id="college"
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              disabled={loadingCatalog}
              className={SELECT_CLASS}
              required
            >
              <option value="">{loadingCatalog ? "Loading…" : "Select college…"}</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="program" className={LABEL_CLASS}>
              Program
            </label>
            <select
              id="program"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              disabled={loadingCatalog || !collegeId}
              className={SELECT_CLASS}
              required
            >
              <option value="">
                {!collegeId ? "Select a college first…" : "Select program…"}
              </option>
              {programsForCollege.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.code} — {pr.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="yearLevel" className={LABEL_CLASS}>
                Year level
              </label>
              <select
                id="yearLevel"
                value={yearLevel}
                onChange={(e) => setYearLevel(parseInt(e.target.value, 10))}
                className={SELECT_CLASS}
                required
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                    {y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} year
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="section" className={LABEL_CLASS}>
                Section
              </label>
              <select
                id="section"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!programId || sectionOptions.length === 0}
                className={SELECT_CLASS}
                required
              >
                <option value="">
                  {!programId
                    ? "Select a program first…"
                    : sectionOptions.length === 0
                      ? "No section for this year"
                      : "Select section…"}
                </option>
                {sectionOptions.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="studentId" className={LABEL_CLASS}>
              Student ID <span className="font-normal text-black/40">(optional)</span>
            </label>
            <Input
              id="studentId"
              placeholder="University ID number"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </fieldset>

        <Button
          type="submit"
          disabled={submitting || loadingCatalog}
          className="h-11 w-full rounded-lg bg-[#780301] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a0201] disabled:opacity-70"
        >
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <div className="mt-6 border-t border-black/[0.07] pt-5 text-center text-sm">
        <p className="text-black/55">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#780301] hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-1.5 text-black/55">
          Teaching staff?{" "}
          <Link href="/register/instructor" className="font-semibold text-[#780301] hover:underline">
            Register as an instructor
          </Link>
        </p>
      </div>
    </LoginContainer>
  );
}
