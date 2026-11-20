"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionToast } from "@/components/alerts/useActionToast";
import { DeleteCampusAccountDialog } from "@/components/admin/DeleteCampusAccountDialog";
import { campusAccountsApi, serviceAreasApi, type CampusAccount, type ServiceArea } from "@/lib/api/client";

type College = { id: string; code: string; name: string };
type Program = { id: string; code: string; name: string; collegeId: string | null };
type ChairType = "service" | "program";


/** Best guess at the CAS college: code "CAS" or "… Arts and Sciences". DOI can change it. */
function guessCasCollegeId(colleges: College[], areas: ServiceArea[]): string {
  const byCode = colleges.find((c) => c.code.trim().toUpperCase() === "CAS");
  if (byCode) return byCode.id;
  const byName = colleges.find((c) => /arts\s*(and|&)\s*sciences/i.test(c.name));
  if (byName) return byName.id;
  return areas.find((a) => a.collegeId)?.collegeId ?? "";
}

/**
 * DOI → Colleges & Chairpersons → CAS Chairs.
 *
 * CAS has two kinds of chair, both under CAS:
 *   • Service Chair — heads a general-subject area (Humanities and Social Sciences, Natural Sciences
 *     and Mathematics, PE and Sports, General Education, …) and plots those subjects into vacant
 *     slots of any college, like the former GEC Chairperson.
 *   • Program Chair — heads one CAS program (BAL, BAEL, Psychology, …). The programs listed are the
 *     current ones from Programs & Sections, never a fixed list.
 */
