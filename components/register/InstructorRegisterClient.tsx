"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginContainer } from "@/components/login/LoginContainer";
import { OtpVerificationPanel } from "@/components/register/OtpVerificationPanel";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { useCampusBranding } from "@/contexts/CampusBrandingContext";
import { apiFetch, registerApi, ApiClientError } from "@/lib/api/client";
import { DESIGNATION_POLICIES } from "@/lib/faculty/designation-system";
import {
  FACULTY_EMPLOYMENT_NON_RESIDENT,
  FACULTY_EMPLOYMENT_RESIDENT,
} from "@/lib/faculty/employment-status";

type CollegeRow = { id: string; code: string; name: string };
type ProgramRow = { id: string; code: string; name: string; collegeId: string };

const fieldClass = "h-11 rounded-xl border border-black/25 bg-white px-3 text-sm shadow-sm w-full";
const labelClass = "block text-sm font-medium text-[#181818] mb-1";

/** Must match the backend's MIN_PASSWORD_LENGTH. */
const MIN_PASSWORD_LENGTH = 8;
/** Must match `isAllowedInstructorEmail` on the server. */
const INSTRUCTOR_DOMAIN = "ctu.edu.ph";

/**
 * Mirrors the server check. Client-side validation is a UX convenience only —
 * the server re-validates, and is the sole authority.
 */
function isCtuEmail(value: string): boolean {
  const domain = value.trim().toLowerCase().split("@")[1];
  if (!domain || domain.endsWith(".")) return false;
  return domain === INSTRUCTOR_DOMAIN || domain.endsWith(`.${INSTRUCTOR_DOMAIN}`);
}

