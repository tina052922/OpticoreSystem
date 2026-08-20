"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, campusInsSettingsApi, collegeApi } from "@/lib/api/client";
import type { CollegeInsSignerDisplay } from "@/types/db";

export const INS_SIGNATORY_SLOT_DEFS: { key: string; label: string }[] = [
  { key: "approved", label: "VPAA / DOI (approved by)" },
  { key: "campus", label: "Campus Director" },
  { key: "dean", label: "Dean" },
  { key: "review", label: "Program Chairman" },
  { key: "contract", label: "Contract signatory" },
  { key: "prepared", label: "College Admin (prepared by)" },
];

type Props = {
  mode: "college" | "doi";
  collegeId?: string | null;
  onUpdated?: () => void;
  layout?: "default" | "config";
};

export function InsSignerLabelsEditor({ mode, collegeId, onUpdated, layout = "default" }: Props) {
  const [display, setDisplay] = useState<CollegeInsSignerDisplay>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      if (mode === "doi") {
        const data = await apiFetch<{ settings: { insSignerDisplay?: CollegeInsSignerDisplay | null } }>(
          "/api/catalog/campus-ins-settings",
          { method: "GET" },
        );
        setDisplay((data.settings?.insSignerDisplay ?? {}) as CollegeInsSignerDisplay);
      } else if (collegeId) {
        const data = await collegeApi.getSignerSettings({ collegeId });
        setDisplay((data.settings?.insSignerDisplay ?? {}) as CollegeInsSignerDisplay);
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
    try {
      if (mode === "doi") {
        await campusInsSettingsApi.upsert({ insSignerDisplay: display });
      } else {
        if (!collegeId) throw new Error("College scope required.");
        await collegeApi.patchSignerSettings({ collegeId, insSignerDisplay: display });
      }
      setMsg("Saved.");
      onUpdated?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const keys =
    mode === "doi"
      ? INS_SIGNATORY_SLOT_DEFS.filter((s) => s.key === "approved" || s.key === "campus")
      : INS_SIGNATORY_SLOT_DEFS.filter((s) => s.key !== "approved");

  if (mode === "college" && !collegeId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/80 px-3 py-2 text-xs text-gray-600 no-print">
        College scope required.
      </div>
    );
  }

  const fields = (
    <>
      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {keys.map(({ key, label }) => (
            <div key={key} className="rounded-lg border border-black/10 bg-black/[0.02] p-3 space-y-2">
              <p className="text-sm font-semibold text-[#780301]">{label}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-black/75">
                  Name
                  <input
                    className="mt-1 w-full h-9 rounded-lg border border-black/20 px-2 text-sm"
                    value={display[key]?.signerName ?? ""}
                    onChange={(e) => patchKey(key, "signerName", e.target.value)}
                    placeholder="Printed name"
                  />
                </label>
                <label className="text-xs text-black/75">
                  Title
                  <input
                    className="mt-1 w-full h-9 rounded-lg border border-black/20 px-2 text-sm"
                    value={display[key]?.lineSubtitle ?? ""}
                    onChange={(e) => patchKey(key, "lineSubtitle", e.target.value)}
                    placeholder="Official title / role line"
                  />
                </label>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="bg-[#780301] hover:bg-[#5a0201] text-white"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save signatories"}
            </Button>
            {msg ? <span className="text-sm text-emerald-800">{msg}</span> : null}
          </div>
        </div>
      )}
    </>
  );

  if (layout === "config") {
    return <div className="no-print">{fields}</div>;
  }

  return (
    <details className="no-print rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
      <summary className="cursor-pointer font-semibold text-gray-800">INS print — signer names & titles</summary>
      <div className="mt-3">{fields}</div>
    </details>
  );
}
