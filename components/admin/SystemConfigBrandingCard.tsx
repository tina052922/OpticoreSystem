"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, systemConfigApi } from "@/lib/api/client";
import { notifySystemConfigurationSaved } from "@/contexts/SystemConfigurationContext";
import {
  BRANDING_LIMITS,
  DEFAULT_CAMPUS_BRANDING,
  DEFAULT_INS_HEADER_BANNER,
  CTU_LOGO_PNG,
  parseCampusBranding,
  type CampusBrandingConfig,
} from "@/lib/system-configuration/campus-branding";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_BYTES = 2 * 1024 * 1024;

function ImageField({
  title,
  hint,
  empty,
  previewUrl,
  busy,
  onFile,
  onClear,
  removeLabel,
  tall,
  canReset = true,
}: {
  title: string;
  hint: string;
  empty: string;
  previewUrl: string | null;
  busy: boolean;
  onFile: (file: File | null) => void;
  onClear: () => void;
  removeLabel: string;
  tall?: boolean;
  canReset?: boolean;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#FAFAFA] p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-black">{title}</h3>
        <p className="mt-1 text-xs text-black/60 leading-relaxed">{hint}</p>
      </div>
      <label className="inline-flex flex-col gap-1 text-xs font-medium text-black/70">
        Image file
        <input
          type="file"
          accept={ACCEPT}
          disabled={busy}
          className="max-w-[280px] text-xs file:mr-2 file:rounded file:border-0 file:bg-[#FF990A] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            e.target.value = "";
            onFile(f);
          }}
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`relative flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-white ${
            tall ? "h-16 w-64" : "h-20 w-20"
          }`}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={title} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="px-2 text-center text-[11px] text-gray-400">{empty}</span>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={busy || !canReset} onClick={onClear}>
          {removeLabel}
        </Button>
      </div>
    </div>
  );
}

