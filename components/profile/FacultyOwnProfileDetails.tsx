"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { DESIGNATION_POLICIES } from "@/lib/faculty/designation-system";
import {
  ACADEMIC_RANK_SUGGESTIONS,
  DATE_OF_BIRTH_ERROR,
  composeFullName,
  computeAge,
  formatDateOfBirth,
  isValidDateOfBirth,
  latestDateOfBirth,
  splitFullName,
  toDateInputValue,
} from "@/lib/faculty/hr-form-23b";
import { FACULTY_EMPLOYMENT_NON_RESIDENT, FACULTY_EMPLOYMENT_RESIDENT } from "@/lib/faculty/employment-status";
import {
  FACULTY_CATEGORY_GEC,
  FACULTY_CATEGORY_OPTIONS,
  facultyCategoryBadge,
  facultyCategoryLabel,
  facultyCategoryRequiresDepartment,
  parseFacultyCategory,
} from "@/lib/faculty/faculty-category";

type SelfProfile = {
  fullName: string | null;
  lastName: string | null;
  firstName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  academicRank: string | null;
  designation: string | null;
  status: string | null;
  educationalQualification: string | null;
  experience: string | null;
  eligibility: string | null;
};

type SelfAccount = {
  name: string | null;
  employeeId: string | null;
  collegeId: string | null;
  facultyCategory: string | null;
  chairmanProgramId: string | null;
};

type College = { id: string; code: string; name: string };
type Program = { id: string; code: string; name: string; collegeId: string };

/** Every field registration asks for (email aside — that has its own code flow). */
type Draft = {
  lastName: string;
  firstName: string;
  middleName: string;
  employeeId: string;
  collegeId: string;
  facultyCategory: string;
  programId: string;
  sex: string;
  dateOfBirth: string;
  status: string;
  designation: string;
  academicRank: string;
  educationalQualification: string;
  experience: string;
  eligibility: string;
};

const ENDPOINT = "/api/portal/my-faculty-profile";

const fieldClass =
  "h-10 w-full rounded-md border border-black/25 bg-white px-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";
const labelClass = "text-xs font-medium text-black/70";

