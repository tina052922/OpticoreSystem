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
  ACADEMIC_RANK_SUGGESTIONS,
  composeFullName,
  computeAge,
  normalizeFacultySex,
} from "@/lib/faculty/hr-form-23b";
import {
  FACULTY_EMPLOYMENT_NON_RESIDENT,
  FACULTY_EMPLOYMENT_RESIDENT,
} from "@/lib/faculty/employment-status";
import {
  FACULTY_CATEGORY_GEC,
  FACULTY_CATEGORY_PROGRAM,
  type FacultyCategory,
} from "@/lib/faculty/faculty-category";

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
  /** Composed from the three name cells; the account and the profile store the same string. */
  const [aka, setAka] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [facultyCategory, setFacultyCategory] = useState<FacultyCategory>(FACULTY_CATEGORY_PROGRAM);
  const [programId, setProgramId] = useState("");
  // Same cells the Faculty Profile page keeps (CTU HR Form 23B), so a registration and a
  // chairman-entered profile hold exactly the same information.
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [academicRank, setAcademicRank] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [educationalQualification, setEducationalQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [eligibility, setEligibility] = useState("");
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
  const fullName = composeFullName({ lastName, firstName, middleName });
  const ageFromBirthDate = computeAge(dateOfBirth);

  function profilePayload() {
    return {
      aka: aka.trim() || null,
      lastName: lastName.trim() || null,
      firstName: firstName.trim() || null,
      middleName: middleName.trim() || null,
      academicRank: academicRank.trim() || null,
      sex: normalizeFacultySex(sex) || null,
      dateOfBirth: dateOfBirth.trim() || null,
      educationalQualification: educationalQualification.trim() || null,
      experience: experience.trim() || null,
      eligibility: eligibility.trim() || null,
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
    if (!lastName.trim() || !firstName.trim()) {
      setError("Last name and first name are required.");
      return;
    }
    if (!collegeId) {
      setError("Please select your home college.");
      return;
    }
    if (facultyCategory === FACULTY_CATEGORY_PROGRAM && !programId) {
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
        facultyCategory,
        programId:
          facultyCategory === FACULTY_CATEGORY_GEC ? null : programId,
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
            Register with your CTU email. Program faculty choose a home department for
            chairman review; GEC instructors are college-scoped and not locked to one
            department. We&apos;ll email you a code, then an administrator confirms your
            Employee ID.
          </p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5 max-h-[min(70vh,640px)] overflow-y-auto pr-1">
            <fieldset className="space-y-3 border-0 p-0">
              <legend className="text-sm font-bold text-[#780301]">Account</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="ins-last-name" className={labelClass}>
                    Last name
                  </label>
                  <Input
                    id="ins-last-name"
                    placeholder="Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="ins-first-name" className={labelClass}>
                    First name
                  </label>
                  <Input
                    id="ins-first-name"
                    placeholder="Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="ins-middle-name" className={labelClass}>
                    Middle name
                  </label>
                  <Input
                    id="ins-middle-name"
                    placeholder="Miguel"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    autoComplete="additional-name"
                    className={fieldClass}
                  />
                </div>
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
                  Helps your reviewer find you. They confirm the final Employee ID
                  when approving your account.
                </p>
              </div>
              <div>
                <label htmlFor="ins-category" className={labelClass}>
                  Instructor category
                </label>
                <select
                  id="ins-category"
                  value={facultyCategory}
                  onChange={(e) => {
                    const next =
                      e.target.value === FACULTY_CATEGORY_GEC
                        ? FACULTY_CATEGORY_GEC
                        : FACULTY_CATEGORY_PROGRAM;
                    setFacultyCategory(next);
                    if (next === FACULTY_CATEGORY_GEC) setProgramId("");
                  }}
                  className={fieldClass}
                  required
                >
                  <option value={FACULTY_CATEGORY_PROGRAM}>Program / department instructor</option>
                  <option value={FACULTY_CATEGORY_GEC}>GEC instructor</option>
                </select>
                <p className="mt-1 text-xs text-black/55">
                  {facultyCategory === FACULTY_CATEGORY_GEC
                    ? "GEC instructors belong to the college and may teach across departments."
                    : "Your home department’s Program Chairman reviews this registration."}
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
              {facultyCategory === FACULTY_CATEGORY_PROGRAM ? (
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
              ) : null}
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
              <legend className="text-sm font-bold text-[#780301]">Faculty profile (HR Form 23B)</legend>
              <p className="text-xs text-black/55">
                The same details your chairman keeps on Faculty Profile. Leave a field blank if it does not
                apply \u2014 your reviewer can complete it later.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="ins-rank" className={labelClass}>
                    Academic rank
                  </label>
                  <Input
                    id="ins-rank"
                    list="ins-academic-rank-suggestions"
                    placeholder="Instructor I"
                    value={academicRank}
                    onChange={(e) => setAcademicRank(e.target.value)}
                    className={fieldClass}
                  />
                  <datalist id="ins-academic-rank-suggestions">
                    {ACADEMIC_RANK_SUGGESTIONS.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="ins-sex" className={labelClass}>
                    Sex
                  </label>
                  <select
                    id="ins-sex"
                    value={sex}
                    onChange={(e) => setSex(normalizeFacultySex(e.target.value))}
                    className={fieldClass}
                  >
                    <option value="">\u2014</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="ins-dob" className={labelClass}>
                    Date of birth
                  </label>
                  <Input
                    id="ins-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="ins-age" className={labelClass}>
                    Age
                  </label>
                  <Input
                    id="ins-age"
                    readOnly
                    tabIndex={-1}
                    placeholder="\u2014"
                    value={ageFromBirthDate != null ? String(ageFromBirthDate) : ""}
                    className={`${fieldClass} bg-black/[0.04] text-black/70`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ins-qualification" className={labelClass}>
                  Educational qualification
                </label>
                <Input
                  id="ins-qualification"
                  placeholder="MS Information Technology"
                  value={educationalQualification}
                  onChange={(e) => setEducationalQualification(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="ins-experience" className={labelClass}>
                  Experience
                </label>
                <Input
                  id="ins-experience"
                  placeholder="8 years teaching, 3 years industry"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="ins-eligibility" className={labelClass}>
                  Eligibility
                </label>
                <Input
                  id="ins-eligibility"
                  placeholder="CSC Professional / LET / PRC licence"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
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
