"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, campusAccountsApi, type CampusAccount } from "@/lib/api/client";
import { DeleteCampusAccountDialog } from "@/components/admin/DeleteCampusAccountDialog";
import { CasChairsPanel } from "@/components/admin/CasChairsPanel";
import { ChairAssignmentWorkspace } from "@/components/admin/ChairAssignmentWorkspace";
import { scrollIntoAppView } from "@/lib/ui/scroll-into-app-view";
import { useActionToast } from "@/components/alerts/useActionToast";
import {
  campusAccountFileName,
  resolveImportRows,
  type CampusAccountImportTarget,
  type CampusAccountRole,
} from "@/lib/admin/campus-account-sheet";
import {
  assignmentForSaveRole,
  CAMPUS_ACCOUNT_ROLE_LABEL,
  GEC_CHAIRMAN_POST_CODE,
  GEC_CHAIRMAN_POST_ID,
  GEC_CHAIRMAN_POST_NAME,
  postIdForAccount,
  saveRoleForPost,
  tabForSaveRole,
} from "@/lib/admin/campus-account-posts";
import {
  downloadCampusAccountWorkbook,
  readCampusAccountWorkbook,
  type CampusAccountExportRow,
} from "@/lib/admin/campus-account-workbook";

type College = { id: string; code: string; name: string };
type Program = { id: string; code: string; name: string; collegeId: string | null };

/** One post: a college (for an admin) or a department (for a chairperson), and who holds it. */
type Post = {
  id: string;
  code: string;
  name: string;
  parentLabel: string;
  holder: CampusAccount | null;
};

const ROLE_LABEL: Record<CampusAccountRole, string> = {
  college_admin: "College Admin",
  chairman_admin: "Chairperson",
};

/**
 * The GEC Chairperson, as a post in the Chairpersons list.
 *
 * It is not a department, so it has no row in `Program` to come from — general education is taught
 * across every college and there is one chairperson for all of it. Listing it here means the page
 * shows at a glance whether the post is filled, and `openPosts` stops offering it the moment it is:
 * that, plus the same rule on the server, is what keeps it to one.
 */
const GEC_CHAIRMAN_POST = {
  id: GEC_CHAIRMAN_POST_ID,
  code: GEC_CHAIRMAN_POST_CODE,
  name: GEC_CHAIRMAN_POST_NAME,
  parentLabel: "All colleges",
} as const;