function sexLabel(v: string | null | undefined): string {
  const s = (v ?? "").trim().toUpperCase();
  return s === "M" ? "Male" : s === "F" ? "Female" : "";
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-black/50">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-black break-words">
        {value?.trim() ? value : <span className="font-normal text-black/30">—</span>}
      </dd>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

function draftFrom(profile: SelfProfile | null, account: SelfAccount | null): Draft {
  // Rows saved before the three name cells existed fall back to splitting the full name.
  const split = splitFullName(profile?.fullName ?? account?.name ?? "");
  return {
    lastName: profile?.lastName ?? split.lastName,
    firstName: profile?.firstName ?? split.firstName,
    middleName: profile?.middleName ?? split.middleName,
    employeeId: account?.employeeId ?? "",
    collegeId: account?.collegeId ?? "",
    facultyCategory: parseFacultyCategory(account?.facultyCategory),
    programId: account?.chairmanProgramId ?? "",
    sex: (profile?.sex ?? "").trim().toUpperCase(),
    dateOfBirth: toDateInputValue(profile?.dateOfBirth),
    status: profile?.status ?? "",
    designation: profile?.designation ?? "",
    academicRank: profile?.academicRank ?? "",
    educationalQualification: profile?.educationalQualification ?? "",
    experience: profile?.experience ?? "",
    eligibility: profile?.eligibility ?? "",
  };
}

/**
 * The instructor's own profile: everything they entered at registration, shown and editable —
 * name, Employee ID, home college / category / department, personal details and appointment.
 * (Email is changed on the Account card through a verification code.)
 */
export function FacultyOwnProfileDetails() {
  const router = useRouter();
  const [profile, setProfile] = useState<SelfProfile | null>(null);
  const [account, setAccount] = useState<SelfAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(null, null));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    let alive = true;
    const opts = { method: "GET" as const, retryOn401: false };
    Promise.all([
      apiFetch<{ profile: SelfProfile | null; account: SelfAccount | null }>(ENDPOINT),
      apiFetch<{ colleges: College[] }>("/api/catalog/public/colleges", opts).catch(() => ({ colleges: [] })),
      apiFetch<{ programs: Program[] }>("/api/catalog/public/programs", opts).catch(() => ({ programs: [] })),
    ])
      .then(([me, c, p]) => {
        if (!alive) return;
        setProfile(me.profile);
        setAccount(me.account);
        setColleges(c.colleges ?? []);
        setPrograms(p.programs ?? []);
      })
      .catch((e: unknown) => {
        if (alive) setLoadError(e instanceof Error ? e.message : "Could not load your profile.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const collegeLabel = useMemo(() => {
    const c = colleges.find((x) => x.id === account?.collegeId);
    return c ? `${c.code} — ${c.name}` : "";
  }, [colleges, account?.collegeId]);
  const programLabel = useMemo(() => {
    const p = programs.find((x) => x.id === account?.chairmanProgramId);
    return p ? `${p.code} — ${p.name}` : "";
  }, [programs, account?.chairmanProgramId]);
  const programsForCollege = useMemo(
    () => programs.filter((p) => p.collegeId === draft.collegeId),
    [programs, draft.collegeId],
  );

  function patch(next: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  function startEdit() {
    setDraft(draftFrom(profile, account));
    setMsg(null);
    setEditing(true);
  }

  async function save() {
    if (!draft.lastName.trim() || !draft.firstName.trim()) {
      setMsg({ kind: "error", text: "Enter your last and first name." });
      return;
    }
    if (!draft.employeeId.trim()) {
      setMsg({ kind: "error", text: "Enter your Employee ID." });
      return;
    }
    if (!draft.collegeId) {
      setMsg({ kind: "error", text: "Choose your home college." });
      return;
    }
    if (facultyCategoryRequiresDepartment(draft.facultyCategory) && !draft.programId) {
      setMsg({ kind: "error", text: "Choose your home department." });
      return;
    }
    if (!isValidDateOfBirth(draft.dateOfBirth)) {
      setMsg({ kind: "error", text: DATE_OF_BIRTH_ERROR });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await apiFetch<{ profile: SelfProfile | null; account: SelfAccount | null }>(ENDPOINT, {
        method: "PUT",
        body: {
          ...draft,
          // Optional for a GEC instructor; required for program and "both".
          programId: draft.programId,
          dateOfBirth: draft.dateOfBirth || null,
          sex: draft.sex || null,
        },
        invalidates: ["/api/auth/me"],
      });
      setProfile(r.profile);
      setAccount(r.account);
      setEditing(false);
      setMsg({ kind: "ok", text: "Profile updated successfully." });
      // The header, sidebar and Account card read the name and ID from the server.
      router.refresh();
    } catch (e: unknown) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not save. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-5 text-sm text-black/50 shadow-sm">
        Loading profile…
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 shadow-sm">{loadError}</div>
    );
  }

  const view = draftFrom(profile, account);
  const age = computeAge(editing ? draft.dateOfBirth : profile?.dateOfBirth);
  const shownCategory = editing ? draft.facultyCategory : view.facultyCategory;

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-black">My details</h2>
          <p className="mt-0.5 text-xs text-black/55">
            What you entered when you registered. You can update all of it; your chairman sees the same details on
            Faculty Profile.
          </p>
        </div>
        {!editing ? (
          <Button type="button" variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4 space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide text-[#780301]">Name and ID</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field id="self-last" label="Last name *">
                <Input id="self-last" value={draft.lastName} onChange={(e) => patch({ lastName: e.target.value })} />
              </Field>
              <Field id="self-first" label="First name *">
                <Input id="self-first" value={draft.firstName} onChange={(e) => patch({ firstName: e.target.value })} />
              </Field>
              <Field id="self-middle" label="Middle name">
                <Input id="self-middle" value={draft.middleName} onChange={(e) => patch({ middleName: e.target.value })} />
              </Field>
            </div>
            <p className="text-[11px] text-black/50">
              Shown as “{composeFullName(draft) || "—"}” on your account and the INS forms.
            </p>
            <div className="max-w-xs">
              <Field id="self-empid" label="Employee ID *">
                <Input
                  id="self-empid"
                  value={draft.employeeId}
                  onChange={(e) => patch({ employeeId: e.target.value })}
                  autoComplete="off"
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide text-[#780301]">Assignment</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field id="self-category" label="Instructor category">
                <select
                  id="self-category"
                  className={fieldClass}
                  value={draft.facultyCategory}
                  onChange={(e) => patch({ facultyCategory: parseFacultyCategory(e.target.value) })}
                >
                  {FACULTY_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="self-college" label="Home college">
                <select
                  id="self-college"
                  className={fieldClass}
                  value={draft.collegeId}
                  onChange={(e) => patch({ collegeId: e.target.value, programId: "" })}
                >
                  <option value="">Select college…</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              {(
                <Field
                  id="self-program"
                  label={draft.facultyCategory === FACULTY_CATEGORY_GEC ? "Home department (optional)" : "Home department"}
                >
                  <select
                    id="self-program"
                    className={fieldClass}
                    value={draft.programId}
                    disabled={!draft.collegeId}
                    onChange={(e) => patch({ programId: e.target.value })}
                  >
                    <option value="">
                      {!draft.collegeId
                        ? "Select college first…"
                        : draft.facultyCategory === FACULTY_CATEGORY_GEC
                          ? "None — GEC only"
                          : "Select department…"}
                    </option>
                    {programsForCollege.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <p className="text-[11px] text-black/50">
              Your department puts you on that Program Chairman's list; GEC and “both” instructors are also on the GEC Chairman's list.
            </p>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide text-[#780301]">Personal details</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field id="self-dob" label="Date of birth">
                <Input
                  id="self-dob"
                  type="date"
                  max={latestDateOfBirth()}
                  value={draft.dateOfBirth}
                  onChange={(e) => patch({ dateOfBirth: e.target.value })}
                />
              </Field>
              <Field id="self-age" label="Age">
                <Input
                  id="self-age"
                  readOnly
                  tabIndex={-1}
                  value={age != null ? String(age) : ""}
                  placeholder="—"
                  className="bg-black/[0.04] text-black/70"
                />
              </Field>
              <Field id="self-sex" label="Sex">
                <select id="self-sex" className={fieldClass} value={draft.sex} onChange={(e) => patch({ sex: e.target.value })}>
                  <option value="">—</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide text-[#780301]">Appointment</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="self-status" label="Status">
                <select id="self-status" className={fieldClass} value={draft.status} onChange={(e) => patch({ status: e.target.value })}>
                  <option value="">—</option>
                  <option value={FACULTY_EMPLOYMENT_RESIDENT}>{FACULTY_EMPLOYMENT_RESIDENT}</option>
                  <option value={FACULTY_EMPLOYMENT_NON_RESIDENT}>{FACULTY_EMPLOYMENT_NON_RESIDENT}</option>
                  {draft.status &&
                  draft.status !== FACULTY_EMPLOYMENT_RESIDENT &&
                  draft.status !== FACULTY_EMPLOYMENT_NON_RESIDENT ? (
                    <option value={draft.status}>{draft.status}</option>
                  ) : null}
                </select>
              </Field>
              <Field id="self-designation" label="Designation">
                <select
                  id="self-designation"
                  className={fieldClass}
                  value={draft.designation}
                  onChange={(e) => patch({ designation: e.target.value })}
                >
                  <option value="">Regular faculty (no designation)</option>
                  {DESIGNATION_POLICIES.filter((p) => p.key !== "Regular Faculty").map((p) => (
                    <option key={p.key} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                  {draft.designation && !DESIGNATION_POLICIES.some((p) => p.label === draft.designation) ? (
                    <option value={draft.designation}>{draft.designation}</option>
                  ) : null}
                </select>
              </Field>
              <Field id="self-rank" label="Academic rank">
                <Input
                  id="self-rank"
                  list="self-rank-suggestions"
                  placeholder="Instructor I"
                  value={draft.academicRank}
                  onChange={(e) => patch({ academicRank: e.target.value })}
                />
                <datalist id="self-rank-suggestions">
                  {ACADEMIC_RANK_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>
              <Field id="self-qualification" label="Educational qualification">
                <Input
                  id="self-qualification"
                  placeholder="MS Information Technology"
                  value={draft.educationalQualification}
                  onChange={(e) => patch({ educationalQualification: e.target.value })}
                />
              </Field>
              <Field id="self-experience" label="Experience">
                <Input id="self-experience" value={draft.experience} onChange={(e) => patch({ experience: e.target.value })} />
              </Field>
              <Field id="self-eligibility" label="Eligibility">
                <Input id="self-eligibility" value={draft.eligibility} onChange={(e) => patch({ eligibility: e.target.value })} />
              </Field>
            </div>
          </fieldset>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-[#780301] text-white hover:bg-[#5c0201]"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Row label="Last name" value={view.lastName} />
            <Row label="First name" value={view.firstName} />
            <Row label="Middle name" value={view.middleName} />
            <Row label="Employee ID" value={view.employeeId} />
            <Row label="Instructor category" value={facultyCategoryLabel(shownCategory)} />
            <Row label="Home college" value={collegeLabel} />
            <Row label="Home department" value={programLabel || (facultyCategoryBadge(shownCategory) ? "None (GEC only)" : "")} />
          </dl>
          <div className="border-t border-black/10 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-black/50">Personal details</h3>
            <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Row label="Date of birth" value={formatDateOfBirth(profile?.dateOfBirth)} />
              <Row label="Age" value={age != null ? String(age) : ""} />
              <Row label="Sex" value={sexLabel(profile?.sex)} />
            </dl>
          </div>
          <div className="border-t border-black/10 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-black/50">Appointment</h3>
            <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Row label="Status" value={profile?.status} />
              <Row label="Designation" value={profile?.designation} />
              <Row label="Academic rank" value={profile?.academicRank} />
              <Row label="Educational qualification" value={profile?.educationalQualification} />
              <Row label="Experience" value={profile?.experience} />
              <Row label="Eligibility" value={profile?.eligibility} />
            </dl>
          </div>
        </div>
      )}

      {msg ? (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${
            msg.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {msg.text}
        </p>
      ) : null}
    </section>
  );
}
