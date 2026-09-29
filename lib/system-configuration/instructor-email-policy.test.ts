import { describe, expect, it } from "vitest";
import {
  DEFAULT_INSTRUCTOR_EMAIL_POLICY,
  emailMatchesDomain,
  enabledInstructorDomains,
  instructorEmailDomainHint,
  isAllowedInstructorEmail,
  normalizeEmailDomain,
  parseInstructorEmailPolicy,
  validateInstructorEmailPolicyInput,
} from "./instructor-email-policy";

const bothOn = parseInstructorEmailPolicy({
  domains: [
    { domain: "ctu.edu.ph", enabled: true },
    { domain: "gmail.com", enabled: true },
  ],
});
const gmailOnly = parseInstructorEmailPolicy({
  domains: [
    { domain: "ctu.edu.ph", enabled: false },
    { domain: "gmail.com", enabled: true },
  ],
});

describe("normalizeEmailDomain", () => {
  it("accepts a bare host and strips what does not belong", () => {
    expect(normalizeEmailDomain("  CTU.edu.PH ")).toBe("ctu.edu.ph");
    expect(normalizeEmailDomain("@gmail.com")).toBe("gmail.com");
    expect(normalizeEmailDomain("someone@ctu.edu.ph")).toBe("ctu.edu.ph");
    // A trailing dot is a valid FQDN to some resolvers; treat it as the same host.
    expect(normalizeEmailDomain("gmail.com.")).toBe("gmail.com");
  });

  it("rejects anything that is not a host name", () => {
    for (const bad of ["", "   ", "localhost", "ctu", "ctu .edu", "-ctu.edu.ph", "ctu.edu.ph/x", null]) {
      expect(normalizeEmailDomain(bad)).toBe("");
    }
  });
});

describe("emailMatchesDomain", () => {
  it("matches the exact host and real subdomains", () => {
    expect(emailMatchesDomain("prof@ctu.edu.ph", "ctu.edu.ph")).toBe(true);
    expect(emailMatchesDomain("prof@cs.ctu.edu.ph", "ctu.edu.ph")).toBe(true);
    expect(emailMatchesDomain("PROF@CTU.EDU.PH", "ctu.edu.ph")).toBe(true);
  });

  it("rejects look-alike domains anyone could register", () => {
    // Both of these pass a naive "ends with" / "contains" test.
    expect(emailMatchesDomain("prof@notctu.edu.ph", "ctu.edu.ph")).toBe(false);
    expect(emailMatchesDomain("prof@ctu.edu.ph.attacker.com", "ctu.edu.ph")).toBe(false);
    expect(emailMatchesDomain("prof@ctu.edu.ph.", "gmail.com")).toBe(false);
    // A trailing dot on the address is refused, as it was before this was configurable.
    expect(emailMatchesDomain("prof@ctu.edu.ph.", "ctu.edu.ph")).toBe(false);
  });

  it("rejects malformed addresses", () => {
    for (const bad of ["", "no-at-sign", "@ctu.edu.ph", "prof@"]) {
      expect(emailMatchesDomain(bad, "ctu.edu.ph")).toBe(false);
    }
  });
});

describe("parseInstructorEmailPolicy", () => {
  it("falls back to institutional-only when nothing is stored", () => {
    for (const raw of [null, undefined, {}, "nonsense", 42, { domains: "no" }]) {
      expect(enabledInstructorDomains(parseInstructorEmailPolicy(raw))).toEqual(["ctu.edu.ph"]);
    }
  });

  it("never reads a broken value as allow-everything", () => {
    // Every domain off would otherwise mean "no rule", which must not mean "no restriction".
    const allOff = parseInstructorEmailPolicy({
      domains: [
        { domain: "ctu.edu.ph", enabled: false },
        { domain: "gmail.com", enabled: false },
      ],
    });
    expect(enabledInstructorDomains(allOff)).toEqual(["ctu.edu.ph"]);
    expect(isAllowedInstructorEmail("someone@yahoo.com", allOff)).toBe(false);
  });

  it("keeps both toggles present even when the stored row lists only one", () => {
    const parsed = parseInstructorEmailPolicy({ domains: [{ domain: "gmail.com", enabled: true }] });
    expect(parsed.domains.map((d) => d.domain)).toEqual(["ctu.edu.ph", "gmail.com"]);
    expect(parsed.domains.find((d) => d.domain === "ctu.edu.ph")?.enabled).toBe(true);
  });

  it("keeps a campus's own domain and lists it after the built-ins", () => {
    const parsed = parseInstructorEmailPolicy({
      domains: [
        { domain: "argao.ctu.edu", enabled: true },
        { domain: "ctu.edu.ph", enabled: false },
        { domain: "gmail.com", enabled: false },
      ],
    });
    expect(parsed.domains.map((d) => d.domain)).toEqual(["ctu.edu.ph", "gmail.com", "argao.ctu.edu"]);
    expect(enabledInstructorDomains(parsed)).toEqual(["argao.ctu.edu"]);
  });
});

