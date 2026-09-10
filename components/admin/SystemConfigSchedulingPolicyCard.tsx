"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { systemConfigApi, ApiClientError } from "@/lib/api/client";
import {
  notifySystemConfigurationSaved,
  useSystemConfigurationOptional,
} from "@/contexts/SystemConfigurationContext";
import {
  DEFAULT_SCHEDULING_POLICY,
  mergeSchedulingPolicyDraft,
  type SchedulingPolicyConfig,
} from "@/lib/system-configuration/scheduling-policy";

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[12px] font-semibold text-black/75">{label}</span>
      <Input
        type="number"
        min={1}
        step={1}
        className="tabular-nums"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n) && n > 0) onChange(Math.round(n));
        }}
      />
      {hint ? <span className="text-[11px] text-black/50 leading-snug block">{hint}</span> : null}
    </label>
  );
}

/**
 * Campus-wide faculty load limits. Saved values flow to Evaluator, GEC, faculty portal,
 * and Campus Intelligence via {@link notifySystemConfigurationSaved}.
 */
export function SystemConfigSchedulingPolicyCard() {
  const ctx = useSystemConfigurationOptional();
  const [draft, setDraft] = useState<SchedulingPolicyConfig>(DEFAULT_SCHEDULING_POLICY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ctx) return;
    setDraft(mergeSchedulingPolicyDraft(ctx.schedulingPolicy, ctx.policyConstants));
  }, [ctx?.schedulingPolicy, ctx?.policyConstants, ctx]);

  const dirty = useMemo(() => {
    if (!ctx) return false;
    const baseline = mergeSchedulingPolicyDraft(ctx.schedulingPolicy, ctx.policyConstants);
    return JSON.stringify(baseline) !== JSON.stringify(draft);
  }, [ctx, draft]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await systemConfigApi.update({ schedulingPolicy: draft });
      notifySystemConfigurationSaved("schedulingPolicy");
      await ctx?.reload();
      setMsg("Load limits saved. Connected Evaluator, GEC, faculty portal, and Campus Intelligence pages will refresh.");
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : "Could not save scheduling policy");
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
        <Field
          label="Maximum hours per week for resident"
          hint="Resident teaching load cap (e.g. 24)."
          value={draft.standardWeeklyTeachingHours ?? 24}
          onChange={(n) => setDraft((d) => ({ ...d, standardWeeklyTeachingHours: n }))}
        />
        <Field
          label="Maximum hours per week for non-resident"
          hint="Part-time / non-resident weekly teaching cap."
          value={draft.parttimeMaxWeeklyHours ?? 27}
          onChange={(n) => setDraft((d) => ({ ...d, parttimeMaxWeeklyHours: n }))}
        />
        <Field
          label="Maximum preps for non-resident"
          hint="Max distinct subject preparations allowed without justification."
          value={draft.maxWeeklyNonResidentPrepsWithoutJustification ?? 3}
          onChange={(n) =>
            setDraft((d) => ({ ...d, maxWeeklyNonResidentPrepsWithoutJustification: n }))
          }
        />
        <Field
          label="Max weekly lab contact hours"
          value={draft.maxWeeklyLabContactHours ?? 36}
          onChange={(n) => setDraft((d) => ({ ...d, maxWeeklyLabContactHours: n }))}
        />
        <Field
          label="Max weekly lecture overload track"
          value={draft.maxWeeklyLectureOverloadHours ?? 30}
          onChange={(n) => setDraft((d) => ({ ...d, maxWeeklyLectureOverloadHours: n }))}
        />
        <Field
          label="Heavy overload — resident"
          value={draft.maxWeeklyResidentContactHours ?? 30}
          onChange={(n) => setDraft((d) => ({ ...d, maxWeeklyResidentContactHours: n }))}
        />
        <Field
          label="Heavy overload — non-resident"
          value={draft.maxWeeklyNonResidentContactHours ?? 30}
          onChange={(n) => setDraft((d) => ({ ...d, maxWeeklyNonResidentContactHours: n }))}
        />
        <Field
          label="Maximum preps for resident"
          hint="Max distinct subject preparations allowed without justification."
          value={draft.maxWeeklyResidentPrepsWithoutJustification ?? 3}
          onChange={(n) =>
            setDraft((d) => ({ ...d, maxWeeklyResidentPrepsWithoutJustification: n }))
          }
        />
        <Field
          label="Default max faculty hours (GA / suggestions)"
          hint="Soft cap used by conflict suggestions."
          value={draft.defaultMaxFacultyHoursPerWeek ?? 24}
          onChange={(n) => setDraft((d) => ({ ...d, defaultMaxFacultyHoursPerWeek: n }))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="bg-[#780301] hover:bg-[#5a0201] text-white"
          disabled={saving || !dirty}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save load limits"}
        </Button>
        {msg ? <p className="text-[12px] text-black/70">{msg}</p> : null}
      </div>
    </div>
  );
}
