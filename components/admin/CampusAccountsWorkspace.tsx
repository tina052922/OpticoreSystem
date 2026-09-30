"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiClientError, apiFetch, campusAccountsApi, type CampusAccount } from "@/lib/api/client";
import { DeleteWithImpactDialog } from "@/components/admin/DeleteWithImpactDialog";
import { scrollIntoAppView } from "@/lib/ui/scroll-into-app-view";
import {
  campusAccountFileName,
  resolveImportRows,
  type CampusAccountRole,
} from "@/lib/admin/campus-account-sheet";
import {
  downloadCampusAccountWorkbook,
  readCampusAccountWorkbook,
  type CampusAccountExportRow,
} from "@/lib/admin/campus-account-workbook";

type College = { id: string; code: string; name: string };
type Program = { id: string; code: string; name: string; collegeId: string | null };

/** One post: a college (for an admin) or a department (for a chairman), and who holds it. */
type Post = {
  id: string;
  code: string;
  name: string;
  parentLabel: string;
  holder: CampusAccount | null;
};

const ROLE_LABEL: Record<CampusAccountRole, string> = {
  college_admin: "College Admin",
  chairman_admin: "Chairman",
};

const MIN_PASSWORD_LENGTH = 8;

export function CampusAccountsWorkspace() {
  const [role, setRole] = useState<CampusAccountRole>("college_admin");
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [accounts, setAccounts] = useState<CampusAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const alertsRef = useRef<HTMLDivElement | null>(null);

  // ── form ────────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string; postCode: string } | null>(null);
  const [assignmentId, setAssignmentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // ── import ──────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importPassword, setImportPassword] = useState("");
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [collegesRes, programsRes, accountsRes] = await Promise.all([
        apiFetch<{ colleges: College[] }>("/api/catalog/colleges", { method: "GET" }),
        apiFetch<{ programs: Program[] }>("/api/catalog/programs", { method: "GET" }),
        campusAccountsApi.list(),
      ]);
      setColleges(collegesRes.colleges ?? []);
      setPrograms(programsRes.programs ?? []);
      setAccounts(accountsRes.accounts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!error && !success) return;
    scrollIntoAppView(alertsRef.current);
  }, [error, success]);

  /**
   * Every post, held or not. Listing the empty ones is the point: DOI needs to see at a glance which
   * college has no admin and which department has no chairman.
   */
  const posts = useMemo<Post[]>(() => {
    const holderFor = (postId: string) =>
      accounts.find((a) =>
        role === "college_admin"
          ? a.role === "college_admin" && a.collegeId === postId
          : a.role === "chairman_admin" && a.chairmanProgramId === postId,
      ) ?? null;

    if (role === "college_admin") {
      return [...colleges]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((c) => ({ id: c.id, code: c.code, name: c.name, parentLabel: "", holder: holderFor(c.id) }));
    }
    const collegeCode = new Map(colleges.map((c) => [c.id, c.code]));
    return [...programs]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        parentLabel: p.collegeId ? (collegeCode.get(p.collegeId) ?? "") : "",
        holder: holderFor(p.id),
      }));
  }, [role, colleges, programs, accounts]);

  const openPosts = useMemo(
    () => posts.filter((p) => !p.holder || p.id === assignmentOfEditing()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- assignmentOfEditing reads editingId + accounts
    [posts, editingId, accounts],
  );

  function assignmentOfEditing(): string | null {
    if (!editingId) return null;
    const account = accounts.find((a) => a.id === editingId);
    if (!account) return null;
    return account.role === "college_admin" ? account.collegeId : account.chairmanProgramId;
  }

  const heldCount = posts.filter((p) => p.holder).length;

  function resetForm() {
    setEditingId(null);
    setAssignmentId("");
    setFullName("");
    setEmail("");
    setPassword("");
  }

  function startEdit(post: Post) {
    if (!post.holder) return;
    setEditingId(post.holder.id);
    setAssignmentId(post.id);
    setFullName(post.holder.name ?? "");
    setEmail(post.holder.email ?? "");
    setPassword("");
    setError(null);
    setSuccess(null);
  }

  function startCreate(post: Post) {
    resetForm();
    setAssignmentId(post.id);
    setError(null);
    setSuccess(null);
  }

  async function onSave() {
    setError(null);
    setSuccess(null);
    if (!assignmentId) {
      setError(role === "college_admin" ? "Choose a college." : "Choose a department.");
      return;
    }
    if (!fullName.trim()) {
      setError("Enter the full name.");
      return;
    }
    if (!editingId && password.trim().length < MIN_PASSWORD_LENGTH) {
      setError(`Set a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    const program = role === "chairman_admin" ? programs.find((p) => p.id === assignmentId) : null;
    const payload = {
      role,
      collegeId: role === "college_admin" ? assignmentId : (program?.collegeId ?? null),
      programId: role === "chairman_admin" ? assignmentId : null,
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
    };

    setSaving(true);
    try {
      if (editingId) {
        const { warning } = await campusAccountsApi.update(editingId, {
          ...payload,
          // An empty password on edit means "leave the current one alone".
          password: password.trim() || undefined,
        });
        setSuccess(warning ?? `${ROLE_LABEL[role]} updated.`);
      } else {
        await campusAccountsApi.create(payload);
        setSuccess(
          `${ROLE_LABEL[role]} registered. They must change this password at first sign-in.`,
        );
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Removing a post holder deletes their account, so the dialog first says what that account is
   * still attached to — plots, justifications, notifications — instead of failing on a foreign key.
   */
  function askDelete(post: Post) {
    const holder = post.holder;
    if (!holder) return;
    setPendingDelete({
      id: holder.id,
      name: holder.name || holder.email,
      postCode: post.code,
    });
  }

  async function afterDeleted(pending: { id: string; name: string; postCode: string }) {
    if (editingId === pending.id) resetForm();
    setSuccess(`${pending.name} removed from ${pending.postCode}.`);
    await load();
  }

  // ── Excel ───────────────────────────────────────────────────────────────

  async function onExport() {
    setError(null);
    try {
      const rows: CampusAccountExportRow[] = posts.map((p) => ({
        assignmentCode: p.code,
        assignmentName: p.name,
        fullName: p.holder?.name ?? "",
        email: p.holder?.email ?? "",
      }));
      await downloadCampusAccountWorkbook(role, rows);
      setSuccess(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} to ${campusAccountFileName(role)}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export.");
    }
  }

  async function onImportFile(file: File) {
    setError(null);
    setSuccess(null);
    setImportReport(null);

    if (importPassword.trim().length < MIN_PASSWORD_LENGTH) {
      setError(`Set a temporary password of at least ${MIN_PASSWORD_LENGTH} characters before importing.`);
      return;
    }

    setImporting(true);
    try {
      const sheetRows = await readCampusAccountWorkbook(file);
      const taken = new Set(posts.filter((p) => p.holder).map((p) => p.id));
      const resolved = resolveImportRows(sheetRows, role, { colleges, programs }, taken);

      const report: string[] = [];
      let created = 0;

      for (const target of resolved) {
        if (target.error) {
          report.push(`Row ${target.row.rowNumber} (${target.row.assignmentCode || "—"}): ${target.error}`);
          continue;
        }
        try {
          await campusAccountsApi.create({
            role,
            collegeId: target.collegeId,
            programId: target.programId,
            name: target.row.fullName,
            email: target.row.email,
            password: importPassword.trim(),
          });
          created += 1;
        } catch (e) {
          const message = e instanceof Error ? e.message : "could not be created";
          report.push(`Row ${target.row.rowNumber} (${target.row.assignmentCode}): ${message}`);
        }
      }

      setImportReport(report);
      if (created > 0) {
        setSuccess(
          `Registered ${created} ${ROLE_LABEL[role]}${created === 1 ? "" : "s"}. ` +
            "Each must change the temporary password at first sign-in.",
        );
      }
      if (created === 0 && report.length > 0) setError("Nothing was imported. See the rows below.");
      setImportPassword("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const assignmentLabel = role === "college_admin" ? "College" : "Department";

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-8 space-y-6 max-w-[1100px]">
      <p className="text-[13px] text-black/65 leading-relaxed">
        One College Admin for each college, and one Chairman for each department. Registering an account
        creates its sign-in; the holder is asked to change the password the first time they sign in.
      </p>

      <div className="flex flex-wrap gap-2">
        {(["college_admin", "chairman_admin"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setRole(r);
              resetForm();
              setImportReport(null);
            }}
            className={`h-10 px-4 rounded-[15px] font-bold text-[14px] ${
              role === r ? "bg-[#780301] text-white" : "bg-white text-black border border-black/10"
            }`}
          >
            {r === "college_admin" ? "College Admins" : "Chairmen"}
          </button>
        ))}
      </div>

      <div ref={alertsRef} className="space-y-3 scroll-mt-4 empty:hidden">
        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2" role="status">
            {success}
          </p>
        ) : null}
      </div>

      {/* ── Register / edit ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-4">
        <div className="text-[16px] font-semibold">
          {editingId ? `Edit ${ROLE_LABEL[role]}` : `Register ${ROLE_LABEL[role]}`}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-black/75">{assignmentLabel}</span>
            <select
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              disabled={saving}
            >
              <option value="">Select {assignmentLabel.toLowerCase()}…</option>
              {openPosts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code}
                  {p.parentLabel ? ` · ${p.parentLabel}` : ""} — {p.name}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-black/50">
              Only {assignmentLabel.toLowerCase()}s without a holder are listed.
            </span>
          </label>

          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-black/75">Full name</span>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={saving} />
          </label>

          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-black/75">Email (username)</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@ctu.edu.ph"
              disabled={saving}
            />
          </label>

          <div className="space-y-1">
            <label className="block text-[12px] font-semibold text-black/75" htmlFor="campus-account-password">
              {editingId ? "New password (optional)" : "Password"}
            </label>
            <PasswordInput
              id="campus-account-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editingId ? "Leave blank to keep" : `At least ${MIN_PASSWORD_LENGTH} characters`}
              disabled={saving}
              autoComplete="new-password"
              // Back to hidden whenever the form switches rows or is reset.
              hiddenKey={editingId ?? "new"}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : editingId ? "Save changes" : `Register ${ROLE_LABEL[role]}`}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" disabled={saving} onClick={() => resetForm()}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Excel ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-4">
        <div>
          <div className="text-[16px] font-semibold">Import / export</div>
          <p className="text-[12px] text-black/55 mt-0.5">
            Export gives every {assignmentLabel.toLowerCase()} with its current holder — fill in the blanks
            and import it back. Passwords are never written to the file: set one temporary password here and
            each imported holder changes it at first sign-in.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div className="space-y-1">
            <label className="block text-[12px] font-semibold text-black/75" htmlFor="campus-account-import-password">
              Temporary password for imported accounts
            </label>
            <PasswordInput
              id="campus-account-import-password"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              disabled={importing}
              autoComplete="new-password"
            />
          </div>
          <Button type="button" variant="outline" disabled={importing} onClick={() => void onExport()}>
            Export to Excel
          </Button>
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {importing ? "Importing…" : "Import from Excel"}
          </Button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onImportFile(file);
          }}
        />

        {importReport && importReport.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[12px] font-semibold text-amber-950">
              {importReport.length} row{importReport.length === 1 ? "" : "s"} skipped
            </p>
            <ul className="mt-1 space-y-0.5 text-[12px] text-amber-950/90 list-disc pl-4">
              {importReport.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* ── Posts ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="p-4 border-b border-black/10">
          <div className="text-[16px] font-semibold">
            {role === "college_admin" ? "Colleges" : "Departments"}
          </div>
          <div className="text-[12px] text-black/55">
            {loading ? "Loading…" : `${heldCount} of ${posts.length} assigned`}
          </div>
        </div>

        {posts.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-black/50">
            {loading ? "Loading…" : `No ${assignmentLabel.toLowerCase()}s on file.`}
          </p>
        ) : (
          <ul className="divide-y divide-black/10">
            {posts.map((post) => (
              <li key={post.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">
                    {post.code}
                    {post.parentLabel ? <span className="text-black/45"> · {post.parentLabel}</span> : null}
                  </div>
                  <div className="text-[12px] text-black/55 truncate">{post.name}</div>
                </div>

                <div className="min-w-0 sm:ml-6">
                  {post.holder ? (
                    <>
                      <div className="text-[13px]">{post.holder.name}</div>
                      <div className="text-[11px] text-black/50 truncate">{post.holder.email}</div>
                    </>
                  ) : (
                    <span className="text-[12px] font-medium text-amber-800">No holder yet</span>
                  )}
                </div>

                <div className="ml-auto flex flex-wrap gap-2">
                  {post.holder ? (
                    <>
                      <Button type="button" size="sm" variant="outline" onClick={() => startEdit(post)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => askDelete(post)}>
                        Remove
                      </Button>
                    </>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => startCreate(post)}>
                      Register
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {pendingDelete ? (
        <DeleteWithImpactDialog
          entity="facultyUser"
          id={pendingDelete.id}
          name={pendingDelete.name}
          title="Remove account"
          open
          onClose={() => setPendingDelete(null)}
          onDeleted={() => void afterDeleted(pendingDelete)}
        />
      ) : null}

    </div>
  );
}
