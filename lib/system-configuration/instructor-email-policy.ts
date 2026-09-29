/**
 * Which email domains may register as an instructor.
 *
 * Until now this was the hardcoded constant `ctu.edu.ph`, and the reasoning behind it still holds:
 * an institutional mailbox is strong evidence of employment, because only CTU can issue one. A
 * campus that has not rolled those mailboxes out cannot use the system at all under that rule, so
 * DOI now chooses the domains from System Configuration.
 *
 * Enabling a public domain such as gmail.com deliberately gives up the employment signal. What still
 * stands between a stranger and an instructor account is the emailed OTP (proves they own the
 * mailbox) and chairman approval (proves which person it is) — the approval step carries the weight
 * the domain used to.
 *
 * Mirrored from `opticore-backend/src/lib/instructor-email-policy.ts`; the two files are kept
 * identical on purpose so the browser pre-validates exactly what the server will decide. The server
 * re-checks every sign-up — this copy is a convenience, never the authority.
 */

export const INSTRUCTOR_INSTITUTIONAL_DOMAIN = "ctu.edu.ph";
export const INSTRUCTOR_PUBLIC_DOMAIN = "gmail.com";

export type InstructorEmailDomainRule = {
  domain: string;
  enabled: boolean;
};

export type InstructorEmailPolicy = {
  domains: InstructorEmailDomainRule[];
};

/** What a campus gets before DOI touches anything: the rule that was hardcoded. */
export const DEFAULT_INSTRUCTOR_EMAIL_POLICY: InstructorEmailPolicy = {
  domains: [
    { domain: INSTRUCTOR_INSTITUTIONAL_DOMAIN, enabled: true },
    { domain: INSTRUCTOR_PUBLIC_DOMAIN, enabled: false },
  ],
};

/** Rows DOI cannot delete, so the two toggles are always on the page. */
export const BUILT_IN_INSTRUCTOR_DOMAINS: readonly string[] = [
  INSTRUCTOR_INSTITUTIONAL_DOMAIN,
  INSTRUCTOR_PUBLIC_DOMAIN,
];

/**
 * A bare hostname: lowercase, no `@`, no trailing dot, at least one dot, and only the characters a
 * hostname may hold. Returns "" for anything else rather than storing noise that would silently
 * never match an address.
 */
export function normalizeEmailDomain(raw: unknown): string {
  const text = String(raw ?? "").trim().toLowerCase();
  const afterAt = text.includes("@") ? text.slice(text.lastIndexOf("@") + 1) : text;
  const trimmed = afterAt.replace(/\.+$/, "");
  if (!trimmed || trimmed.length > 253) return "";
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(trimmed)) return "";
  return trimmed;
}

function clonePolicy(policy: InstructorEmailPolicy): InstructorEmailPolicy {
  return { domains: policy.domains.map((d) => ({ ...d })) };
}

/** Built-ins first in a fixed order, then anything the campus added, alphabetically. */
function sortDomains(domains: InstructorEmailDomainRule[]): InstructorEmailDomainRule[] {
  const rank = (domain: string) => {
    const i = BUILT_IN_INSTRUCTOR_DOMAINS.indexOf(domain);
    return i === -1 ? BUILT_IN_INSTRUCTOR_DOMAINS.length : i;
  };
  return domains.sort((a, b) => rank(a.domain) - rank(b.domain) || a.domain.localeCompare(b.domain));
}

function readDomainList(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const domains = (raw as { domains?: unknown }).domains;
    if (Array.isArray(domains)) return domains;
  }
  return null;
}

/**
 * Read whatever is in the column into a usable policy.
 *
 * Fails closed: null, malformed JSON, or a list with nothing enabled all come back as the
 * institutional default. A misconfigured row must never be read as "any address may sign up".
 */
export function parseInstructorEmailPolicy(raw: unknown): InstructorEmailPolicy {
  const source = readDomainList(raw);
  if (!source) return clonePolicy(DEFAULT_INSTRUCTOR_EMAIL_POLICY);

  const byDomain = new Map<string, InstructorEmailDomainRule>();
  for (const entry of source) {
    if (!entry || typeof entry !== "object") continue;
    const domain = normalizeEmailDomain((entry as { domain?: unknown }).domain);
    if (!domain) continue;
    byDomain.set(domain, { domain, enabled: (entry as { enabled?: unknown }).enabled === true });
  }

  // The two built-ins always appear, so the toggles are never missing from the UI.
  for (const domain of BUILT_IN_INSTRUCTOR_DOMAINS) {
    if (!byDomain.has(domain)) {
      const fallback = DEFAULT_INSTRUCTOR_EMAIL_POLICY.domains.find((d) => d.domain === domain);
      byDomain.set(domain, { domain, enabled: fallback?.enabled ?? false });
    }
  }

  const domains = sortDomains([...byDomain.values()]);
  if (!domains.some((d) => d.enabled)) return clonePolicy(DEFAULT_INSTRUCTOR_EMAIL_POLICY);
  return { domains };
}

