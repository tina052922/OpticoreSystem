"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionToast } from "@/components/alerts/useActionToast";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { PasswordInput } from "@/components/ui/password-input";
import {
  apiFetch,
  campusAccountsApi,
  chairAssignmentsApi,
  type ChairAssignmentChair,
  type ChairAssignmentProgram,
} from "@/lib/api/client";

type Mode = "whole" | "per";
type Group = { key: string; label: string; programs: ChairAssignmentProgram[] };

/** Programs sharing a group code are one group (BIT → its majors); others are their own group. */
function groupPrograms(programs: ChairAssignmentProgram[]): Group[] {
  const map = new Map<string, Group>();
  for (const p of programs) {
    const code = (p.groupCode ?? "").trim().toUpperCase();
    const key = code ? `g:${code}` : `p:${p.id}`;
    const label = code || p.code || p.name || p.id;
    const g = map.get(key) ?? { key, label, programs: [] };
    g.programs.push(p);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

const programLabel = (p: ChairAssignmentProgram) => [p.code, p.name].filter(Boolean).join(" — ") || p.id;

/**
 * Chairman Assignment.
 *
 * A program group (e.g. BIT with its majors) is managed either by ONE chair for every major, or by a
 * separate chair per major. When a chair leaves, Transfer hands the program(s) to someone else: the
 * old chair loses Subject Scheduler / Faculty Profile / Subject Codes for that scope and the new one
 * gains it. Schedules are never touched — only who may manage them.
 */
export function ChairAssignmentWorkspace({
  campusWide = false,
  embedded = false,
  canManageAccounts = false,
  onAccountsChanged,
}: {
  campusWide?: boolean;
  /** Inside another page (DOI → Colleges & Chairmen → Chairmen): no page padding of its own. */
  embedded?: boolean;
  /**
   * DOI: create chairman accounts (name, email, password) right here and assign them, and edit or
   * delete an assigned chairman's account. The server allows account writes to DOI only.
   */
  canManageAccounts?: boolean;
  onAccountsChanged?: () => void;
}) {
  const toast = useActionToast();
  const [colleges, setColleges] = useState<{ id: string; code: string; name: string }[]>([]);
  const [collegeId, setCollegeId] = useState("");
  const [programs, setPrograms] = useState<ChairAssignmentProgram[]>([]);
  const [assignments, setAssignments] = useState<{ programId: string; chairUserId: string }[]>([]);
  const [chairs, setChairs] = useState<ChairAssignmentChair[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [groupsSupported, setGroupsSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [groupKey, setGroupKey] = useState("");
  const [mode, setMode] = useState<Mode>("whole");
  const [wholeChair, setWholeChair] = useState("");
  const [rowChoice, setRowChoice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!campusWide) return;
    void apiFetch<{ colleges: { id: string; code: string; name: string }[] }>("/api/catalog/colleges", { method: "GET" })
      .then((r) => setColleges(r.colleges ?? []))
      .catch(() => undefined);
  }, [campusWide]);

  const load = useCallback(async () => {
    if (campusWide && !collegeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await chairAssignmentsApi.list(campusWide ? collegeId : null);
      setPrograms(r.programs ?? []);
      setAssignments(r.assignments ?? []);
      setChairs(r.chairs ?? []);
      setWarning(r.warning ?? null);
      setGroupsSupported(r.groupsSupported !== false);
      setRowChoice({});
    } catch (e) {
      toast.fail(e, "Could not load chairman assignments", "chair assignment: load");
    } finally {
      setLoading(false);
    }
  }, [campusWide, collegeId, toast]);
  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupPrograms(programs), [programs]);
  const group = groups.find((g) => g.key === groupKey) ?? groups[0] ?? null;
  const chairOf = useMemo(() => new Map(assignments.map((a) => [a.programId, a.chairUserId])), [assignments]);
  const chairById = useMemo(() => new Map(chairs.map((c) => [c.id, c])), [chairs]);

  // Open the group on its current mode: one chair on every major = whole group.
  useEffect(() => {
    if (!group) return;
    const holders = new Set(group.programs.map((p) => chairOf.get(p.id) ?? ""));
    const single = holders.size === 1 ? [...holders][0] : "";
    setMode(group.programs.length > 1 && !single ? "per" : "whole");
    setWholeChair(single ?? "");
  }, [group, chairOf]);

  const chairName = (id: string | undefined) => {
    const c = id ? chairById.get(id) : undefined;
    return c ? c.name || c.email : "";
  };

  async function assignWhole() {
    if (!group || !wholeChair) {
      toast.refuse("Choose the chairman", "Pick who manages every program in this group.");
      return;
    }
    setBusy("whole");
    try {
      if (group.programs.length === 1) {
        await chairAssignmentsApi.setProgramChair(group.programs[0]!.id, wholeChair);
      } else {
        await chairAssignmentsApi.setGroupChair({
          collegeId: campusWide ? collegeId : null,
          groupCode: (group.programs[0]?.groupCode ?? "").trim() || group.programs[0]!.id,
          chairUserId: wholeChair,
        });
      }
      toast.ok("Chairman assigned successfully", `${chairName(wholeChair)} now manages all of ${group.label}.`);
      await load();
    } catch (e) {
      toast.fail(e, "Could not assign the chairman", "chair assignment: whole");
    } finally {
      setBusy(null);
    }
  }

  async function assignRow(programId: string, chairUserId: string) {
    setBusy(programId);
    try {
      const prev = chairOf.get(programId);
      await chairAssignmentsApi.setProgramChair(programId, chairUserId);
      const p = programs.find((x) => x.id === programId);
      if (!chairUserId) toast.ok("Chairman removed successfully", `${p?.code ?? ""} has no chairman now.`);
      else if (prev && prev !== chairUserId)
        toast.ok("Chairman transferred successfully", `${p?.code ?? ""}: ${chairName(prev)} → ${chairName(chairUserId)}. Schedules are unchanged.`);
      else toast.ok("Chairman assigned successfully", `${chairName(chairUserId)} manages ${p?.code ?? ""}.`);
      await load();
    } catch (e) {
      toast.fail(e, "Could not save the assignment", "chair assignment: row");
    } finally {
      setBusy(null);
    }
  }

  // ── program groups editor ───────────────────────────────────────────
  const [groupDraft, setGroupDraft] = useState<Record<string, string>>({});
  async function saveGroup(p: ChairAssignmentProgram) {
    const value = (groupDraft[p.id] ?? p.groupCode ?? "").trim();
    setBusy(`grp:${p.id}`);
    try {
      await chairAssignmentsApi.setProgramGroup(p.id, value);
      toast.ok("Program group saved successfully", value ? `${p.code} is in ${value.toUpperCase()}.` : `${p.code} is its own group.`);
      setGroupDraft((d) => {
        const n = { ...d };
        delete n[p.id];
        return n;
      });
      await load();
    } catch (e) {
      toast.fail(e, "Could not save the program group", "chair assignment: group");
    } finally {
      setBusy(null);
    }
  }

  /** Typed, not scrolled: matches show only once something is entered (name or email). */
  // ── Chairman accounts (DOI) ───────────────────────────────────────────
  const MIN_PASSWORD = 8;
  const [newOpen, setNewOpen] = useState(false);
  const [newTarget, setNewTarget] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function resetNew() {
    setNewOpen(false);
    setNewTarget("");
    setNewName("");
    setNewEmail("");
    setNewPassword("");
  }

  async function createChair() {
    if (!group) return;
    const wholeGroup = newTarget === "__group__";
    const program = wholeGroup ? group.programs[0] : group.programs.find((p) => p.id === newTarget);
    if (!program) {
      toast.refuse("Choose the program", "Pick the major (or the whole group) this chairman manages.");
      return;
    }
    if (!newName.trim()) {
      toast.refuse("Enter the full name", "This is the name that appears on INS forms.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      toast.refuse("Enter a valid email", "The chairman signs in with it.");
      return;
    }
    if (newPassword.trim().length < MIN_PASSWORD) {
      toast.refuse("Set a longer password", `At least ${MIN_PASSWORD} characters; they change it at first sign-in.`);
      return;
    }
    setBusy("new");
    try {
      const { account } = await campusAccountsApi.create({
        role: "chairman_admin",
        collegeId: program.collegeId,
        programId: program.id,
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword.trim(),
      });
      if (wholeGroup && group.programs.length > 1) {
        await chairAssignmentsApi.setGroupChair({
          collegeId: campusWide ? collegeId : null,
          groupCode: (group.programs[0]?.groupCode ?? "").trim() || group.programs[0]!.id,
          chairUserId: account.id,
        });
      }
      toast.ok(
        "Chairman added successfully",
        `${newName.trim()} manages ${wholeGroup ? `all of ${group.label}` : program.code ?? group.label}. They change the password at first sign-in.`,
      );
      resetNew();
      await load();
      onAccountsChanged?.();
    } catch (e) {
      toast.fail(e, "Could not add the chairman", "chair assignment: create account");
    } finally {
      setBusy(null);
    }
  }

  function startEditAccount(chairId: string) {
    const c = chairById.get(chairId);
    if (!c) return;
    setEditId(chairId);
    setEditName(c.name ?? "");
    setEditEmail(c.email ?? "");
    setEditPassword("");
    setConfirmDelete(false);
  }

  async function saveAccount() {
    if (!editId) return;
    if (editPassword && editPassword.trim().length < MIN_PASSWORD) {
      toast.refuse("Set a longer password", `At least ${MIN_PASSWORD} characters, or leave it empty to keep the current one.`);
      return;
    }
    setBusy(`acct:${editId}`);
    try {
      const { warning } = await campusAccountsApi.update(editId, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        password: editPassword.trim() || undefined,
      });
      toast.ok("Chairman account updated successfully", editName.trim());
      toast.caution(warning, "Saved with a limitation");
      setEditId(null);
      await load();
      onAccountsChanged?.();
    } catch (e) {
      toast.fail(e, "Could not update the chairman account", "chair assignment: update account");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    if (!editId) return;
    setBusy(`acct:${editId}`);
    try {
      await campusAccountsApi.remove(editId);
      toast.ok("Chairman account deleted successfully", "Their programs now have no chairman. Schedules are unchanged.");
      setEditId(null);
      await load();
      onAccountsChanged?.();
    } catch (e) {
      toast.fail(e, "Could not delete the chairman account", "chair assignment: delete account");
    } finally {
      setBusy(null);
    }
  }

  const chairOptions = useMemo<SearchSelectOption[]>(
    () => chairs.map((c) => ({ value: c.id, label: c.name || c.email, hint: c.name ? c.email : undefined })),
    [chairs],
  );

  return (
    <div className={embedded ? "space-y-5" : "px-4 sm:px-6 lg:px-8 pb-10 max-w-[1100px] space-y-5"}>
      <p className="text-[13px] text-black/65 leading-relaxed">
        Choose who manages each program. A whole program group (e.g. all BIT majors) can have one chairman, or
        each major its own. Transfer moves a program to another chairman when someone leaves — their Subject
        Scheduler, Faculty Profile and Subject Codes access moves with it. <b>Schedules are never changed.</b>
      </p>
      {warning ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">{warning}</p>
      ) : null}

      {campusWide ? (
        <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-black/75">
          College
          <select
            className="h-9 min-w-[260px] rounded-md border border-gray-300 bg-white px-2 text-sm font-normal"
            value={collegeId}
            onChange={(e) => {
              setCollegeId(e.target.value);
              setGroupKey("");
            }}
          >
            <option value="">Select college…</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {loading ? (
        <p className="text-sm text-black/55">Loading…</p>
      ) : campusWide && !collegeId ? (
        <p className="text-sm text-black/55">Select a college.</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-black/55">No programs in this college yet (add them in Programs &amp; Sections).</p>
      ) : (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="space-y-1">
              <span className="block text-[12px] font-semibold text-black/75">Program group</span>
              <select
                className="h-10 min-w-[240px] rounded-md border border-gray-300 bg-white px-3 text-sm"
                value={group?.key ?? ""}
                onChange={(e) => setGroupKey(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                    {g.programs.length > 1 ? ` (${g.programs.length} majors)` : ""}
                  </option>
                ))}
              </select>
            </label>
            {group && group.programs.length > 1 ? (
              <div className="space-y-1">
                <span className="block text-[12px] font-semibold text-black/75">Assignment mode</span>
                <div className="flex gap-4 text-sm h-10 items-center">
                  <label className="flex items-center gap-2">
                    <input type="radio" className="accent-[#780301]" checked={mode === "whole"} onChange={() => setMode("whole")} />
                    Whole program group
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" className="accent-[#780301]" checked={mode === "per"} onChange={() => setMode("per")} />
                    Per major
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          {group && mode === "whole" ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="block text-[12px] font-semibold text-black/75">Chairman</span>
                <SearchSelect
                  className="min-w-[320px]"
                  options={chairOptions}
                  value={wholeChair}
                  onChange={setWholeChair}
                  placeholder="Type the chairman's name or email…"
                  ariaLabel="Chairman"
                />
              </label>
              <span className="rounded-full bg-[#780301]/10 px-3 py-1 text-[12px] font-semibold text-[#780301]">
                Scope: {group.programs.length > 1 ? `All ${group.label} majors` : group.label}
              </span>
              <Button
                type="button"
                className="bg-[#780301] hover:bg-[#5a0201] text-white"
                disabled={busy === "whole" || !wholeChair}
                onClick={() => void assignWhole()}
              >
                {busy === "whole" ? "Saving…" : "Assign"}
              </Button>
            </div>
          ) : null}

          {group && canManageAccounts ? (
            <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 space-y-3">
              {!newOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-[13px]"
                  onClick={() => {
                    setNewOpen(true);
                    setNewTarget(mode === "whole" && group.programs.length > 1 ? "__group__" : group.programs[0]?.id ?? "");
                  }}
                >
                  ＋ New chairman
                </Button>
              ) : (
                <>
                  <div className="text-[13px] font-semibold">New chairman account</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="space-y-1">
                      <span className="block text-[12px] font-semibold text-black/75">Manages</span>
                      <select
                        className="h-10 w-full rounded-md border border-gray-300 bg-white px-2 text-sm"
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                      >
                        {group.programs.length > 1 ? <option value="__group__">All {group.label} majors</option> : null}
                        {group.programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {programLabel(p)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[12px] font-semibold text-black/75">Full name</span>
                      <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[12px] font-semibold text-black/75">Email (username)</span>
                      <Input type="email" placeholder="name@ctu.edu.ph" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[12px] font-semibold text-black/75">Temporary password</span>
                      <PasswordInput
                        placeholder={`At least ${MIN_PASSWORD} characters`}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="bg-[#780301] hover:bg-[#5a0201] text-white"
                      disabled={busy === "new"}
                      onClick={() => void createChair()}
                    >
                      {busy === "new" ? "Creating…" : "Create & assign"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetNew} disabled={busy === "new"}>
                      Cancel
                    </Button>
                  </div>
                  <p className="text-[11px] text-black/50">
                    Creates the sign-in and assigns the chairman. They are asked to change the password the first time
                    they sign in.
                  </p>
                </>
              )}
            </div>
          ) : null}

          {group ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-black/[0.04] text-left">
                    <th className="px-3 py-2">Major / Program</th>
                    <th className="px-3 py-2">Chairman</th>
                    <th className="px-3 py-2">Status</th>
                    {mode === "per" || group.programs.length === 1 ? <th className="px-3 py-2 text-right">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {group.programs.map((p) => {
                    const current = chairOf.get(p.id) ?? "";
                    const choice = rowChoice[p.id] ?? current;
                    const changed = choice !== current;
                    const editable = mode === "per" || group.programs.length === 1;
                    return (
                      <Fragment key={p.id}>
                      <tr className="border-t border-black/10">
                        <td className="px-3 py-2 font-medium">{programLabel(p)}</td>
                        <td className="px-3 py-2">
                          {editable ? (
                            <SearchSelect
                              className="min-w-[260px]"
                              options={chairOptions}
                              value={choice}
                              onChange={(v) => setRowChoice((m) => ({ ...m, [p.id]: v }))}
                              placeholder="Type a name or email…"
                              ariaLabel={`Chairman for ${p.code ?? p.id}`}
                            />
                          ) : (
                            chairName(current) || <span className="text-black/40">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {current ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">Assigned</span>
                              {canManageAccounts ? (
                                <button
                                  type="button"
                                  className="text-[11px] font-semibold text-[#780301] hover:underline"
                                  onClick={() => (editId === current ? setEditId(null) : startEditAccount(current))}
                                >
                                  {editId === current ? "Close" : "Edit account"}
                                </button>
                              ) : null}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">No chairman</span>
                          )}
                        </td>
                        {editable ? (
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 bg-[#780301] hover:bg-[#5a0201] text-white"
                                disabled={!changed || !choice || busy === p.id}
                                onClick={() => void assignRow(p.id, choice)}
                              >
                                {current && choice !== current ? "Transfer" : "Assign"}
                              </Button>
                              {current ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  disabled={busy === p.id}
                                  onClick={() => void assignRow(p.id, "")}
                                >
                                  Remove
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                      {canManageAccounts && editId && editId === current && group.programs.find((x) => chairOf.get(x.id) === editId)?.id === p.id ? (
                        <tr className="bg-black/[0.02]">
                          <td colSpan={editable ? 4 : 3} className="px-3 py-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <label className="space-y-1">
                                <span className="block text-[12px] font-semibold text-black/75">Full name</span>
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                              </label>
                              <label className="space-y-1">
                                <span className="block text-[12px] font-semibold text-black/75">Email (username)</span>
                                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                              </label>
                              <label className="space-y-1">
                                <span className="block text-[12px] font-semibold text-black/75">New password (optional)</span>
                                <PasswordInput
                                  placeholder="Leave empty to keep it"
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  autoComplete="new-password"
                                />
                              </label>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 bg-[#780301] hover:bg-[#5a0201] text-white"
                                disabled={busy === `acct:${editId}`}
                                onClick={() => void saveAccount()}
                              >
                                Save account
                              </Button>
                              {confirmDelete ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 bg-red-700 text-white hover:bg-red-800"
                                    disabled={busy === `acct:${editId}`}
                                    onClick={() => void deleteAccount()}
                                  >
                                    Confirm delete
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setConfirmDelete(false)}>
                                    Keep
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-red-800 border-red-200 hover:bg-red-50"
                                  onClick={() => setConfirmDelete(true)}
                                >
                                  Delete account
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="text-[11px] text-black/50">
            {canManageAccounts
              ? "Pick an existing chairman, or use ＋ New chairman to create one. A chairman with several programs switches between them from their own pages."
              : "Only Program Chairman accounts of this college are listed. DOI creates them under Colleges & Chairmen. A chairman with several programs switches between them from their own pages."}
          </p>
        </div>
      )}

      {groupsSupported && programs.length > 0 ? (
        <details className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5">
          <summary className="cursor-pointer text-[14px] font-semibold">Program groups (which majors belong together)</summary>
          <p className="mt-2 text-[12px] text-black/60">
            Give majors the same group code (e.g. BIT) to manage them as one group. Leave it blank for a program that is
            its own group.
          </p>
          <div className="mt-3 grid gap-2">
            {programs.map((p) => {
              const value = groupDraft[p.id] ?? p.groupCode ?? "";
              const dirty = value.trim().toUpperCase() !== (p.groupCode ?? "").trim().toUpperCase();
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="min-w-[280px]">{programLabel(p)}</span>
                  <Input
                    className="h-8 w-32"
                    placeholder="Group"
                    value={value}
                    onChange={(e) => setGroupDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                  />
                  {dirty ? (
                    <Button type="button" size="sm" className="h-8" disabled={busy === `grp:${p.id}`} onClick={() => void saveGroup(p)}>
                      Save
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}
