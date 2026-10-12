"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, subjectCategoryApi } from "@/lib/api/client";
import { useActionToast } from "@/components/alerts/useActionToast";
import {
  isCampusSubjectCategory,
  normalizeSubjectCategoryCode,
  subjectCategoriesForProgram,
  type SubjectCategoryRow,
} from "@/lib/subjects/subject-category";

export type ManageSubjectCategoriesModalProps = {
  open: boolean;
  onClose: () => void;
  /** The program whose categories are being edited. */
  programId: string;
  programLabel: string;
  categories: SubjectCategoryRow[];
  /** Re-reads the catalog after a change, so the Category dropdown behind this modal updates. */
  onChanged: () => void | Promise<void>;
  /**
   * DOI: the campus-wide categories may be renamed and removed here too.
   *
   * For everyone else they are read-only, because a change to one reaches every program at once.
   */
  canEditCampusCategories?: boolean;
};

/**
 * Where a chairman says what kinds of subject their program runs.
 *
 * The list used to be six words fixed in the code and in a database constraint, which could not
 * describe a campus: a "major" is not one thing, and each program's majors carry their own codes.
 *
 * GEC, PE and NSTP are taught in every program, so they are shown here but cannot be touched —
 * removing one would strand subjects in every other program too.
 */
export function ManageSubjectCategoriesModal({
  open,
  onClose,
  programId,
  programLabel,
  categories,
  onChanged,
  canEditCampusCategories = false,
}: ManageSubjectCategoriesModalProps) {
  const [newLabel, setNewLabel] = useState("");
  const toast = useActionToast();
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  /**
   * How many subjects the category being removed is on.
   *
   * Null until the server says. The first Remove asks and changes nothing; this count is what the
   * second confirmation is about, so nobody clears a category off subjects without being told.
   */
  const [pendingInUse, setPendingInUse] = useState<number | null>(null);

  const rows = useMemo(
    () => subjectCategoriesForProgram(categories, programId),
    [categories, programId],
  );

  useEffect(() => {
    if (open) return;
    setNewLabel("");
    setEditingId(null);
    setConfirmDeleteId(null);
    setPendingInUse(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pendingCode = normalizeSubjectCategoryCode(newLabel);

  async function run(action: () => Promise<unknown>, failTitle: string) {
    setBusy(true);
    try {
      await action();
      await onChanged();
      return true;
    } catch (e) {
      toast.fail(e, failTitle, "subject categories");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!pendingCode) return;
    const label = newLabel.trim();
    const ok = await run(
      () => subjectCategoryApi.create({ programId, label, code: pendingCode }),
      "Could not add the category",
    );
    if (ok) {
      setNewLabel("");
      toast.ok(`“${label}” added`, "It is now available in the Category field.");
    }
  }

  async function rename(id: string) {
    const label = editLabel.trim();
    if (!label) return;
    const ok = await run(() => subjectCategoryApi.rename(id, label), "Could not rename the category");
    if (ok) {
      setEditingId(null);
      toast.ok(`Renamed to “${label}”`);
    }
  }

  /**
   * First press asks; a second press, once the count is known, goes ahead.
   *
   * The subjects are not deleted — their category is cleared, so they show "— Not set —" and can be
   * filed under another category straight away.
   */
  async function remove(id: string, force: boolean) {
    const label = rows.find((r) => r.id === id)?.label ?? "Category";
    setBusy(true);
    try {
      const res = await subjectCategoryApi.remove(id, { force });
      await onChanged();
      setConfirmDeleteId(null);
      setPendingInUse(null);
      toast.ok(
        `“${label}” removed`,
        res.cleared > 0
          ? `${res.cleared} subject${res.cleared === 1 ? "" : "s"} now show “— Not set —”.`
          : null,
      );
    } catch (e) {
      const inUse =
        e instanceof ApiClientError && e.code === "IN_USE"
          ? (e.details as { inUse?: number } | undefined)?.inUse ?? 0
          : null;
      if (inUse !== null) {
        // Not a failure: the server is telling us what removing would cost, so the panel asks again.
        setPendingInUse(inUse);
      } else {
        toast.fail(e, "Could not remove the category", "subject categories");
        setConfirmDeleteId(null);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-categories-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="manage-categories-title" className="text-[16px] font-bold text-black/85">
              Subject categories
            </h2>
            <p className="mt-0.5 text-[12px] text-black/60">
              What kinds of subject {programLabel} runs. These fill the Category field.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-black/45 hover:bg-black/5 hover:text-black/70"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {pendingInUse ? (
          <p className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-[12px] text-amber-900">
            {pendingInUse} subject{pendingInUse === 1 ? "" : "s"} use this category. Removing it sets
            {pendingInUse === 1 ? " that subject" : " those subjects"} to{" "}
            <strong>— Not set —</strong>, ready to be filed under another category. The subjects
            themselves are not deleted.
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto">
          <ul className="divide-y divide-black/5">
            {rows.map((row) => {
              const campus = isCampusSubjectCategory(row);
              /** Campus-wide rows are everyone's, so only DOI may change them. */
              const locked = campus && !canEditCampusCategories;
              const editing = editingId === row.id;
              const confirming = confirmDeleteId === row.id;
              return (
                <li key={row.id} className="flex items-center gap-3 px-5 py-2.5">
                  {editing ? (
                    <>
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-8 flex-1 text-[13px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void rename(row.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button
                        type="button"
                        className="h-8 bg-[#780301] text-[12px] text-white hover:bg-[#5a0201]"
                        disabled={busy || !editLabel.trim()}
                        onClick={() => void rename(row.id)}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 text-[12px]"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-black/80">{row.label}</span>
                          {/* The lock states that this row is read-only, so DOI — who may edit it — never sees it. */}
                          {locked ? (
                            <span className="inline-flex items-center gap-1 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-black/55">
                              <Lock className="h-3 w-3" aria-hidden />
                              Campus-wide
                            </span>
                          ) : null}
                        </div>
                        <code className="text-[11px] text-black/45">{row.code}</code>
                      </div>
                      {confirming && !locked ? (
                        <>
                          <span className="text-right text-[12px] font-semibold text-red-800">
                            {pendingInUse === null
                              ? "Remove?"
                              : pendingInUse === 0
                                ? "Remove?"
                                : `Clear it off ${pendingInUse} subject${pendingInUse === 1 ? "" : "s"}?`}
                          </span>
                          <Button
                            type="button"
                            className="h-8 bg-red-700 text-[12px] text-white hover:bg-red-800"
                            disabled={busy}
                            onClick={() => void remove(row.id, pendingInUse !== null)}
                          >
                            {pendingInUse ? "Yes, remove" : "Yes"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 text-[12px]"
                            onClick={() => {
                              setConfirmDeleteId(null);
                              setPendingInUse(null);
                            }}
                          >
                            No
                          </Button>
                        </>
                      ) : (
                        <>
                          {locked ? null : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 px-2 text-[12px]"
                                disabled={busy}
                                title="Rename"
                                onClick={() => {
                                  setEditingId(row.id);
                                  setEditLabel(row.label);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 border-red-200 px-2 text-[12px] text-red-800 hover:bg-red-50"
                                disabled={busy}
                                title="Remove"
                                onClick={() => {
                                  setConfirmDeleteId(row.id);
                                  setPendingInUse(null);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-black/10 px-5 py-4">
          <label className="block text-[12px] font-semibold text-black/75" htmlFor="new-subject-category">
            Add a category
          </label>
          <div className="mt-1 flex gap-2">
            <Input
              id="new-subject-category"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Professional Elective"
              className="h-9 flex-1 text-[13px]"
              disabled={busy || !programId}
              onKeyDown={(e) => {
                if (e.key === "Enter") void add();
              }}
            />
            <Button
              type="button"
              className="h-9 bg-[#780301] text-[13px] text-white hover:bg-[#5a0201]"
              disabled={busy || !pendingCode || !programId}
              onClick={() => void add()}
            >
              Add
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-black/50">
            {pendingCode ? (
              <>
                Stored as <code className="text-black/70">{pendingCode}</code>.
              </>
            ) : (
              canEditCampusCategories
                ? "Saved against this program. The campus-wide ones below are available to every program."
                : "Saved against this program only. The campus-wide ones are available everywhere and are managed by DOI."
            )}
          </p>
        </div>

        <div className="flex justify-end border-t border-black/10 px-5 py-3">
          <Button type="button" variant="outline" className="h-9 text-[13px]" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
