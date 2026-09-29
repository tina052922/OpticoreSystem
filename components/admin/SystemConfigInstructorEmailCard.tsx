"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { systemConfigApi, ApiClientError } from "@/lib/api/client";
import { notifySystemConfigurationSaved } from "@/contexts/SystemConfigurationContext";
import {
  BUILT_IN_INSTRUCTOR_DOMAINS,
  DEFAULT_INSTRUCTOR_EMAIL_POLICY,
  INSTRUCTOR_INSTITUTIONAL_DOMAIN,
  INSTRUCTOR_PUBLIC_DOMAIN,
  enabledInstructorDomains,
  instructorEmailDomainHint,
  normalizeEmailDomain,
  parseInstructorEmailPolicy,
  type InstructorEmailDomainRule,
  type InstructorEmailPolicy,
} from "@/lib/system-configuration/instructor-email-policy";

/** One-line explanation per built-in domain, so the choice is not made blind. */
const DOMAIN_NOTES: Record<string, string> = {
  [INSTRUCTOR_INSTITUTIONAL_DOMAIN]:
    "Institutional mailboxes. Only CTU can issue one, so the address itself is evidence the applicant works here. Subdomains such as @cs.ctu.edu.ph are included.",
  [INSTRUCTOR_PUBLIC_DOMAIN]:
    "Personal Gmail. Anyone can create one, so approval rests entirely on the emailed code and your chairman's review. Turn this on if faculty do not have institutional mailboxes yet.",
};

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-[#780301]" : "bg-black/20"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

/**
 * Which email domains instructor sign-up accepts (/register/instructor).
 *
 * DOI-only. The domain used to be hardcoded to @ctu.edu.ph, which locks out any campus that has not
 * issued institutional mailboxes yet. Saved values are enforced server-side on every sign-up; this
 * page only decides the rule.
 */
export function SystemConfigInstructorEmailCard() {
  const [draft, setDraft] = useState<InstructorEmailPolicy>(DEFAULT_INSTRUCTOR_EMAIL_POLICY);
  const [saved, setSaved] = useState<InstructorEmailPolicy>(DEFAULT_INSTRUCTOR_EMAIL_POLICY);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { config } = await systemConfigApi.get({ forceRefresh: true });
      const policy = parseInstructorEmailPolicy(config.instructorEmailPolicy);
      setDraft(policy);
      setSaved(policy);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not load the sign-up email rule.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const enabled = enabledInstructorDomains(draft);
  // Mirrors the server rule: a policy with nothing on would shut sign-up completely.
  const noneEnabled = enabled.length === 0;

  function setEnabled(domain: string, next: boolean) {
    setMsg(null);
    setError(null);
    setDraft((d) => ({
      domains: d.domains.map((row) => (row.domain === domain ? { ...row, enabled: next } : row)),
    }));
  }

  function addDomain() {
    setMsg(null);
    const domain = normalizeEmailDomain(newDomain);
    if (!domain) {
      setError("Enter a domain like ctu.edu.ph — no @, no spaces.");
      return;
    }
    if (draft.domains.some((d) => d.domain === domain)) {
      setError(`${domain} is already on the list.`);
      return;
    }
    setError(null);
    setDraft((d) => ({ domains: [...d.domains, { domain, enabled: true }] }));
    setNewDomain("");
  }

  function removeDomain(domain: string) {
    setMsg(null);
    setError(null);
    setDraft((d) => ({ domains: d.domains.filter((row) => row.domain !== domain) }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const { config } = await systemConfigApi.update({ instructorEmailPolicy: draft });
      const policy = parseInstructorEmailPolicy(config.instructorEmailPolicy);
      setDraft(policy);
      setSaved(policy);
      notifySystemConfigurationSaved("instructorEmailPolicy");
      setMsg(`Saved. Instructor sign-up now accepts ${instructorEmailDomainHint(policy)}.`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not save the sign-up email rule.");
    } finally {
      setSaving(false);
    }
  }

  const isBuiltIn = (domain: string) => BUILT_IN_INSTRUCTOR_DOMAINS.includes(domain);

  return (
    <div className="space-y-4">
      <p className="text-sm text-black/65 leading-relaxed">
        Turn on the email domains faculty may use at{" "}
        <span className="font-medium">Register → Instructor</span>. An address outside every domain
        you turn on is refused before any code is sent.
      </p>

      {loading ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : (
        <>
          <ul className="divide-y divide-black/[0.07] rounded-xl border border-black/10">
            {draft.domains.map((row: InstructorEmailDomainRule) => (
              <li key={row.domain} className="flex items-start gap-3 p-3">
                <Toggle
                  checked={row.enabled}
                  label={`Accept @${row.domain}`}
                  onChange={(next) => setEnabled(row.domain, next)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">@{row.domain}</span>
                    {row.enabled ? (
                      <span className="rounded-full bg-[#780301]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#780301]">
                        Accepted
                      </span>
                    ) : (
                      <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/45">
                        Off
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-black/55">
                    {DOMAIN_NOTES[row.domain] ?? "Added for this campus. Subdomains are included."}
                  </p>
                </div>
                {isBuiltIn(row.domain) ? null : (
                  <button
                    type="button"
                    aria-label={`Remove ${row.domain}`}
                    className="rounded p-1.5 text-black/40 hover:bg-black/[0.05] hover:text-[#780301]"
                    onClick={() => removeDomain(row.domain)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-black/75" htmlFor="new-instructor-domain">
              Add another domain
            </label>
            <div className="flex gap-2">
              <Input
                id="new-instructor-domain"
                value={newDomain}
                placeholder="ctu.edu"
                autoComplete="off"
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDomain();
                  }
                }}
              />
              <Button type="button" variant="outline" className="shrink-0" onClick={addDomain}>
                <Plus className="mr-1 h-4 w-4" aria-hidden />
                Add
              </Button>
            </div>
            <p className="text-[11px] text-black/50">
              For a campus whose mailboxes sit on a different domain.
            </p>
          </div>

          {noneEnabled ? (
            <p className="rounded-lg border border-[#780301]/25 bg-[#780301]/[0.06] px-3 py-2 text-[12px] text-[#780301]">
              Turn on at least one domain — with all of them off, nobody could register as an
              instructor.
            </p>
          ) : (
            <p className="text-[12px] text-black/60">
              Sign-up will accept <span className="font-semibold">{instructorEmailDomainHint(draft)}</span>.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="bg-[#780301] hover:bg-[#5a0201] text-white"
              disabled={saving || !dirty || noneEnabled}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save sign-up domains"}
            </Button>
            {dirty ? (
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setDraft(saved);
                  setNewDomain("");
                  setError(null);
                  setMsg(null);
                }}
              >
                Discard
              </Button>
            ) : null}
            {msg ? <p className="text-[12px] text-black/70">{msg}</p> : null}
            {error ? <p className="text-[12px] text-[#780301]">{error}</p> : null}
          </div>
        </>
      )}
    </div>
  );
}
