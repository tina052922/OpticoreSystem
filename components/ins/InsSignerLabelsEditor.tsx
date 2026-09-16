"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, campusInsSettingsApi, collegeApi } from "@/lib/api/client";
import { notifySystemConfigurationSaved } from "@/contexts/SystemConfigurationContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  insSignerSlotKeyForRole,
  withProfileSignerAutofill,
} from "@/lib/ins/signer-profile-autofill";
import type { CollegeInsSignerDisplay } from "@/types/db";

/**
 * Row definitions for the "INS form signatories" editor.
 *
 * How this flows onto the printed 3-line INS block
 * (`lib/ins/ins-pdf-adapters.ts` → `resolveInsPrintedSigners`):
 *   - "Prepared by (Program Coordinator/Chair)" prints the Program Chairman's
 *     own account name + their profile signature image (uploaded on
 *     /chairman/profile). It is NOT sourced from this editor — an admin
 *     cannot rename a chairman on official forms from here. The `prepared`
 *     row below is the fallback used only when no chairman is resolved.
 *   - "Reviewed, Certified True and Correct: Director/Dean" → `approved` (DOI),
 *     `dean` used only as a name override when DOI is blank.
 *   - "Approved: Campus Director"                       → `campus` slot.
 *
 * The `review` slot still exists on the on-screen 6-slot strip for display
 * overrides (subtitle changes, etc.), but it never overrides the printed
 * Prepared line — hence no editor row for it here.
 */
export const INS_SIGNATORY_SLOT_DEFS: { key: string; label: string; hint?: string }[] = [
  { key: "approved", label: "VPAA / DOI (Reviewed — Director/Dean e-sig)" },
  { key: "campus", label: "Campus Director (Approved)" },
  { key: "dean", label: "Dean (Reviewed name override)" },
  { key: "contract", label: "Contract signatory" },
  {
    key: "prepared",
    label: "College Admin (Prepared by — fallback)",
    hint:
      "Printed under 'Prepared by (Program Coordinator/Chair)' ONLY when no Program Chairman is resolved for the college/program on the form. When a chairman exists, their own account name and profile signature print instead — this row is ignored. The electronic signature image is uploaded in the 'College Admin electronic signature' card below.",
  },
];

type Props = {
  mode: "college" | "doi";
  collegeId?: string | null;
  onUpdated?: () => void;
  layout?: "default" | "config";
};

export function InsSignerLabelsEditor({ mode, collegeId, onUpdated, layout = "default" }: Props) {
  const { user, loading: userLoading } = useCurrentUser();
  const [display, setDisplay] = useState<CollegeInsSignerDisplay>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const profileSlot = insSignerSlotKeyForRole(user?.role);
  const profileName = (user?.name ?? "").trim();

  const load = useCallback(async () => {
    if (userLoading) return;
    setLoading(true);
    setMsg(null);
    try {
      let loaded: CollegeInsSignerDisplay = {};
      if (mode === "doi") {
        const data = await apiFetch<{ settings: { insSignerDisplay?: CollegeInsSignerDisplay | null } }>(
          "/api/catalog/campus-ins-settings",
          { method: "GET" },
        );
        loaded = (data.settings?.insSignerDisplay ?? {}) as CollegeInsSignerDisplay;
      } else if (collegeId) {
        const data = await collegeApi.getSignerSettings({ collegeId });
        loaded = (data.settings?.insSignerDisplay ?? {}) as CollegeInsSignerDisplay;
      }
      setDisplay(
        withProfileSignerAutofill(loaded, {
          role: user?.role,
          name: user?.name,
        }) as CollegeInsSignerDisplay,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [mode, collegeId, userLoading, user?.role, user?.name]);

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
      notifySystemConfigurationSaved(mode === "doi" ? "insSigners" : "collegeSigners");
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
          {keys.map(({ key, label, hint }) => {
            const isProfileSlot = profileSlot === key && Boolean(profileName);
            return (
              <div key={key} className="rounded-lg border border-black/10 bg-black/[0.02] p-3 space-y-2">
                <p className="text-sm font-semibold text-[#780301]">{label}</p>
                {hint ? (
                  <p className="text-[11px] leading-snug text-black/60">{hint}</p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-black/75">
                    Name
                    <input
                      className="mt-1 w-full h-9 rounded-lg border border-black/20 px-2 text-sm"
                      value={display[key]?.signerName ?? ""}
                      onChange={(e) => patchKey(key, "signerName", e.target.value)}
                      placeholder={isProfileSlot ? profileName : "Printed name"}
                      aria-describedby={isProfileSlot ? `${key}-name-hint` : undefined}
                    />
                    {isProfileSlot ? (
                      <p id={`${key}-name-hint`} className="mt-1 text-[11px] text-black/50">
                        Prefills from your profile ({profileName}). Editable — clear to leave blank.
                      </p>
                    ) : null}
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
            );
          })}
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
