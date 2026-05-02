"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CollegeInsSignerDisplay } from "@/types/db";

const SLOT_META: { key: string; label: string }[] = [
  { key: "approved", label: "Approved by (VPAA / DOI)" },
  { key: "campus", label: "Campus Director" },
  { key: "review", label: "Program / GEC Chairman" },
  { key: "contract", label: "Contract" },
  { key: "prepared", label: "College Admin (prepared by)" },
];

type Props = {
  mode: "college" | "doi";
  /** Required for college mode — which `College` row to update. */
  collegeId?: string | null;
  onUpdated?: () => void;
};

/**
 * College Admin: edit printed INS signer labels for their college.
 * DOI Admin: edit campus-wide VPAA line (`CampusInsSettings.insSignerDisplay`).
 */
export function InsSignerLabelsEditor({ mode, collegeId, onUpdated }: Props) {
  const [display, setDisplay] = useState<CollegeInsSignerDisplay>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
        setMsg("Connection is not configured.");
      setLoading(false);
      return;
    }
    try {
      if (mode === "doi") {
        const { data, error } = await supabase.from("CampusInsSettings").select("insSignerDisplay").eq("id", "default").maybeSingle();
        if (error) throw new Error(error.message);
        setDisplay(((data as { insSignerDisplay?: CollegeInsSignerDisplay | null })?.insSignerDisplay ?? {}) as CollegeInsSignerDisplay);
      } else if (collegeId) {
        const { data, error } = await supabase.from("College").select("insSignerDisplay").eq("id", collegeId).maybeSingle();
        if (error) throw new Error(error.message);
        setDisplay(((data as { insSignerDisplay?: CollegeInsSignerDisplay | null })?.insSignerDisplay ?? {}) as CollegeInsSignerDisplay);
      } else {
        setDisplay({});
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [mode, collegeId]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchKey(key: string, field: "signerName" | "lineSubtitle", value: string) {
    setDisplay((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [field]: value },
    }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
        setMsg("Connection is not configured.");
      setSaving(false);
      return;
    }
    try {
      if (mode === "doi") {
        const { error } = await supabase.from("CampusInsSettings").update({ insSignerDisplay: display }).eq("id", "default");
        if (error) throw new Error(error.message);
      } else {
        if (!collegeId) throw new Error("College scope required.");
        const { error } = await supabase.from("College").update({ insSignerDisplay: display }).eq("id", collegeId);
        if (error) throw new Error(error.message);
      }
      setMsg("Saved.");
      onUpdated?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const keys = mode === "doi" ? SLOT_META.filter((s) => s.key === "approved") : SLOT_META.filter((s) => s.key !== "approved");

  if (mode === "college" && !collegeId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/80 px-3 py-2 text-xs text-gray-600 no-print">
        Select a faculty member to resolve the college before editing INS print signer labels.
      </div>
    );
  }

  return (
    <details className="no-print rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
      <summary className="cursor-pointer font-semibold text-gray-800">INS print — signer names & titles</summary>
      <p className="mt-2 text-xs text-gray-600">
        {mode === "doi"
          ? "Campus-wide line for VPAA / DOI approval on printed INS forms."
          : "Overrides apply to this college’s printed INS forms. Leave blank to use roster defaults after VPAA publishes."}
      </p>
      {loading ? (
        <p className="mt-2 text-xs text-gray-500">Loading…</p>
      ) : (
        <div className="mt-3 space-y-3">
          {keys.map(({ key, label }) => (
            <div key={key} className="grid gap-1 sm:grid-cols-2">
              <div className="text-xs font-medium text-gray-700 sm:col-span-2">{label}</div>
              <label className="text-[11px] text-gray-600">
                Title / role line
                <input
                  className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs"
                  value={display[key]?.lineSubtitle ?? ""}
                  onChange={(e) => patchKey(key, "lineSubtitle", e.target.value)}
                  placeholder="(optional)"
                />
              </label>
              <label className="text-[11px] text-gray-600">
                Signer name (printed)
                <input
                  className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs"
                  value={display[key]?.signerName ?? ""}
                  onChange={(e) => patchKey(key, "signerName", e.target.value)}
                  placeholder="(optional)"
                />
              </label>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" size="sm" className="bg-[#780301] hover:bg-[#5a0201] text-white" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save labels"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void load()}>
              Reload
            </Button>
            {msg ? <span className="text-xs text-gray-600">{msg}</span> : null}
          </div>
        </div>
      )}
    </details>
  );
}
