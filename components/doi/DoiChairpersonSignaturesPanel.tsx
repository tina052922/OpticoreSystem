"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActionToast } from "@/components/alerts/useActionToast";
import { Button } from "@/components/ui/button";
import {
  ApiClientError,
  doiApi,
  type ChairpersonSignatureRow,
} from "@/lib/api/client";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import { notifySystemConfigurationSaved } from "@/contexts/SystemConfigurationContext";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_BYTES = 2 * 1024 * 1024;

const ROLE_LABEL: Record<ChairpersonSignatureRow["role"], string> = {
  chairman_admin: "Program Chairperson",
  gec_chairman: "Service Chair",
};

function errorText(e: unknown, fallback: string) {
  return e instanceof ApiClientError ? e.message : fallback;
}

/**
 * DOI → System Configuration → Chairperson signatures. The DOI corrects a chairperson's name and
 * uploads or removes the e-signature printed on their INS line. Same image the chairperson can
 * upload from their own profile.
 */
export function DoiChairpersonSignaturesPanel() {
  const toast = useActionToast();
  const [rows, setRows] = useState<ChairpersonSignatureRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  /** Row whose name is being edited, and the draft. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  /** Row with a request in flight. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const { chairpersons } = await doiApi.listChairpersonSignatures();
      setRows(chairpersons);
    } catch (e) {
      setLoadError(errorText(e, "Could not load chairpersons."));
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!rows) return [];
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.email, r.assignment ?? "", ROLE_LABEL[r.role]].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [rows, query]);

  function patchRow(id: string, patch: Partial<ChairpersonSignatureRow>) {
    setRows((prev) =>
      prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev,
    );
  }

  function announceInsChange() {
    notifySystemConfigurationSaved("insSigners");
    dispatchInsCatalogReload();
  }

  async function saveName(row: ChairpersonSignatureRow) {
    const name = draftName.trim().replace(/\s+/g, " ");
    if (!name) {
      toast.refuse(
        "Enter a name",
        "The name prints on the INS forms, so it can't be blank.",
      );
      return;
    }
    if (name === row.name) {
      setEditingId(null);
      return;
    }
    setBusyId(row.id);
    try {
      const res = await doiApi.updateChairpersonName(row.id, name);
      patchRow(row.id, { name: res.name });
      setEditingId(null);
      announceInsChange();
      toast.ok("Name updated", `${res.name} will appear on the INS forms.`);
    } catch (e) {
      toast.fail(e, "Could not save the name");
    } finally {
      setBusyId(null);
    }
  }

  async function upload(row: ChairpersonSignatureRow, file: File | null) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.refuse("Image is too large", "Use an image of 2 MB or less.");
      return;
    }
    setBusyId(row.id);
    try {
      const { url } = await doiApi.uploadChairpersonSignature(row.id, file);
      patchRow(row.id, { signatureImageUrl: url?.trim() || null });
      announceInsChange();
      toast.ok(
        "E-signature uploaded",
        `It will print on ${row.name || "their"} INS line.`,
      );
    } catch (e) {
      toast.fail(e, "Could not upload the e-signature");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: ChairpersonSignatureRow) {
    setBusyId(row.id);
    try {
      await doiApi.clearChairpersonSignature(row.id);
      patchRow(row.id, { signatureImageUrl: null });
      announceInsChange();
      toast.ok("E-signature removed");
    } catch (e) {
      toast.fail(e, "Could not remove the e-signature");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-600">
        Upload a transparent PNG or JPG (max 2 MB) for each chairperson. It
        prints on their line of the INS forms. Chairpersons can still change it
        from their own profile.
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, program or area"
        className="w-full max-w-sm rounded-md border border-black/15 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#780301]/30"
      />

      {loadError ? <p className="text-xs text-red-700">{loadError}</p> : null}

      {rows === null ? (
        <p className="text-sm text-black/50">Loading chairpersons…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-black/50">
          {rows.length === 0
            ? "No chairpersons yet. Create them in Chairperson Assignment."
            : "No chairperson matches."}
        </p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
          {filtered.map((row) => {
            const busy = busyId === row.id;
            const editing = editingId === row.id;
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  {editing ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveName(row);
                      }}
                    >
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        maxLength={120}
                        disabled={busy}
                        aria-label={`Name of ${row.email}`}
                        className="min-w-0 flex-1 rounded-md border border-black/15 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#780301]/30"
                      />
                      <Button type="submit" size="sm" disabled={busy}>
                        {busy ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-black/85">
                        {row.name || "(no name)"}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-medium text-[#780301] hover:underline disabled:opacity-50"
                        disabled={busy || editingId !== null}
                        onClick={() => {
                          setEditingId(row.id);
                          setDraftName(row.name);
                        }}
                      >
                        Edit name
                      </button>
                    </div>
                  )}
                  <p className="truncate text-xs text-black/55">
                    {ROLE_LABEL[row.role]}
                    {row.assignment ? ` · ${row.assignment}` : ""} · {row.email}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex h-14 w-40 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-50">
                    {row.signatureImageUrl ? (
                      // eslint-disable-next-line no-restricted-syntax
                      <img
                        src={row.signatureImageUrl}
                        alt={`E-signature of ${row.name}`}
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[11px] text-gray-400">
                        No signature
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      ref={(el) => {
                        fileInputs.current[row.id] = el;
                      }}
                      type="file"
                      accept={ACCEPT}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void upload(row, f);
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => fileInputs.current[row.id]?.click()}
                    >
                      {busy
                        ? "Working…"
                        : row.signatureImageUrl
                          ? "Replace"
                          : "Upload"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || !row.signatureImageUrl}
                      onClick={() => void remove(row)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