export function InstructorRegisterClient() {
  const branding = useCampusBranding();
  const [phase, setPhase] = useState<"register" | "otp" | "submitted">("register");
  const [fullName, setFullName] = useState("");
  const [aka, setAka] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [programId, setProgramId] = useState("");
  const [bsDegree, setBsDegree] = useState("");
  const [msDegree, setMsDegree] = useState("");
  const [doctoralDegree, setDoctoralDegree] = useState("");
  const [major1, setMajor1] = useState("");
  const [major2, setMajor2] = useState("");
  const [major3, setMajor3] = useState("");
  const [minor1, setMinor1] = useState("");
  const [minor2, setMinor2] = useState("");
  const [minor3, setMinor3] = useState("");
  const [research, setResearch] = useState("");
  const [extension, setExtension] = useState("");
  const [production, setProduction] = useState("");
  const [specialTraining, setSpecialTraining] = useState("");
  const [status, setStatus] = useState<typeof FACULTY_EMPLOYMENT_RESIDENT | typeof FACULTY_EMPLOYMENT_NON_RESIDENT>(
    FACULTY_EMPLOYMENT_RESIDENT,
  );
  const [designation, setDesignation] = useState("");
  const [colleges, setColleges] = useState<CollegeRow[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  /** Epoch ms of the last code send, for the resend countdown. */
  const [lastSentAt, setLastSentAt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [collegeRes, programRes] = await Promise.all([
          apiFetch<{ colleges: CollegeRow[] }>("/api/catalog/public/colleges", { method: "GET", retryOn401: false }),
          apiFetch<{ programs: ProgramRow[] }>("/api/catalog/public/programs", { method: "GET", retryOn401: false }),
        ]);
        if (!cancelled) {
          setColleges(collegeRes.colleges);
          setPrograms(programRes.programs ?? []);
        }
      } catch {
        if (!cancelled) {
          setColleges([]);
          setPrograms([]);
        }
      } finally {
        if (!cancelled) setLoadingColleges(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const programsForCollege = programs.filter((p) => p.collegeId === collegeId);

  function profilePayload() {
    return {
      aka: aka.trim() || null,
      bsDegree: bsDegree.trim() || null,
      msDegree: msDegree.trim() || null,
      doctoralDegree: doctoralDegree.trim() || null,
      major1: major1.trim() || null,
      major2: major2.trim() || null,
      major3: major3.trim() || null,
      minor1: minor1.trim() || null,
      minor2: minor2.trim() || null,
      minor3: minor3.trim() || null,
      research: research.trim() || null,
      extension: extension.trim() || null,
      production: production.trim() || null,
      specialTraining: specialTraining.trim() || null,
      status,
      designation: designation.trim() || null,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!isCtuEmail(normalizedEmail)) {
      setError(`Use your CTU email address (@${INSTRUCTOR_DOMAIN}).`);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!collegeId) {
      setError("Please select your home college.");
      return;
    }
    if (!programId) {
      setError("Please select your home department so the Program Chairman can review your registration.");
      return;
    }

    setSubmitting(true);
    try {
      await registerApi.instructor({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        collegeId,
        programId,
        employeeId: employeeId.trim() || undefined,
        ...profilePayload(),
      });

      setEmail(normalizedEmail);
      // Drop the plaintext from component state the moment the server has it.
      setPassword("");
      setConfirmPassword("");
      setLastSentAt(Date.now());
      setPhase("otp");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Registration failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Code entry ──────────────────────────────────────────────────────────
  if (phase === "otp") {
    return (
      <LoginContainer>
        <OtpVerificationPanel
          email={email}
          lastSentAt={lastSentAt}
          title="Verify your CTU email"
          submitLabel="Verify email"
          startOverLabel="Start over"
          verify={registerApi.verifyInstructor}
          resend={registerApi.resendInstructorVerification}
          onVerified={(message) => {
            setSuccess(message);
            setPhase("submitted");
          }}
          onResent={({ lastSentAt: sentAt }) => setLastSentAt(sentAt)}
          onStartOver={() => {
            setPhase("register");
            setSuccess(null);
            setError(null);
          }}
        />
      </LoginContainer>
    );
  }

  // ── Awaiting chairman approval ──────────────────────────────────────────
  if (phase === "submitted") {
    return (
      <LoginContainer>
        <div className="space-y-6 text-center max-w-lg mx-auto">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#b45309"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-black">Awaiting approval</h1>
          <p className="text-base text-black/80">
            {success ??
              "Your registration is awaiting approval from your department chairman."}
          </p>
          <p className="text-sm text-black/55">
            You won&apos;t be able to sign in until it&apos;s approved. We&apos;ll
            email <strong>{email}</strong> once your chairman reviews it.
          </p>
          <Button
            asChild
            className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold"
          >
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </LoginContainer>
    );
  }

  return (
    <LoginContainer>
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="flex justify-center">
          <div className="w-28 h-28 shrink-0 rounded-full overflow-hidden ring-2 ring-black/[0.06] shadow-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={branding.logoUrl || CTU_LOGO_PNG}
              alt={branding.universityName}
              width={112}
              height={112}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.includes("ctu-logo.svg")) el.src = "/login/ctu-logo.svg";
              }}
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-xl font-medium text-[#181818]">{branding.universityName}</h1>
          <h2 className="text-lg font-bold text-black">Instructor registration</h2>
          <p className="text-[13px] text-black/55">
            Register with your CTU email and home department. We&apos;ll email you a
            code, then your Program Chairman approves the account and confirms your
            Employee ID.
          </p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5 max-h-[min(70vh,640px)] overflow-y-auto pr-1">
            <fieldset className="space-y-3 border-0 p-0">
              <legend className="text-sm font-bold text-[#780301]">Account</legend>
              <div>
                <label htmlFor="ins-name" className={labelClass}>
                  Full name
                </label>
                <Input
                  id="ins-name"
                  placeholder="Last name, First name M.I."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="ins-aka" className={labelClass}>
                  A.K.A. (optional)
                </label>
                <Input
                  id="ins-aka"
                  value={aka}
                  onChange={(e) => setAka(e.target.value)}
                  className={fieldClass}
                  placeholder="Printed name on INS forms"
                />
              </div>
              <div>
                <label htmlFor="ins-email" className={labelClass}>
                  CTU email address
                </label>
                <Input
                  id="ins-email"
                  type="email"
                  placeholder={`you@${INSTRUCTOR_DOMAIN}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={fieldClass}
                  aria-describedby="ins-email-hint"
                  required
                />
                <p id="ins-email-hint" className="mt-1 text-xs text-black/55">
                  Must be your institutional <strong>@{INSTRUCTOR_DOMAIN}</strong>{" "}
                  address — we email your verification code there.
                </p>
              </div>
              <div>
                <label htmlFor="ins-password" className={labelClass}>
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="ins-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${fieldClass} pr-11`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#636364] outline-none hover:text-[#181818] focus-visible:ring-2 focus-visible:ring-black/20"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-black/55">
                  At least {MIN_PASSWORD_LENGTH} characters.
                </p>
              </div>
              <div>
                <label htmlFor="ins-confirm-password" className={labelClass}>
                  Confirm password
                </label>
                <Input
                  id="ins-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="ins-employee-id" className={labelClass}>
                  Employee ID (optional)
                </label>
                <Input
                  id="ins-employee-id"
                  placeholder="CTU employee / staff ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  autoComplete="off"
                  className={fieldClass}
                  aria-describedby="ins-employee-id-hint"
                />
                <p id="ins-employee-id-hint" className="mt-1 text-xs text-black/55">
                  Helps your chairman find you. They confirm the final Employee ID
                  when approving your account.
                </p>
              </div>
              <div>
                <label htmlFor="ins-college" className={labelClass}>
                  Home college
                </label>
                <select
                  id="ins-college"
                  value={collegeId}
                  onChange={(e) => {
                    setCollegeId(e.target.value);
                    setProgramId("");
                  }}
                  disabled={loadingColleges}
                  className={fieldClass}
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
              <div>
                <label htmlFor="ins-program" className={labelClass}>
                  Home department
                </label>
                <select
                  id="ins-program"
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  disabled={!collegeId}
                  className={fieldClass}
                  required
                >
                  <option value="">{collegeId ? "Select department…" : "Select college first…"}</option>
                  {programsForCollege.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            <fieldset className="space-y-3 border-0 p-0">
              <legend className="text-sm font-bold text-[#780301]">Employment</legend>
              <div>
                <label htmlFor="ins-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="ins-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value === FACULTY_EMPLOYMENT_NON_RESIDENT
                        ? FACULTY_EMPLOYMENT_NON_RESIDENT
                        : FACULTY_EMPLOYMENT_RESIDENT,
                    )
                  }
                  className={fieldClass}
                >
                  <option value={FACULTY_EMPLOYMENT_RESIDENT}>{FACULTY_EMPLOYMENT_RESIDENT}</option>
                  <option value={FACULTY_EMPLOYMENT_NON_RESIDENT}>{FACULTY_EMPLOYMENT_NON_RESIDENT}</option>
                </select>
              </div>
              <div>
                <label htmlFor="ins-designation" className={labelClass}>
                  Designation
                </label>
                <select
                  id="ins-designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Regular faculty (no designation)</option>
                  {DESIGNATION_POLICIES.filter((p) => p.key !== "Regular Faculty").map((p) => (
                    <option key={p.key} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            <fieldset className="space-y-3 border-0 p-0">
              <legend className="text-sm font-bold text-[#780301]">Degrees & majors</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="ins-bs" className={labelClass}>
                    BS
                  </label>
                  <Input id="ins-bs" value={bsDegree} onChange={(e) => setBsDegree(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="ins-ms" className={labelClass}>
                    MS
                  </label>
                  <Input id="ins-ms" value={msDegree} onChange={(e) => setMsDegree(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="ins-phd" className={labelClass}>
                    Doctorate
                  </label>
                  <Input
                    id="ins-phd"
                    value={doctoralDegree}
                    onChange={(e) => setDoctoralDegree(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="ins-maj1" className={labelClass}>
                    Major 1
                  </label>
                  <Input id="ins-maj1" value={major1} onChange={(e) => setMajor1(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="ins-maj2" className={labelClass}>
                    Major 2
                  </label>
                  <Input id="ins-maj2" value={major2} onChange={(e) => setMajor2(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="ins-maj3" className={labelClass}>
                    Major 3
                  </label>
                  <Input id="ins-maj3" value={major3} onChange={(e) => setMajor3(e.target.value)} className={fieldClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="ins-min1" className={labelClass}>
                    Minor 1
                  </label>
                  <Input id="ins-min1" value={minor1} onChange={(e) => setMinor1(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="ins-min2" className={labelClass}>
                    Minor 2
                  </label>
                  <Input id="ins-min2" value={minor2} onChange={(e) => setMinor2(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="ins-min3" className={labelClass}>
                    Minor 3
                  </label>
                  <Input id="ins-min3" value={minor3} onChange={(e) => setMinor3(e.target.value)} className={fieldClass} />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-3 border-0 p-0">
              <legend className="text-sm font-bold text-[#780301]">Other (optional)</legend>
              <div>
                <label htmlFor="ins-research" className={labelClass}>
                  Research
                </label>
                <Input
                  id="ins-research"
                  value={research}
                  onChange={(e) => setResearch(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="ins-ext" className={labelClass}>
                    Extension
                  </label>
                  <Input
                    id="ins-ext"
                    value={extension}
                    onChange={(e) => setExtension(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="ins-prod" className={labelClass}>
                    Production
                  </label>
                  <Input
                    id="ins-prod"
                    value={production}
                    onChange={(e) => setProduction(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ins-training" className={labelClass}>
                  Special training
                </label>
                <Input
                  id="ins-training"
                  value={specialTraining}
                  onChange={(e) => setSpecialTraining(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </fieldset>

            {error ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>
            ) : null}

            <Button
              type="submit"
              disabled={submitting || loadingColleges}
              className="w-full h-12 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg font-semibold sticky bottom-0"
            >
              {submitting ? "Sending code…" : "Register"}
            </Button>

            <p className="text-center text-sm pb-2">
              <Link href="/login" className="text-[#5483b3] font-medium hover:underline">
                Back to sign in
              </Link>
              {" · "}
              <Link href="/register" className="text-[#5483b3] font-medium hover:underline">
                Student registration
              </Link>
            </p>
          </form>
      </div>
    </LoginContainer>
  );
}