export function CasChairsPanel({
  colleges,
  programs,
  accounts,
  onChanged,
  fixedCollegeId,
}: {
  colleges: College[];
  programs: Program[];
  accounts: CampusAccount[];
  onChanged: () => Promise<void> | void;
  /** CAS College Admin: their own college is CAS; no picker. */
  fixedCollegeId?: string | null;
}) {
  const toast = useActionToast();
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [areasWarning, setAreasWarning] = useState<string | null>(null);
  const [casCollegeId, setCasCollegeId] = useState(fixedCollegeId ?? "");

  const loadAreas = useCallback(async () => {
    try {
      const r = await serviceAreasApi.list();
      setAreas(r.areas ?? []);
      setAreasWarning(r.warning ?? null);
    } catch (e) {
      toast.fail(e, "Could not load the service areas", "cas chairs: areas");
    }
  }, [toast]);
  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);
  useEffect(() => {
    if (!casCollegeId) setCasCollegeId(guessCasCollegeId(colleges, areas));
  }, [colleges, areas, casCollegeId]);

  const casPrograms = useMemo(
    () => programs.filter((p) => p.collegeId === casCollegeId).sort((a, b) => a.code.localeCompare(b.code)),
    [programs, casCollegeId],
  );
  const casProgramIds = useMemo(() => new Set(casPrograms.map((p) => p.id)), [casPrograms]);
  const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);

  /** Every CAS chair: Service Chairs (any area) and Program Chairs of CAS programs. */
  const chairs = useMemo(
    () =>
      accounts
        .filter(
          (a) =>
            a.role === "gec_chairman" ||
            (a.role === "chairman_admin" && a.chairmanProgramId && casProgramIds.has(a.chairmanProgramId)),
        )
        .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "gec_chairman" ? -1 : 1)),
    [accounts, casProgramIds],
  );
  const takenAreaIds = new Set(chairs.filter((c) => c.role === "gec_chairman").map((c) => c.serviceAreaId ?? ""));
  const takenProgramIds = new Set(
    chairs.filter((c) => c.role === "chairman_admin").map((c) => c.chairmanProgramId ?? ""),
  );

  // ── service areas ───────────────────────────────────────────────────
  const [newAreaName, setNewAreaName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  async function addArea(name: string): Promise<ServiceArea | null> {
    const n = name.trim();
    if (!n) {
      toast.refuse("Enter the area name", "For example: Humanities and Social Sciences.");
      return null;
    }
    try {
      const { area } = await serviceAreasApi.create({ name: n, collegeId: casCollegeId || null });
      toast.ok("Service area added successfully", area.name);
      await loadAreas();
      return area;
    } catch (e) {
      toast.fail(e, "Could not add the service area", "cas chairs: add area");
      return null;
    }
  }
  async function saveRename() {
    if (!renaming) return;
    try {
      await serviceAreasApi.update(renaming.id, { name: renaming.name });
      toast.ok("Service area renamed successfully", renaming.name);
      setRenaming(null);
      await loadAreas();
    } catch (e) {
      toast.fail(e, "Could not rename the service area", "cas chairs: rename area");
    }
  }
  async function removeArea(area: ServiceArea) {
    try {
      await serviceAreasApi.remove(area.id);
      toast.ok("Service area removed successfully", area.name);
      await loadAreas();
    } catch (e) {
      toast.fail(e, "Could not remove the service area", "cas chairs: remove area");
    }
  }

  // ── add / edit chair ────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chairType, setChairType] = useState<ChairType>("service");
  const [areaId, setAreaId] = useState("");
  const [programId, setProgramId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  /** Edit: email them a new temporary password. (New chairs always get one.) */
  const [sendNewPassword, setSendNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setChairType("service");
    setAreaId("");
    setProgramId("");
    setFullName("");
    setEmail("");
    setSendNewPassword(false);
  }

  function startEdit(a: CampusAccount) {
    setEditingId(a.id);
    setChairType(a.role === "gec_chairman" ? "service" : "program");
    setAreaId(a.serviceAreaId ?? "");
    setProgramId(a.chairmanProgramId ?? "");
    setFullName(a.name ?? "");
    setEmail(a.email ?? "");
    setSendNewPassword(false);
    document.getElementById("cas-chair-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save() {
    if (chairType === "service" && !areaId) {
      toast.refuse("Choose the service area", "Or add a new one above.");
      return;
    }
    if (chairType === "program" && !programId) {
      toast.refuse("Choose the CAS program", "Programs come from Programs & Sections.");
      return;
    }
    if (!fullName.trim()) {
      toast.refuse("Enter the full name", "This is the name that appears on INS forms.");
      return;
    }
    const payload =
      chairType === "service"
        ? { role: "gec_chairman" as const, collegeId: null, programId: null, serviceAreaId: areaId }
        : {
            role: "chairman_admin" as const,
            collegeId: programById.get(programId)?.collegeId ?? casCollegeId ?? null,
            programId,
            serviceAreaId: null,
          };
    const label = chairType === "service" ? "Service Chair" : "Program Chair";
    setSaving(true);
    try {
      if (editingId) {
        const { warning, emailed } = await campusAccountsApi.update(editingId, {
          ...payload,
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          ...(sendNewPassword ? { resetPassword: true } : {}),
        });
        toast.ok(
          `${label} updated successfully`,
          emailed ? `A new temporary password was emailed to ${email.trim()}.` : fullName.trim(),
        );
        toast.caution(warning, "Saved with a limitation");
      } else {
        // The server generates the temporary password and emails it to them.
        const { warning, emailed } = await campusAccountsApi.create({
          ...payload,
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
        });
        toast.ok(
          `${label} added successfully`,
          emailed ? `A temporary password was emailed to ${email.trim()}. They choose their own at first sign-in.` : null,
        );
        toast.caution(warning, "Created, but the email was not sent");
      }
      resetForm();
      await onChanged();
    } catch (e) {
      toast.fail(e, `Could not save the ${label}`, "cas chairs: save");
    } finally {
      setSaving(false);
    }
  }

  /** After the delete dialog has removed the account (it reports its own errors). */
  async function afterRemoved(a: CampusAccount) {
    toast.ok("Chair account deleted successfully", a.name);
    setConfirmRemoveId(null);
    if (editingId === a.id) resetForm();
    await onChanged();
  }

  const scopeLabel = (a: CampusAccount) =>
    a.role === "gec_chairman"
      ? areaById.get(a.serviceAreaId ?? "")?.name ?? "Area not set"
      : (() => {
          const p = programById.get(a.chairmanProgramId ?? "");
          return p ? `${p.code} — ${p.name}` : "—";
        })();

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-black/65 leading-relaxed">
        CAS chairs only. A <b>Service Chair</b> heads a general-subject area and plots those subjects into
        vacant slots of every college (like the former GEC Chairperson). A <b>Program Chair</b> heads one CAS
        program. Both stay under CAS.
      </p>
      {areasWarning ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">{areasWarning}</p>
      ) : null}

      {fixedCollegeId ? null : (
      <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-black/75">
        CAS college
        <select
          className="h-9 min-w-[260px] rounded-md border border-gray-300 bg-white px-2 text-sm font-normal"
          value={casCollegeId}
          onChange={(e) => setCasCollegeId(e.target.value)}
        >
          <option value="">Select the CAS college…</option>
          {colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </label>
      )}

      {/* ── Service areas ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-3">
        <div className="text-[16px] font-semibold">Service areas</div>
        <div className="flex flex-wrap gap-2">
          {areas.length === 0 ? <span className="text-[13px] text-black/50">No service areas yet.</span> : null}
          {areas.map((a) =>
            renaming?.id === a.id ? (
              <span key={a.id} className="inline-flex items-center gap-1">
                <Input
                  className="h-8 w-64"
                  value={renaming.name}
                  onChange={(e) => setRenaming({ id: a.id, name: e.target.value })}
                />
                <Button type="button" size="sm" className="h-8" onClick={() => void saveRename()}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setRenaming(null)}>
                  Cancel
                </Button>
              </span>
            ) : (
              <span
                key={a.id}
                className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-black/[0.02] px-3 py-1 text-[13px]"
              >
                {a.name}
                <span className="text-[11px] text-black/45">{a.code}</span>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[#780301] hover:underline"
                  onClick={() => setRenaming({ id: a.id, name: a.name })}
                >
                  Rename
                </button>
                {!takenAreaIds.has(a.id) ? (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-red-700 hover:underline"
                    onClick={() => void removeArea(a)}
                  >
                    Remove
                  </button>
                ) : null}
              </span>
            ),
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-9 max-w-sm"
            placeholder="New area, e.g. Humanities and Social Sciences"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={async () => {
              if (await addArea(newAreaName)) setNewAreaName("");
            }}
          >
            Add area
          </Button>
        </div>
        <p className="text-[11px] text-black/50">
          Areas also appear on instructor registration (General Subject Instructor) and in Subject Codes →
          Subject area.
        </p>
      </div>

      {/* ── Add / edit chair ──────────────────────────────────────────── */}
      <div id="cas-chair-form" className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-4 scroll-mt-4">
        <div className="text-[16px] font-semibold">{editingId ? "Edit CAS chair" : "Add CAS chair"}</div>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["service", "Service Chair"],
              ["program", "Program Chair"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name="cas-chair-type"
                className="accent-[#780301]"
                checked={chairType === value}
                disabled={Boolean(editingId)}
                onChange={() => setChairType(value)}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {chairType === "service" ? (
            <label className="space-y-1">
              <span className="text-[12px] font-semibold text-black/75">Service area</span>
              <select
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                disabled={saving}
              >
                <option value="">Select area…</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id} disabled={takenAreaIds.has(a.id) && a.id !== areaId}>
                    {a.name}
                    {takenAreaIds.has(a.id) && a.id !== areaId ? " (has a chair)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="space-y-1">
              <span className="text-[12px] font-semibold text-black/75">CAS program</span>
              <select
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                disabled={saving}
              >
                <option value="">{casPrograms.length ? "Select program…" : "No CAS programs yet"}</option>
                {casPrograms.map((p) => (
                  <option key={p.id} value={p.id} disabled={takenProgramIds.has(p.id) && p.id !== programId}>
                    {p.code} — {p.name}
                    {takenProgramIds.has(p.id) && p.id !== programId ? " (has a chair)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-black/75">Full name</span>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={saving} />
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-black/75">Email (username)</span>
            <Input
              type="email"
              value={email}
              placeholder="name@ctu.edu.ph"
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
            />
          </label>
          <div className="space-y-1 self-end">
            {editingId ? (
              <label className="flex items-start gap-2 text-[12px] text-black/75">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[#780301]"
                  checked={sendNewPassword}
                  onChange={(e) => setSendNewPassword(e.target.checked)}
                  disabled={saving}
                />
                <span>
                  <span className="font-semibold">Send a new temporary password</span>
                  <span className="block text-black/50">Emailed to them; they choose their own at sign-in.</span>
                </span>
              </label>
            ) : (
              <p className="text-[11px] text-black/55">
                A temporary password is generated and emailed to this address. They choose their own at first sign-in.
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Add chair"}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── CAS chairs list ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-[#780301] text-white">
              <tr>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Scope</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {chairs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-black/50">
                    No CAS chairs yet.
                  </td>
                </tr>
              ) : (
                chairs.map((a) => (
                  <tr key={a.id} className="border-t border-black/10">
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          a.role === "gec_chairman" ? "bg-sky-100 text-sky-900" : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {a.role === "gec_chairman" ? "Service Chair" : "Program Chair"}
                      </span>
                    </td>
                    <td className="px-3 py-2">{scopeLabel(a)}</td>
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-3 py-2 text-black/70">{a.email}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => startEdit(a)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-red-800 border-red-200 hover:bg-red-50"
                          onClick={() => setConfirmRemoveId(a.id)}
                        >
                          Delete
                        </Button>
                        {confirmRemoveId === a.id ? (
                          <DeleteCampusAccountDialog
                            account={a}
                            roleLabel={a.role === "gec_chairman" ? "Service Chair" : "Program Chairperson"}
                            onClose={() => setConfirmRemoveId(null)}
                            onDeleted={() => void afterRemoved(a)}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
