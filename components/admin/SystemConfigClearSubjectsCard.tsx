"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, ApiClientError } from "@/lib/api/client";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";

const CONFIRM_PHRASE = "CLEAR SUBJECTS";

/**
 * DOI System Configuration — wipe subjects + schedule for clean retests.
 * Rooms / buildings are never deleted.
 */
export function SystemConfigClearSubjectsCard() {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onClear() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const data = await adminApi.clearSubjectsAndSchedule(CONFIRM_PHRASE);
      const d = data.deleted;
      setMsg(
        `Cleared ${d.subjects} subjects, ${d.scheduleEntries} schedule rows, ${d.scheduleLoadJustifications} justifications, ${d.doiFinalizations} DOI locks. Rooms kept.`,
      );
      setConfirm("");
      dispatchInsCatalogReload();
    } catch (e) {
      setErr(e instanceof ApiClientError || e instanceof Error ? e.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/40 p-4">
      <p className="text-sm text-black/75 leading-relaxed">
        For retesting plotting and Subject Codes from a clean slate. Deletes{" "}
        <strong>all DB subjects</strong>, <strong>schedule entries</strong>, load justifications, and DOI
        publish locks. Does <strong>not</strong> delete rooms, buildings, colleges, programs, sections, or
        users.
      </p>
      <label className="block text-xs font-medium text-black/70">
        Type <span className="font-mono text-red-800">{CONFIRM_PHRASE}</span> to confirm
        <Input
          className="mt-1 max-w-md bg-white"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={CONFIRM_PHRASE}
          autoComplete="off"
        />
      </label>
      <Button
        type="button"
        variant="outline"
        className="border-red-400 text-red-900 bg-white hover:bg-red-50"
        disabled={busy || confirm.trim() !== CONFIRM_PHRASE}
        onClick={() => {
          if (
            !window.confirm(
              "Clear all subjects and schedule data campus-wide? Rooms will be kept. This cannot be undone.",
            )
          ) {
            return;
          }
          void onClear();
        }}
      >
        {busy ? "Clearing…" : "Clear subjects & schedule"}
      </Button>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
    </div>
  );
}
