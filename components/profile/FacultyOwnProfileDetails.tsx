"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import {
  DATE_OF_BIRTH_ERROR,
  computeAge,
  formatDateOfBirth,
  isValidDateOfBirth,
  latestDateOfBirth,
  toDateInputValue,
} from "@/lib/faculty/hr-form-23b";

type SelfProfile = {
  sex: string | null;
  dateOfBirth: string | null;
  academicRank: string | null;
  designation: string | null;
  status: string | null;
  educationalQualification: string | null;
  experience: string | null;
  eligibility: string | null;
};

const fieldClass =
  "h-10 w-full rounded-md border border-black/25 bg-white px-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

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

/**
 * The instructor's own Faculty Profile: personal details they can edit (date of birth, sex) and the
 * appointment details their chairman keeps, shown read-only.
 */
export function FacultyOwnProfileDetails() {
  const [profile, setProfile] = useState<SelfProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<{ profile: SelfProfile | null }>("/api/portal/my-faculty-profile")
      .then((r) => {
        if (alive) setProfile(r.profile);
      })
      .catch((e: any) => {
        if (alive) setLoadError(e?.message ?? "Could not load your profile.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function startEdit() {
    setDob(toDateInputValue(profile?.dateOfBirth));
    setSex((profile?.sex ?? "").trim().toUpperCase());
    setMsg(null);
    setEditing(true);
  }

  async function save() {
    if (!isValidDateOfBirth(dob)) {
      setMsg({ kind: "error", text: DATE_OF_BIRTH_ERROR });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await apiFetch<{ profile: SelfProfile }>("/api/portal/my-faculty-profile", {
        method: "PUT",
        body: { dateOfBirth: dob || null, sex: sex || null },
      });
      setProfile(r.profile);
      setEditing(false);
      setMsg({ kind: "ok", text: "Personal details saved." });
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message ?? "Could not save. Please try again." });
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
  if (!profile) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-5 text-sm text-black/60 shadow-sm">
        No Faculty Profile is linked to your account yet. Your Program Chairman adds it in Faculty Profile.
      </div>
    );
  }

  const age = computeAge(editing ? dob : profile.dateOfBirth);

  return (
    <>
      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-black">Personal details</h2>
            <p className="mt-0.5 text-xs text-black/55">You can update these yourself.</p>
          </div>
          {!editing ? (
            <Button type="button" variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="self-dob" className="text-xs font-medium text-black/70">
                Date of birth
              </label>
              <Input
                id="self-dob"
                type="date"
                max={latestDateOfBirth()}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="self-age" className="text-xs font-medium text-black/70">
                Age
              </label>
              <Input
                id="self-age"
                readOnly
                tabIndex={-1}
                value={age != null ? String(age) : ""}
                placeholder="—"
                className="bg-black/[0.04] text-black/70"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="self-sex" className="text-xs font-medium text-black/70">
                Sex
              </label>
              <select id="self-sex" className={fieldClass} value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button
                type="button"
                onClick={save}
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
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Row label="Date of birth" value={formatDateOfBirth(profile.dateOfBirth)} />
            <Row label="Age" value={age != null ? String(age) : ""} />
            <Row label="Sex" value={sexLabel(profile.sex)} />
          </dl>
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

      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-black">Appointment</h2>
        <p className="mt-0.5 text-xs text-black/55">Kept by your Program Chairman. Ask them to correct anything here.</p>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Row label="Status" value={profile.status} />
          <Row label="Designation" value={profile.designation} />
          <Row label="Academic rank" value={profile.academicRank} />
          <Row label="Educational qualification" value={profile.educationalQualification} />
          <Row label="Experience" value={profile.experience} />
          <Row label="Eligibility" value={profile.eligibility} />
        </dl>
      </section>
    </>
  );
}