export function CampusAccountsWorkspace() {
  const [role, setRole] = useState<CampusAccountRole>("college_admin");
  /** Third tab: CAS chairs (Service Chairs + CAS Program Chairs). */
  const [casTab, setCasTab] = useState(false);
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "chairmen") setRole("chairman_admin");
    else if (tab === "cas") setCasTab(true);
  }, []);
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [accounts, setAccounts] = useState<CampusAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const toast = useActionToast();
  const alertsRef = useRef<HTMLDivElement | null>(null);

  // ── form ────────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
    email: string;
    postCode: string;
  } | null>(null);
  const [assignmentId, setAssignmentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  /** Edit: email them a new temporary password. (New accounts always get one.) */
  const [sendNewPassword, setSendNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  /**
   * "Register" / "Edit" in the list fill the form at the top of the page. On a long list that form
   * is off-screen, so the click looked like it did nothing — bring the form into view, put the cursor
   * in Full name, and flash the card.
   */
  const formRef = useRef<HTMLDivElement | null>(null);
  const [formFlash, setFormFlash] = useState(false);
  function revealForm() {
    scrollIntoAppView(formRef.current);
    setFormFlash(true);
    // By id: the shared Input does not forward refs on React 18.
    window.setTimeout(() => document.getElementById("campus-account-full-name")?.focus({ preventScroll: true }), 350);
    window.setTimeout(() => setFormFlash(false), 1600);
  }

  // ── import ──────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<string[] | null>(null);
  /** Rows read from the chosen file, shown for review before anything is created. */
  const [importPreview, setImportPreview] = useState<{ fileName: string; rows: CampusAccountImportTarget[] } | null>(
    null,
  );
  const [importHelpOpen, setImportHelpOpen] = useState(false);

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
      toast.fail(e, "Could not load the accounts", "campus accounts");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Every post, held or not. Listing the empty ones is the point: DOI needs to see at a glance which
   * college has no admin and which department has no chairperson.
   */
  const posts = useMemo<Post[]>(() => {
    // Matched within the open tab, so a program id could never be read as a college id.
    const holderFor = (postId: string) =>
      accounts.find((a) => tabForSaveRole(a.role) === role && postIdForAccount(a) === postId) ?? null;

    if (role === "college_admin") {
      return [...colleges]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((c) => ({ id: c.id, code: c.code, name: c.name, parentLabel: "", holder: holderFor(c.id) }));
    }
    const collegeCode = new Map(colleges.map((c) => [c.id, c.code]));
    const departments = [...programs]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        parentLabel: p.collegeId ? (collegeCode.get(p.collegeId) ?? "") : "",
        holder: holderFor(p.id),
      }));
    // Service Chairs (the former GEC Chairperson) are managed in the CAS Chairs tab, one per service area.
    void GEC_CHAIRMAN_POST;
    return departments;
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
    return postIdForAccount(account);
  }

  const heldCount = posts.filter((p) => p.holder).length;

  function resetForm() {
    setEditingId(null);
    setAssignmentId("");
    setFullName("");
    setEmail("");
    setSendNewPassword(false);
  }

  function startEdit(post: Post) {
    if (!post.holder) return;
    setEditingId(post.holder.id);
    setAssignmentId(post.id);
    setFullName(post.holder.name ?? "");
    setEmail(post.holder.email ?? "");
    setSendNewPassword(false);
    revealForm();
  }

  function startCreate(post: Post) {
    resetForm();
    setAssignmentId(post.id);
    revealForm();
  }

  async function onSave() {
    if (!assignmentId) {
      toast.refuse(
        role === "college_admin" ? "Choose a college first" : "Choose a department first",
        "An account has to be attached to the post it manages.",
      );
      return;
    }
    if (!fullName.trim()) {
      toast.refuse("Enter the full name", "This is the name that appears on INS forms.");
      return;
    }

    /*
     * The post decides the role, not the tab: picking GEC in the Chairpersons tab saves a GEC Chairperson,
     * campus-wide and with no department. The server applies the same rule.
     */
    const saveRole = saveRoleForPost(role, assignmentId);
    const program = programs.find((p) => p.id === assignmentId);
    const payload = {
      ...assignmentForSaveRole(saveRole, assignmentId, program?.collegeId ?? null),
      role: saveRole,
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
    };
    const saveLabel = CAMPUS_ACCOUNT_ROLE_LABEL[saveRole];

    setSaving(true);
    try {
      if (editingId) {
        const { warning, emailed } = await campusAccountsApi.update(editingId, {
          ...payload,
          ...(sendNewPassword ? { resetPassword: true } : {}),
        });
        toast.ok(
          `${saveLabel} account updated successfully`,
          emailed ? `A new temporary password was emailed to ${payload.email}.` : null,
        );
        toast.caution(warning, "Saved with a limitation");
      } else {
        const { warning, emailed } = await campusAccountsApi.create(payload);
        toast.ok(
          `${saveLabel} account created successfully`,
          emailed
            ? `A temporary password was emailed to ${payload.email}. They choose their own at first sign-in.`
            : null,
        );
        toast.caution(warning, "Created, but the email was not sent");
      }
      resetForm();
      await load();
    } catch (e) {
      toast.fail(e, "Could not save the account", "campus accounts: save");
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
      email: holder.email ?? "",
      postCode: post.code,
    });
  }

  async function afterDeleted(pending: { id: string; name: string; postCode: string }) {
    if (editingId === pending.id) resetForm();
    toast.ok(`${pending.name}'s account removed successfully`, `${pending.postCode} has no holder now.`);
    await load();
  }

  // ── Excel ───────────────────────────────────────────────────────────────

  async function onExport() {
    try {
      /*
       * The GEC Chairperson is left out of the round trip on purpose. The sheet matches a row to a post
       * by college or department code, and GEC is neither — an exported row could not be imported
       * back. The post is registered from the form instead.
       */
      const rows: CampusAccountExportRow[] = posts
        .filter((p) => p.id !== GEC_CHAIRMAN_POST_ID)
        .map((p) => ({
        assignmentCode: p.code,
        assignmentName: p.name,
        fullName: p.holder?.name ?? "",
        email: p.holder?.email ?? "",
      }));
      await downloadCampusAccountWorkbook(role, rows);
      toast.ok(
        `Exported ${rows.length} row${rows.length === 1 ? "" : "s"} successfully`,
        `Saved as ${campusAccountFileName(role)}.`,
      );
    } catch (e) {
      toast.fail(e, "Could not export the list", "campus accounts: export");
    }
  }

  /** Step 1: read the file and show every row's status. Nothing is created yet. */
  async function onImportFile(file: File) {
    setImportReport(null);
    setImportPreview(null);
    setImporting(true);
    try {
      const sheetRows = await readCampusAccountWorkbook(file);
      const holders = new Map(
        posts.filter((p) => p.holder).map((p) => [p.id, (p.holder?.email ?? "").toLowerCase()] as [string, string]),
      );
      const rows = resolveImportRows(sheetRows, role, { colleges, programs }, holders);
      if (rows.length === 0) {
        toast.refuse("The file has no rows", "Fill in Full name and Email on the first sheet, then import it.");
        return;
      }
      setImportPreview({ fileName: file.name, rows });
    } catch (e) {
      toast.fail(e, "Could not read that file", "campus accounts: import");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** Step 2: register the rows marked ready; each gets its own temporary password by email. */
  async function confirmImport() {
    if (!importPreview) return;
    setImporting(true);
    const report: string[] = [];
    let created = 0;
    try {
      for (const target of importPreview.rows) {
        if (target.status !== "ready") continue;
        try {
          await campusAccountsApi.create({
            role,
            collegeId: target.collegeId,
            programId: target.programId,
            name: target.row.fullName,
            email: target.row.email,
          });
          created += 1;
        } catch (e) {
          const message = e instanceof Error ? e.message : "could not be created";
          report.push(`Row ${target.row.rowNumber} (${target.row.assignmentCode}): ${message}`);
        }
      }
      setImportReport(report);
      setImportPreview(null);
      if (created > 0) {
        toast.ok(
          `${created} ${ROLE_LABEL[role]} account${created === 1 ? "" : "s"} created successfully`,
          "Each was emailed a temporary password and chooses their own at first sign-in.",
        );
      }
      if (created === 0 && report.length > 0) {
        toast.refuse("Nothing was imported", "Check the rows listed below and try again.");
      }
      await load();
    } finally {
      setImporting(false);
    }
  }

  const assignmentLabel = role === "college_admin" ? "College" : "Department";

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-8 space-y-6 max-w-[1100px]">
      <div className="flex flex-wrap gap-2">
        {(["college_admin", "chairman_admin"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setCasTab(false);
              setRole(r);
              resetForm();
              setImportReport(null);
              setImportPreview(null);
            }}
            className={`h-10 px-4 rounded-[15px] font-bold text-[14px] ${
              !casTab && role === r ? "bg-[#780301] text-white" : "bg-white text-black border border-black/10"
            }`}
          >
            {r === "college_admin" ? "College Admins" : "Chairpersons"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setCasTab(true);
            resetForm();
          }}
          className={`h-10 px-4 rounded-[15px] font-bold text-[14px] ${
            casTab ? "bg-[#780301] text-white" : "bg-white text-black border border-black/10"
          }`}
        >
          CAS Chairs
        </button>
      </div>

      {casTab ? (
        <CasChairsPanel colleges={colleges} programs={programs} accounts={accounts} onChanged={load} />
      ) : (
      <>

      <div ref={alertsRef} className="space-y-3 scroll-mt-4 empty:hidden">
      </div>

      {role === "chairman_admin" ? (
        <div className="space-y-2">
          <div className="text-[16px] font-semibold">Chairperson Assignment</div>
          {/* Who manages each program / major: one chair for a whole group, or one per major. */}
          {/* Re-keyed on account changes so a chairperson just added appears in its picker. */}
          <ChairAssignmentWorkspace
            key={accounts.filter((x) => x.role === "chairman_admin").map((x) => `${x.id}:${x.chairmanProgramId ?? ""}`).join("|")}
            campusWide
            embedded
            canManageAccounts
            onAccountsChanged={() => void load()}
          />
        </div>
      ) : null}

      {/* The Chairpersons tab is Chairperson Assignment only (accounts are created / edited there). */}
      {role !== "chairman_admin" ? (
      <>
      {/* ── Register / edit ─────────────────────────────────────────────── */}
      <div
        ref={formRef}
        className={`bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-4 scroll-mt-4 transition-shadow duration-500 ${
          formFlash ? "ring-2 ring-[#ff990a] ring-offset-2" : ""
        }`}
      >
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
            <Input
              id="campus-account-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
            />
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
            Register many {ROLE_LABEL[role]}s at once: <strong>Export</strong> gives a ready template, fill in the
            names and emails, then <strong>Import</strong> it back. You review every row before anything is created.
          </p>
          <button
            type="button"
            className="mt-1 text-[12px] font-semibold text-[#780301] underline-offset-2 hover:underline"
            onClick={() => setImportHelpOpen((v) => !v)}
            aria-expanded={importHelpOpen}
          >
            {importHelpOpen ? "Hide the file format" : "What format does the file need?"}
          </button>
          {importHelpOpen ? (
            <div className="mt-2 space-y-2 rounded-lg border border-black/10 bg-black/[0.02] p-3 text-[12px] text-black/75">
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  Click <strong>Export to Excel</strong>. The file lists every {assignmentLabel.toLowerCase()} — it is
                  the template. (It also has a <em>How to fill</em> sheet and a <em>Codes</em> sheet.)
                </li>
                <li>
                  On the first sheet, type the <strong>Full name</strong> and <strong>Email</strong> for each{" "}
                  {assignmentLabel.toLowerCase()} that needs an account. Leave the others blank — blank rows are skipped.
                </li>
                <li>Save it as <strong>.xlsx</strong>, click <strong>Import from Excel</strong> and check the preview.</li>
                <li>Click <strong>Create</strong>. Each person is emailed a temporary password and chooses their own at first sign-in.</li>
              </ol>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-black/10 text-black/55">
                    <th className="py-1 pr-2 font-semibold">Column</th>
                    <th className="py-1 pr-2 font-semibold">What to put</th>
                    <th className="py-1 font-semibold">Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black/5">
                    <td className="py-1 pr-2 font-semibold">Assignment code</td>
                    <td className="py-1 pr-2">The {role === "college_admin" ? "college" : "department"} code (already filled in by Export)</td>
                    <td className="py-1">{role === "college_admin" ? "COTE" : "BSIT"}</td>
                  </tr>
                  <tr className="border-b border-black/5">
                    <td className="py-1 pr-2 font-semibold">Full name</td>
                    <td className="py-1 pr-2">As it should appear in OptiCore and on the INS forms</td>
                    <td className="py-1">Juan S. Dela Cruz</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-2 font-semibold">Email</td>
                    <td className="py-1 pr-2">The address they sign in with (one account per email)</td>
                    <td className="py-1">juan.delacruz@ctu.edu.ph</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-black/55">
                Passwords are never put in the file. A row whose {assignmentLabel.toLowerCase()} already has a holder can
                stay as exported; to replace a holder, remove them on this page first.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={importing} onClick={() => void onExport()}>
            Export to Excel
          </Button>
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {importing && !importPreview ? "Reading…" : "Import from Excel"}
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

        {importPreview ? (
          <ImportPreview
            preview={importPreview}
            busy={importing}
            roleLabel={ROLE_LABEL[role]}
            onCancel={() => setImportPreview(null)}
            onConfirm={() => void confirmImport()}
          />
        ) : null}

        {importReport && importReport.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[12px] font-semibold text-amber-950">
              {importReport.length} row{importReport.length === 1 ? "" : "s"} could not be created
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
          // Capped height: a campus has dozens of departments, and the list should not stretch the page.
          <ul className="max-h-[480px] overflow-y-auto overscroll-contain divide-y divide-black/10">
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
      </>
      ) : null}
      {pendingDelete ? (
        <DeleteCampusAccountDialog
          account={pendingDelete}
          roleLabel={ROLE_LABEL[role]}
          onClose={() => setPendingDelete(null)}
          onDeleted={() => void afterDeleted(pendingDelete)}
        />
      ) : null}
      </>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<CampusAccountImportTarget["status"], { label: string; cls: string }> = {
  ready: { label: "Will be created", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  unchanged: { label: "Already registered", cls: "bg-black/[0.03] text-black/60 border-black/10" },
  empty: { label: "Not filled in — skipped", cls: "bg-black/[0.03] text-black/45 border-black/10" },
  error: { label: "Needs fixing", cls: "bg-red-50 text-red-800 border-red-200" },
};

/** Every row of the chosen file with what will happen to it; Create registers only the ready ones. */
function ImportPreview({
  preview,
  busy,
  roleLabel,
  onCancel,
  onConfirm,
}: {
  preview: { fileName: string; rows: CampusAccountImportTarget[] };
  busy: boolean;
  roleLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [showSkipped, setShowSkipped] = useState(false);
  const count = (s: CampusAccountImportTarget["status"]) => preview.rows.filter((r) => r.status === s).length;
  const ready = count("ready");
  const errors = count("error");
  const visible = preview.rows.filter((r) => showSkipped || r.status === "ready" || r.status === "error");

  return (
    <div className="space-y-3 rounded-lg border border-[#780301]/20 bg-[#fdf6f5] p-4">
      <div>
        <div className="text-[14px] font-semibold">Preview — {preview.fileName}</div>
        <p className="mt-0.5 text-[12px] text-black/65">
          <strong className="text-emerald-800">{ready} to create</strong>
          {errors > 0 ? <> · <strong className="text-red-800">{errors} to fix</strong></> : null}
          {" · "}
          {count("unchanged")} already registered · {count("empty")} not filled in
        </p>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-md border border-black/10 bg-white">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-black/10 text-black/55">
              <th className="px-2 py-1.5 font-semibold">Row</th>
              <th className="px-2 py-1.5 font-semibold">Code</th>
              <th className="px-2 py-1.5 font-semibold">Full name</th>
              <th className="px-2 py-1.5 font-semibold">Email</th>
              <th className="px-2 py-1.5 font-semibold">Result</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-black/50">
                  No rows to create. Fill in Full name and Email for the posts that need an account.
                </td>
              </tr>
            ) : (
              visible.map((t) => (
                <tr key={t.row.rowNumber} className="border-b border-black/5 align-top">
                  <td className="px-2 py-1.5 tabular-nums text-black/55">{t.row.rowNumber}</td>
                  <td className="px-2 py-1.5 font-semibold">{t.row.assignmentCode || "—"}</td>
                  <td className="px-2 py-1.5">{t.row.fullName || "—"}</td>
                  <td className="px-2 py-1.5 break-all">{t.row.email || "—"}</td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block rounded border px-1.5 py-0.5 font-semibold ${STATUS_STYLE[t.status].cls}`}>
                      {STATUS_STYLE[t.status].label}
                    </span>
                    {t.error ? <div className="mt-0.5 text-red-800">{t.error}</div> : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="text-[12px] font-semibold text-black/60 underline-offset-2 hover:underline"
        onClick={() => setShowSkipped((v) => !v)}
      >
        {showSkipped ? "Hide skipped rows" : "Show skipped rows too"}
      </button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <p className="text-[11px] text-black/55">
          Each new account is emailed its own temporary password.
        </p>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          className="bg-[#780301] hover:bg-[#5a0201] text-white"
          disabled={busy || ready === 0}
          onClick={onConfirm}
        >
          {busy ? "Creating…" : `Create ${ready} ${roleLabel}${ready === 1 ? "" : "s"}`}
        </Button>
      </div>
      {errors > 0 ? (
        <p className="text-[11px] text-black/55">
          Rows that need fixing are not created. Fix them in the file and import it again — rows already created will
          then show as “Already registered”.
        </p>
      ) : null}
    </div>
  );
}
