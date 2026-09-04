/** Public URL for the CTU seal raster (`web/public/ctulogo.png`). */
export const CTU_LOGO_PNG = "/ctulogo.png";

/** Official INS letterhead (seal + wordmark) in `web/public`. */
export const DEFAULT_INS_HEADER_BANNER = "/images/logos/ctu-header-with-logo.png";

export const DEFAULT_CAMPUS_BRANDING = {
  headerTitle: "OptiCore",
  headerSubtitle: "Campus Intelligence System – CTU Argao",
  universityName: "Cebu Technological University",
  footerText: "Cebu Technological University · OptiCore Campus Intelligence System",
} as const;

export const BRANDING_LIMITS = {
  headerTitle: 80,
  headerSubtitle: 160,
  universityName: 120,
  footerText: 280,
  insFooterText: 280,
} as const;

/** Stored in `CampusInsSettings.branding` (partial overrides). */
export type CampusBrandingConfig = {
  logoUrl?: string | null;
  insHeaderBannerUrl?: string | null;
  headerTitle?: string | null;
  headerSubtitle?: string | null;
  universityName?: string | null;
  footerText?: string | null;
  /** Optional extra line on printed INS PDFs. Empty keeps the paper form unchanged. */
  insFooterText?: string | null;
};

export type ResolvedCampusBranding = {
  logoUrl: string;
  insHeaderBannerUrl: string;
  headerTitle: string;
  headerSubtitle: string;
  universityName: string;
  footerText: string;
  insFooterText: string;
};

export type CampusBrandingTextPatch = {
  headerTitle?: string | null;
  headerSubtitle?: string | null;
  universityName?: string | null;
  footerText?: string | null;
  insFooterText?: string | null;
};

function storedText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.slice(0, max);
}

function storedUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  if (t.startsWith("/") || t.startsWith("https://") || t.startsWith("http://")) {
    return t.slice(0, 2000);
  }
  return null;
}

export function parseCampusBranding(raw: unknown): CampusBrandingConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  return {
    logoUrl: storedUrl(o.logoUrl),
    insHeaderBannerUrl: storedUrl(o.insHeaderBannerUrl),
    headerTitle: storedText(o.headerTitle, BRANDING_LIMITS.headerTitle),
    headerSubtitle: storedText(o.headerSubtitle, BRANDING_LIMITS.headerSubtitle),
    universityName: storedText(o.universityName, BRANDING_LIMITS.universityName),
    footerText: storedText(o.footerText, BRANDING_LIMITS.footerText),
    insFooterText: storedText(o.insFooterText, BRANDING_LIMITS.insFooterText),
  };
}

/** Text fields from System Configuration. Image URLs stay on the existing row. */
export function mergeCampusBrandingText(
  current: unknown,
  patch: CampusBrandingTextPatch | Record<string, unknown> | null | undefined,
): CampusBrandingConfig {
  const base = parseCampusBranding(current);
  const p = patch && typeof patch === "object" && !Array.isArray(patch) ? (patch as Record<string, unknown>) : {};
  const next: CampusBrandingConfig = { ...base };
  if ("headerTitle" in p) next.headerTitle = storedText(p.headerTitle, BRANDING_LIMITS.headerTitle);
  if ("headerSubtitle" in p) next.headerSubtitle = storedText(p.headerSubtitle, BRANDING_LIMITS.headerSubtitle);
  if ("universityName" in p) next.universityName = storedText(p.universityName, BRANDING_LIMITS.universityName);
  if ("footerText" in p) next.footerText = storedText(p.footerText, BRANDING_LIMITS.footerText);
  if ("insFooterText" in p) next.insFooterText = storedText(p.insFooterText, BRANDING_LIMITS.insFooterText);
  next.logoUrl = base.logoUrl ?? null;
  next.insHeaderBannerUrl = base.insHeaderBannerUrl ?? null;
  return next;
}

export function withBrandingImage(
  current: unknown,
  field: "logoUrl" | "insHeaderBannerUrl",
  url: string | null,
): CampusBrandingConfig {
  const base = parseCampusBranding(current);
  return { ...base, [field]: url };
}

export function resolveCampusBranding(raw: unknown): ResolvedCampusBranding {
  const b = parseCampusBranding(raw);
  return {
    logoUrl: b.logoUrl || CTU_LOGO_PNG,
    insHeaderBannerUrl: b.insHeaderBannerUrl || DEFAULT_INS_HEADER_BANNER,
    headerTitle: b.headerTitle || DEFAULT_CAMPUS_BRANDING.headerTitle,
    headerSubtitle: b.headerSubtitle || DEFAULT_CAMPUS_BRANDING.headerSubtitle,
    universityName: b.universityName || DEFAULT_CAMPUS_BRANDING.universityName,
    footerText: b.footerText || DEFAULT_CAMPUS_BRANDING.footerText,
    insFooterText: b.insFooterText || "",
  };
}

export function insPdfBrandingProps(branding: ResolvedCampusBranding): {
  headerBanner: string;
  insFooterText: string;
} {
  return {
    headerBanner: branding.insHeaderBannerUrl,
    insFooterText: branding.insFooterText,
  };
}
