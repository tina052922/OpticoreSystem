"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginContainer } from "@/components/login/LoginContainer";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { apiFetch, registerApi, authApi, ApiClientError } from "@/lib/api/client";
import { DESIGNATION_POLICIES } from "@/lib/faculty/designation-system";
import {
  FACULTY_EMPLOYMENT_ORGANIC,
  FACULTY_EMPLOYMENT_PART_TIME,
} from "@/lib/faculty/employment-status";

type CollegeRow = { id: string; code: string; name: string };

const fieldClass = "h-11 rounded-xl border border-black/25 bg-white px-3 text-sm shadow-sm w-full";
const labelClass = "block text-sm font-medium text-[#181818] mb-1";

export function InstructorRegisterClient() {
  const [phase, setPhase] = useState<"register" | "otp">("register");
  const [fullName, setFullName] = useState("");
  const [aka, setAka] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [collegeId, setCollegeId] = useState("");
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
  const [status, setStatus] = useState<typeof FACULTY_EMPLOYMENT_ORGANIC | typeof FACULTY_EMPLOYMENT_PART_TIME>(
    FACULTY_EMPLOYMENT_ORGANIC,
  );
  const [designation, setDesignation] = useState("");
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
        const data = await apiFetch<{ colleges: { id: string; code: string; name: string }[] }>("/api/catalog/public/colleges", { method: "GET", retryOn401: false });
        if (!cancelled) setColleges(data.colleges);
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
    setOtpGenerated(null);
    setOtpInput("");
    if (!employeeId.trim() || employeeId.trim().length < 2) {
      setError("Employee ID is required.");
      return;
    }
    if (!collegeId) {
      setError("Please select your home college.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await registerApi.instructor({
        fullName: fullName.trim(),
        email: email.trim(),
        employeeId: employeeId.trim(),
        collegeId,
        ...profilePayload(),
      });
      const tempPassword = data.temporaryPassword ?? "";
      if (!tempPassword) throw new Error("Temporary password not returned.");

      await authApi.login({
        email: email.trim().toLowerCase(),
        password: tempPassword,
      });

      setSuccess(
        data.message ??
          "Account created. Your profile is visible to your chairman for review. Continue to OTP verification.",
      );
      setOtpGenerated(makeOtp());
      setOtpInput("");
      setPhase("otp");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!otpGenerated) return;
    const normalized = otpInput.replace(/\D/g, "");
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
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="flex justify-center">
          <div className="w-28 h-28 shrink-0 rounded-full overflow-hidden ring-2 ring-black/[0.06] shadow-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CTU_LOGO_PNG}
              alt="Cebu Technological University"
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
          <h1 className="text-xl font-medium text-[#181818]">Cebu Technological University</h1>
          <h2 className="text-lg font-bold text-black">Instructor registration</h2>
          <p className="text-[13px] text-black/55">
            Complete your faculty profile. Use the same Employee ID your chairman recorded so schedules link
            automatically.
          </p>
        </div>

        {success ? (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <p className="text-sm font-medium">{success}</p>
            {phase === "otp" && otpGenerated ? (
              <form noValidate onSubmit={(e) => void onVerifyOtp(e)} className="space-y-4">
                <div className="mx-auto inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-6 py-3 text-3xl font-black tracking-[0.35em] tabular-nums">
                  {otpGenerated}
                </div>
                <Input
                  type="text"
                  name="instructor-registration-otp"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-12 text-center tracking-[0.25em] tabular-nums"
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
                  Gmail address
                </label>
                <Input
                  id="ins-email"
                  type="email"
                  placeholder="you@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="ins-employee-id" className={labelClass}>
                  Employee ID
                </label>
                <Input
                  id="ins-employee-id"
                  placeholder="CTU employee / staff ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  autoComplete="off"
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="ins-college" className={labelClass}>
                  Home college
                </label>
                <select
                  id="ins-college"
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
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
                      e.target.value === FACULTY_EMPLOYMENT_PART_TIME
                        ? FACULTY_EMPLOYMENT_PART_TIME
                        : FACULTY_EMPLOYMENT_ORGANIC,
                    )
                  }
                  className={fieldClass}
                >
                  <option value={FACULTY_EMPLOYMENT_ORGANIC}>{FACULTY_EMPLOYMENT_ORGANIC}</option>
                  <option value={FACULTY_EMPLOYMENT_PART_TIME}>{FACULTY_EMPLOYMENT_PART_TIME}</option>
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
              {submitting ? "Creating account…" : "Register"}
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
        )}
      </div>
    </LoginContainer>
  );
}
