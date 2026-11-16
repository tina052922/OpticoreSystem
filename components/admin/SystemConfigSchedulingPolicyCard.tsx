"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { systemConfigApi } from "@/lib/api/client";
import {
  notifySystemConfigurationSaved,
  useSystemConfigurationOptional,
} from "@/contexts/SystemConfigurationContext";
import {
  DEFAULT_SCHEDULING_POLICY,
  mergeSchedulingPolicyDraft,
  type SchedulingPolicyConfig,
} from "@/lib/system-configuration/scheduling-policy";
import { useActionToast } from "@/components/alerts/useActionToast";

/** The four caps this card edits, with their fallbacks. */
const FIELDS = [
  {
    key: "standardWeeklyTeachingHours",
    label: "Maximum hours per week for resident",
    hint: "Resident teaching load cap (e.g. 24).",
    fallback: 24,
  },
  {
    key: "parttimeMaxWeeklyHours",
    label: "Maximum hours per week for non-resident",
    hint: "Part-time / non-resident weekly teaching cap.",
    fallback: 27,
  },
  {
    key: "maxWeeklyNonResidentPrepsWithoutJustification",
    label: "Maximum preps for non-resident",
    hint: "Max distinct subject preparations allowed without justification.",
    fallback: 3,
  },
  {
    key: "maxWeeklyResidentPrepsWithoutJustification",
    label: "Maximum preps for resident",
    hint: "Max distinct subject preparations allowed without justification.",
    fallback: 3,
  },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type Drafts = Record<FieldKey, string>;

const MAX_VALUE = 60;

function draftsFrom(policy: SchedulingPolicyConfig): Drafts {
  const out = {} as Drafts;
  for (const f of FIELDS) out[f.key] = String(policy[f.key] ?? f.fallback);
  return out;
}

/** Why a typed value cannot be saved, or null. */
function fieldError(raw: string): string | null {
  const t = raw.trim();
  if (!t) return "Enter a number.";
  if (!/^\d+$/.test(t)) return "Whole numbers only.";
  const n = Number(t);
  if (n < 1) return "Must be at least 1.";
  if (n > MAX_VALUE) return `Must be ${MAX_VALUE} or less.`;
  return null;
}

/**
 * Campus-wide faculty load limits (DOI Admin and College Admin). Saved values flow to the Subject
 * Scheduler, GEC, the faculty portal and Campus Intelligence via {@link notifySystemConfigurationSaved}.
 *
 * The fields used to be impossible to edit: a number box that ignored anything but a positive number
 * could not be cleared to type a new value, and the form was re-copied from the saved settings on
 * every context update — so edits were undone and "Save load limits" never enabled. Values are now
 * plain text while typing, checked on save, and the form only refreshes from the saved settings when
 * those settings actually change and nobody is editing.
 */
export function SystemConfigSchedulingPolicyCard() {
  const ctx = useSystemConfigurationOptional();
  const toast = useActionToast();
  const [saving, setSaving] = useState(false);

  // Depend on the two values, not the context object (which changes whenever anything reloads).
  const savedPolicy = ctx?.schedulingPolicy;
  const policyConstants = ctx?.policyConstants;
  const baseline = useMemo(
    () =>
      policyConstants
        ? mergeSchedulingPolicyDraft(savedPolicy, policyConstants)
        : { ...DEFAULT_SCHEDULING_POLICY },
    [savedPolicy, policyConstants],
  );
  const baselineDrafts = useMemo(() => draftsFrom(baseline), [baseline]);
  const baselineKey = JSON.stringify(baselineDrafts);

  const [drafts, setDrafts] = useState<Drafts>(baselineDrafts);
  const editingRef = useRef(false);

  // Follow the saved settings when they change — but never while the user is editing.
  useEffect(() => {
    if (editingRef.current) return;
    setDrafts(JSON.parse(baselineKey) as Drafts);
  }, [baselineKey]);

  const errors = useMemo(() => {
    const out = {} as Record<FieldKey, string | null>;
    for (const f of FIELDS) out[f.key] = fieldError(drafts[f.key]);
    return out;
  }, [drafts]);
  const hasErrors = FIELDS.some((f) => errors[f.key]);
  const dirty = FIELDS.some((f) => drafts[f.key].trim() !== baselineDrafts[f.key]);

  function setField(key: FieldKey, value: string) {
    editingRef.current = true;
    // Digits only: the caps are whole numbers.
    setDrafts((d) => ({ ...d, [key]: value.replace(/[^\d]/g, "").slice(0, 3) }));
  }

  function reset() {
    editingRef.current = false;
    setDrafts(baselineDrafts);
  }

  async function save() {
    if (hasErrors) {
      toast.refuse("Check the load limits", "Each value must be a whole number from 1 to 60.");
      return;
    }
    const next: SchedulingPolicyConfig = { ...baseline };
    for (const f of FIELDS) next[f.key] = Number(drafts[f.key].trim());
    setSaving(true);
    try {
      await systemConfigApi.update({ schedulingPolicy: next });
      editingRef.current = false;
      notifySystemConfigurationSaved("schedulingPolicy");
      await ctx?.reload();
      toast.ok(
        "Load limits updated successfully",
        "The Subject Scheduler, GEC, the faculty portal and Campus Intelligence will pick them up.",
      );
    } catch (e) {
      toast.fail(e, "Could not save the load limits", "system config: scheduling policy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-black/65 leading-relaxed">
        These caps drive teaching-load checks, overload justification prompts, and Campus Intelligence
        full/overloaded bands. Day and Evening programs are evaluated separately — hours are never
        summed across modes for overload.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => {
          const err = errors[f.key];
          const id = `load-limit-${f.key}`;
          return (
            <label key={f.key} htmlFor={id} className="block space-y-1">
              <span className="text-[12px] font-semibold text-black/75">{f.label}</span>
              <Input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={`tabular-nums ${err ? "border-red-400 bg-red-50/60" : ""}`}
                value={drafts[f.key]}
                aria-invalid={Boolean(err)}
                disabled={saving}
                onChange={(e) => setField(f.key, e.target.value)}
              />
              {err ? (
                <span className="block text-[11px] font-medium text-red-700">{err}</span>
              ) : (
                <span className="block text-[11px] leading-snug text-black/50">{f.hint}</span>
              )}
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="bg-[#780301] hover:bg-[#5a0201] text-white"
          disabled={saving || hasErrors}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save load limits"}
        </Button>
        {dirty && !saving ? (
          <Button type="button" variant="outline" onClick={reset}>
            Reset
          </Button>
        ) : null}
        <span className="text-[12px] text-black/50">
          {dirty ? "You have unsaved changes." : "Saved values are shown."}
        </span>
      </div>
    </div>
  );
}
