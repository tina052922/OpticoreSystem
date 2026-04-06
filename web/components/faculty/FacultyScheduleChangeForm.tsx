"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Request a teaching schedule adjustment; routes to chairman workflow inbox (same college).
 */
export function FacultyScheduleChangeForm() {
  const [subjectCode, setSubjectCode] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [currentSlot, setCurrentSlot] = useState("");
  const [requestedSlot, setRequestedSlot] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/faculty/schedule-change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subjectCode,
          sectionName,
          currentSlot,
          requestedSlot,
          reason,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-6 text-emerald-950">
        <p className="font-semibold text-base mb-1">Request sent</p>
        <p className="text-sm text-emerald-900/90 leading-relaxed">
          Your schedule change request was delivered to the Chairman workflow inbox for your college. You may be contacted for
          clarification. Check with your department if you need a faster response.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 border-emerald-300"
          onClick={() => {
            setDone(false);
            setReason("");
          }}
        >
          Submit another request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <p className="text-sm text-black/65 leading-relaxed">
        Describe the change you need (e.g. day/time conflict, room issue). Requests are reviewed by the{" "}
        <strong>Chairman</strong> for your program/college.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-black" htmlFor="sc-subject">
            Subject code
          </label>
          <Input
            id="sc-subject"
            placeholder="e.g. CC-214"
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
            className="h-11 border-black/15"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-black" htmlFor="sc-section">
            Section
          </label>
          <Input
            id="sc-section"
            placeholder="e.g. BSIT-2A"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            className="h-11 border-black/15"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-black" htmlFor="sc-current">
            Current schedule (day / time)
          </label>
          <Input
            id="sc-current"
            placeholder="e.g. Monday 10:00–11:00"
            value={currentSlot}
            onChange={(e) => setCurrentSlot(e.target.value)}
            className="h-11 border-black/15"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-black" htmlFor="sc-requested">
            Requested schedule
          </label>
          <Input
            id="sc-requested"
            placeholder="e.g. Wednesday 1:00–2:00"
            value={requestedSlot}
            onChange={(e) => setRequestedSlot(e.target.value)}
            className="h-11 border-black/15"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-black" htmlFor="sc-reason">
          Reason <span className="text-red-700">*</span>
        </label>
        <textarea
          id="sc-reason"
          required
          minLength={8}
          rows={5}
          placeholder="Explain why the change is needed (conflict, health, institutional directive, etc.)."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-opticore-orange)]/40"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      ) : null}

      <Button
        type="submit"
        disabled={submitting}
        className="bg-[var(--color-opticore-orange)] hover:bg-[#e88909] text-white font-semibold px-8"
      >
        {submitting ? "Sending…" : "Submit request"}
      </Button>
    </form>
  );
}