describe("isAllowedInstructorEmail", () => {
  it("honours what DOI turned on", () => {
    expect(isAllowedInstructorEmail("prof@ctu.edu.ph", DEFAULT_INSTRUCTOR_EMAIL_POLICY)).toBe(true);
    // Gmail is off by default.
    expect(isAllowedInstructorEmail("prof@gmail.com", DEFAULT_INSTRUCTOR_EMAIL_POLICY)).toBe(false);

    expect(isAllowedInstructorEmail("prof@gmail.com", bothOn)).toBe(true);
    expect(isAllowedInstructorEmail("prof@ctu.edu.ph", bothOn)).toBe(true);

    expect(isAllowedInstructorEmail("prof@gmail.com", gmailOnly)).toBe(true);
    expect(isAllowedInstructorEmail("prof@ctu.edu.ph", gmailOnly)).toBe(false);
  });

  it("still refuses a domain nobody turned on", () => {
    expect(isAllowedInstructorEmail("prof@yahoo.com", bothOn)).toBe(false);
  });
});

describe("instructorEmailDomainHint", () => {
  it("reads as a sentence for one, two, or three domains", () => {
    expect(instructorEmailDomainHint(DEFAULT_INSTRUCTOR_EMAIL_POLICY)).toBe("@ctu.edu.ph");
    expect(instructorEmailDomainHint(bothOn)).toBe("@ctu.edu.ph or @gmail.com");
    const three = parseInstructorEmailPolicy({
      domains: [
        { domain: "ctu.edu.ph", enabled: true },
        { domain: "gmail.com", enabled: true },
        { domain: "argao.ctu.edu", enabled: true },
      ],
    });
    expect(instructorEmailDomainHint(three)).toBe("@ctu.edu.ph, @gmail.com or @argao.ctu.edu");
  });
});

describe("validateInstructorEmailPolicyInput", () => {
  it("accepts a normal edit and normalizes what it stores", () => {
    const result = validateInstructorEmailPolicyInput({
      domains: [
        { domain: " CTU.edu.ph ", enabled: true },
        { domain: "@gmail.com", enabled: true },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.policy.domains).toEqual([
        { domain: "ctu.edu.ph", enabled: true },
        { domain: "gmail.com", enabled: true },
      ]);
    }
  });

  it("refuses to turn every domain off", () => {
    const result = validateInstructorEmailPolicyInput({
      domains: [
        { domain: "ctu.edu.ph", enabled: false },
        { domain: "gmail.com", enabled: false },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/at least one/i);
  });

  it("refuses a domain that is not a host name", () => {
    const result = validateInstructorEmailPolicyInput({
      domains: [
        { domain: "ctu.edu.ph", enabled: true },
        { domain: "not a domain", enabled: true },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not a valid email domain/i);
  });

  it("refuses a payload that is not a list", () => {
    expect(validateInstructorEmailPolicyInput(null).ok).toBe(false);
    expect(validateInstructorEmailPolicyInput({ domains: {} }).ok).toBe(false);
  });
});

describe("the institutional rule the hardcoded check used to enforce", () => {
  // Carried over from verification-token.test.ts, which owned this before DOI could configure it.
  const institutional = DEFAULT_INSTRUCTOR_EMAIL_POLICY;

  it("accepts the institutional domain and campus subdomains", () => {
    expect(isAllowedInstructorEmail("faculty@ctu.edu.ph", institutional)).toBe(true);
    expect(isAllowedInstructorEmail("  Faculty@CTU.EDU.PH ", institutional)).toBe(true);
    expect(isAllowedInstructorEmail("faculty@argao.ctu.edu.ph", institutional)).toBe(true);
    expect(isAllowedInstructorEmail("faculty@cs.argao.ctu.edu.ph", institutional)).toBe(true);
  });

  it("rejects personal providers while only the institutional domain is on", () => {
    expect(isAllowedInstructorEmail("faculty@gmail.com", institutional)).toBe(false);
    expect(isAllowedInstructorEmail("faculty@yahoo.com", institutional)).toBe(false);
  });

  it("rejects look-alike domains", () => {
    /**
     * The whole point of the dot-delimited check. A naive `endsWith("ctu.edu.ph")` accepts the first
     * two, and a naive `includes("ctu.edu.ph")` accepts all of them — every one is registrable by an
     * attacker, and each would let an outsider into the faculty queue.
     */
    expect(isAllowedInstructorEmail("faculty@notctu.edu.ph", institutional)).toBe(false);
    expect(isAllowedInstructorEmail("faculty@myctu.edu.ph", institutional)).toBe(false);
    expect(isAllowedInstructorEmail("faculty@ctu.edu.ph.evil.com", institutional)).toBe(false);
    expect(isAllowedInstructorEmail("faculty@evil.com?ctu.edu.ph", institutional)).toBe(false);
  });

  it("rejects a trailing dot, which some resolvers treat as equivalent", () => {
    expect(isAllowedInstructorEmail("faculty@ctu.edu.ph.", institutional)).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(isAllowedInstructorEmail("no-at-sign", institutional)).toBe(false);
    expect(isAllowedInstructorEmail("", institutional)).toBe(false);
  });
});
