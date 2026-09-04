"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { publicApi } from "@/lib/api/client";
import {
  resolveCampusBranding,
  type ResolvedCampusBranding,
} from "@/lib/system-configuration/campus-branding";
import {
  subscribeSystemConfigBroadcast,
  SYSTEM_CONFIG_RELOAD_EVENT,
} from "@/lib/system-configuration/system-config-reload";

const DEFAULT_RESOLVED = resolveCampusBranding(null);

export type CampusBrandingContextValue = {
  branding: ResolvedCampusBranding;
  loading: boolean;
  reload: (opts?: { forceRefresh?: boolean }) => Promise<void>;
};

const CampusBrandingContext = createContext<CampusBrandingContextValue | null>(null);

export function CampusBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<ResolvedCampusBranding>(DEFAULT_RESOLVED);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (opts: { forceRefresh?: boolean } = {}) => {
    try {
      const data = await publicApi.getBranding({ forceRefresh: opts.forceRefresh });
      setBranding(resolveCampusBranding(data.branding));
    } catch {
      /* Keep last-known / defaults so public pages still render. */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onWindow = () => {
      void reload({ forceRefresh: true });
    };
    window.addEventListener(SYSTEM_CONFIG_RELOAD_EVENT, onWindow);
    const unsubBc = subscribeSystemConfigBroadcast(() => {
      void reload({ forceRefresh: true });
    });
    return () => {
      window.removeEventListener(SYSTEM_CONFIG_RELOAD_EVENT, onWindow);
      unsubBc();
    };
  }, [reload]);

  const value = useMemo<CampusBrandingContextValue>(
    () => ({ branding, loading, reload }),
    [branding, loading, reload],
  );

  return <CampusBrandingContext.Provider value={value}>{children}</CampusBrandingContext.Provider>;
}

/** Resolved campus branding; defaults if the provider is not mounted. */
export function useCampusBranding(): ResolvedCampusBranding {
  return useContext(CampusBrandingContext)?.branding ?? DEFAULT_RESOLVED;
}
