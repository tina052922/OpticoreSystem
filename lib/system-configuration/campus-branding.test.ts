import { describe, expect, it } from "vitest";
import {
  CTU_LOGO_PNG,
  DEFAULT_CAMPUS_BRANDING,
  DEFAULT_INS_HEADER_BANNER,
  mergeCampusBrandingText,
  parseCampusBranding,
  resolveCampusBranding,
  withBrandingImage,
} from "./campus-branding";

describe("parseCampusBranding", () => {
  it("returns empty for non-objects", () => {
    expect(parseCampusBranding(null)).toEqual({});
    expect(parseCampusBranding("x")).toEqual({});
  });

  it("keeps http(s) and same-origin image URLs and drops other schemes", () => {
    expect(
      parseCampusBranding({
        logoUrl: "https://cdn.example/logo.png",
        insHeaderBannerUrl: "/images/logos/custom.png",
      }),
    ).toMatchObject({
      logoUrl: "https://cdn.example/logo.png",
      insHeaderBannerUrl: "/images/logos/custom.png",
    });
    expect(parseCampusBranding({ logoUrl: "javascript:alert(1)" }).logoUrl).toBeNull();
  });
});

describe("mergeCampusBrandingText", () => {
  it("updates copy without replacing uploaded images", () => {
    const merged = mergeCampusBrandingText(
      { logoUrl: "https://cdn.example/logo.png", headerTitle: "Old" },
      { headerTitle: "  OptiCore Argao  ", logoUrl: "https://evil.example/x.png" },
    );
    expect(merged.headerTitle).toBe("OptiCore Argao");
    expect(merged.logoUrl).toBe("https://cdn.example/logo.png");
  });

  it("clears a text field back to default when blank", () => {
    const merged = mergeCampusBrandingText({ headerTitle: "Custom" }, { headerTitle: "   " });
    expect(merged.headerTitle).toBeNull();
    expect(resolveCampusBranding(merged).headerTitle).toBe(DEFAULT_CAMPUS_BRANDING.headerTitle);
  });
});

describe("resolveCampusBranding", () => {
  it("falls back to CTU assets and copy", () => {
    const r = resolveCampusBranding(null);
    expect(r.logoUrl).toBe(CTU_LOGO_PNG);
    expect(r.insHeaderBannerUrl).toBe(DEFAULT_INS_HEADER_BANNER);
    expect(r.headerTitle).toBe(DEFAULT_CAMPUS_BRANDING.headerTitle);
    expect(r.insFooterText).toBe("");
  });
});

describe("withBrandingImage", () => {
  it("sets or clears a stored image URL", () => {
    const withLogo = withBrandingImage({ headerTitle: "X" }, "logoUrl", "https://cdn.example/a.png");
    expect(withLogo.logoUrl).toBe("https://cdn.example/a.png");
    expect(withLogo.headerTitle).toBe("X");
    expect(withBrandingImage(withLogo, "logoUrl", null).logoUrl).toBeNull();
  });
});