export function enabledInstructorDomains(policy: InstructorEmailPolicy): string[] {
  return policy.domains.filter((d) => d.enabled).map((d) => d.domain);
}

/**
 * Exact host, or a dot-delimited subdomain of it.
 *
 * The dot matters. A plain "ends with" test would accept `notctu.edu.ph` and
 * `ctu.edu.ph.attacker.com`, both of which anyone can register. Subdomains are accepted because
 * campuses do issue them (`@cs.ctu.edu.ph`), and only the domain owner can create one.
 */
export function emailMatchesDomain(email: string, domain: string): boolean {
  const target = normalizeEmailDomain(domain);
  if (!target) return false;
  const text = String(email ?? "").trim().toLowerCase();
  const at = text.lastIndexOf("@");
  if (at < 1 || at === text.length - 1) return false;
  const host = text.slice(at + 1);
  if (!host) return false;
  // "ctu.edu.ph." resolves to the same name but is not the same string; some comparisons treat the
  // two as equal and some do not, so it is refused rather than guessed at.
  if (host.endsWith(".")) return false;
  return host === target || host.endsWith(`.${target}`);
}

export function isAllowedInstructorEmail(email: string, policy: InstructorEmailPolicy): boolean {
  return enabledInstructorDomains(policy).some((domain) => emailMatchesDomain(email, domain));
}

/** "@ctu.edu.ph", or "@ctu.edu.ph or @gmail.com" — for form hints and error copy. */
export function instructorEmailDomainHint(policy: InstructorEmailPolicy): string {
  const domains = enabledInstructorDomains(policy).map((d) => `@${d}`);
  if (domains.length === 0) return `@${INSTRUCTOR_INSTITUTIONAL_DOMAIN}`;
  if (domains.length === 1) return domains[0]!;
  return `${domains.slice(0, -1).join(", ")} or ${domains[domains.length - 1]}`;
}

/** The message a would-be instructor sees when their address is not accepted. */
export function instructorEmailRejectionMessage(policy: InstructorEmailPolicy): string {
  return `Instructor registration accepts ${instructorEmailDomainHint(policy)} addresses.`;
}

/**
 * Validate an edit from System Configuration before it is stored.
 *
 * Turning every domain off would lock instructor registration shut with no way back through the
 * sign-up form, so that is refused here rather than silently corrected.
 */
export function validateInstructorEmailPolicyInput(
  raw: unknown,
): { ok: true; policy: InstructorEmailPolicy } | { ok: false; error: string } {
  const source = readDomainList(raw);
  if (!source) {
    return { ok: false, error: "Send a domains list, e.g. { domains: [{ domain, enabled }] }." };
  }
  if (source.length > 25) {
    return { ok: false, error: "That is more email domains than the sign-up form can reasonably offer." };
  }

  const byDomain = new Map<string, InstructorEmailDomainRule>();
  for (const entry of source) {
    if (!entry || typeof entry !== "object") continue;
    const rawDomain = (entry as { domain?: unknown }).domain;
    const domain = normalizeEmailDomain(rawDomain);
    if (!domain) {
      return {
        ok: false,
        error: `"${String(rawDomain ?? "").trim()}" is not a valid email domain. Use a bare host name such as ctu.edu.ph.`,
      };
    }
    byDomain.set(domain, { domain, enabled: (entry as { enabled?: unknown }).enabled === true });
  }

  for (const domain of BUILT_IN_INSTRUCTOR_DOMAINS) {
    if (!byDomain.has(domain)) byDomain.set(domain, { domain, enabled: false });
  }

  const domains = sortDomains([...byDomain.values()]);
  if (!domains.some((d) => d.enabled)) {
    return {
      ok: false,
      error: "Turn on at least one email domain, otherwise no instructor can register.",
    };
  }
  return { ok: true, policy: { domains } };
}