export function SystemConfigBrandingCard() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [headerTitle, setHeaderTitle] = useState("");
  const [headerSubtitle, setHeaderSubtitle] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [footerText, setFooterText] = useState("");
  const [insFooterText, setInsFooterText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const applyStored = useCallback((raw: CampusBrandingConfig | null | undefined) => {
    const b = parseCampusBranding(raw);
    setLogoUrl(b.logoUrl ?? null);
    setBannerUrl(b.insHeaderBannerUrl ?? null);
    setHeaderTitle(b.headerTitle ?? "");
    setHeaderSubtitle(b.headerSubtitle ?? "");
    setUniversityName(b.universityName ?? "");
    setFooterText(b.footerText ?? "");
    setInsFooterText(b.insFooterText ?? "");
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await systemConfigApi.get({ forceRefresh: true });
      applyStored(data.config.branding);
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Could not load branding");
    }
  }, [applyStored]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onLogoFile(file: File | null) {
    if (!file) return;
    setErr(null);
    setOk(null);
    if (file.size > MAX_BYTES) {
      setErr(`Image is too large (max ${Math.round(MAX_BYTES / (1024 * 1024))} MB).`);
      return;
    }
    setBusy(true);
    try {
      const data = await systemConfigApi.uploadLogo(file);
      setLogoUrl(data.url?.trim() || null);
      notifySystemConfigurationSaved("branding");
      setOk("Logo updated.");
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Logo upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onClearLogo() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await systemConfigApi.clearLogo();
      setLogoUrl(null);
      notifySystemConfigurationSaved("branding");
      setOk("Logo reset to the default CTU seal.");
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Could not clear logo");
    } finally {
      setBusy(false);
    }
  }

  async function onBannerFile(file: File | null) {
    if (!file) return;
    setErr(null);
    setOk(null);
    if (file.size > MAX_BYTES) {
      setErr(`Image is too large (max ${Math.round(MAX_BYTES / (1024 * 1024))} MB).`);
      return;
    }
    setBusy(true);
    try {
      const data = await systemConfigApi.uploadInsHeaderBanner(file);
      setBannerUrl(data.url?.trim() || null);
      notifySystemConfigurationSaved("branding");
      setOk("INS letterhead updated.");
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Letterhead upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onClearBanner() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await systemConfigApi.clearInsHeaderBanner();
      setBannerUrl(null);
      notifySystemConfigurationSaved("branding");
      setOk("INS letterhead reset to the default CTU banner.");
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Could not clear letterhead");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveText(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await systemConfigApi.update({
        branding: {
          headerTitle,
          headerSubtitle,
          universityName,
          footerText,
          insFooterText,
        },
      });
      notifySystemConfigurationSaved("branding");
      setOk("Header and footer text saved.");
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Could not save branding");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-black/65 leading-relaxed">
        These appear in the Campus Intelligence header, login and landing pages, and INS letterhead.
        Leave a text field blank to use the CTU default. Max 2 MB per image.
      </p>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      {ok ? <p className="text-sm text-emerald-800">{ok}</p> : null}

      <ImageField
        title="Campus logo"
        hint="Shown in the app header, login, and landing pages. Default is the CTU seal."
        empty="Using default CTU seal"
        previewUrl={logoUrl || CTU_LOGO_PNG}
        busy={busy}
        onFile={(f) => void onLogoFile(f)}
        onClear={() => void onClearLogo()}
        removeLabel="Reset to default seal"
        canReset={Boolean(logoUrl)}
      />

      <ImageField
        title="INS letterhead banner"
        hint="Printed header on INS Forms 5A / 5B / 5C and the teaching-load summary. Use a wide PNG of the official university letterhead."
        empty="Using default CTU letterhead"
        previewUrl={bannerUrl || DEFAULT_INS_HEADER_BANNER}
        busy={busy}
        onFile={(f) => void onBannerFile(f)}
        onClear={() => void onClearBanner()}
        removeLabel="Reset to default letterhead"
        tall
        canReset={Boolean(bannerUrl)}
      />

      <form onSubmit={(e) => void onSaveText(e)} className="space-y-3 border-t border-black/10 pt-4">
        <div className="grid gap-3">
          <label className="space-y-1 text-xs font-medium text-black/70">
            Header title
            <Input
              value={headerTitle}
              maxLength={BRANDING_LIMITS.headerTitle}
              placeholder={DEFAULT_CAMPUS_BRANDING.headerTitle}
              onChange={(e) => setHeaderTitle(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-black/70">
            Header subtitle
            <Input
              value={headerSubtitle}
              maxLength={BRANDING_LIMITS.headerSubtitle}
              placeholder={DEFAULT_CAMPUS_BRANDING.headerSubtitle}
              onChange={(e) => setHeaderSubtitle(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-black/70">
            University name
            <Input
              value={universityName}
              maxLength={BRANDING_LIMITS.universityName}
              placeholder={DEFAULT_CAMPUS_BRANDING.universityName}
              onChange={(e) => setUniversityName(e.target.value)}
            />
            <span className="font-normal text-black/50">Login, register, and on-screen INS heading.</span>
          </label>
          <label className="space-y-1 text-xs font-medium text-black/70">
            Site footer
            <Input
              value={footerText}
              maxLength={BRANDING_LIMITS.footerText}
              placeholder={DEFAULT_CAMPUS_BRANDING.footerText}
              onChange={(e) => setFooterText(e.target.value)}
            />
            <span className="font-normal text-black/50">Landing page copyright line (year is added automatically).</span>
          </label>
          <label className="space-y-1 text-xs font-medium text-black/70">
            INS print footer (optional)
            <Input
              value={insFooterText}
              maxLength={BRANDING_LIMITS.insFooterText}
              placeholder="Leave blank to keep official paper forms unchanged"
              onChange={(e) => setInsFooterText(e.target.value)}
            />
          </label>
        </div>
        <Button type="submit" disabled={busy} className="bg-[#780301] hover:bg-[#5a0201] text-white">
          Save header & footer text
        </Button>
      </form>
    </div>
  );
}
