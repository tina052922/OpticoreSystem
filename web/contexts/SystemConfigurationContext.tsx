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
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Q } from "@/lib/supabase/catalog-columns";
import {
  resolveDefaultMaxFacultyHoursPerWeek,
  resolveFacultyPolicyConstants,
  type ResolvedFacultyPolicyConstants,
  type SchedulingPolicyConfig,
} from "@/lib/system-configuration/scheduling-policy";
import {
  dispatchSystemConfigReload,
  subscribeSystemConfigBroadcast,
  SYSTEM_CONFIG_RELOAD_EVENT,
} from "@/lib/system-configuration/system-config-reload";
import type { CampusInsSettings } from "@/types/db";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";

export type SystemConfigurationContextValue = {
  schedulingPolicy: SchedulingPolicyConfig | null;
  policyConstants: ResolvedFacultyPolicyConstants;
  /** GA / optimizer soft cap (hrs/week). */
  defaultMaxFacultyHoursPerWeek: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const SystemConfigurationContext = createContext<SystemConfigurationContextValue | null>(null);

export function SystemConfigurationProvider({ children }: { children: ReactNode }) {
  const [schedulingPolicy, setSchedulingPolicy] = useState<SchedulingPolicyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Connection is not configured.");
      setLoading(false);
      return;
    }
    const { data, error: e } = await supabase
      .from("CampusInsSettings")
      .select(Q.campusInsSettings)
      .eq("id", "default")
      .maybeSingle();
    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }
    const row = data as CampusInsSettings | null;
    setSchedulingPolicy((row?.schedulingPolicy as SchedulingPolicyConfig | null) ?? null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel("system-config:campus-ins-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "CampusInsSettings" },
        () => {
          void reload();
        },
      )
      .subscribe();

    const onWindow = () => {
      void reload();
    };
    window.addEventListener(SYSTEM_CONFIG_RELOAD_EVENT, onWindow);
    const unsubBc = subscribeSystemConfigBroadcast(() => {
      void reload();
    });

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener(SYSTEM_CONFIG_RELOAD_EVENT, onWindow);
      unsubBc();
    };
  }, [reload]);

  const policyConstants = useMemo(
    () => resolveFacultyPolicyConstants(schedulingPolicy),
    [schedulingPolicy],
  );

  const defaultMaxFacultyHoursPerWeek = useMemo(
    () => resolveDefaultMaxFacultyHoursPerWeek(schedulingPolicy),
    [schedulingPolicy],
  );

  const value = useMemo<SystemConfigurationContextValue>(
    () => ({
      schedulingPolicy,
      policyConstants,
      defaultMaxFacultyHoursPerWeek,
      loading,
      error,
      reload,
    }),
    [schedulingPolicy, policyConstants, defaultMaxFacultyHoursPerWeek, loading, error, reload],
  );

  return <SystemConfigurationContext.Provider value={value}>{children}</SystemConfigurationContext.Provider>;
}

export function useSystemConfiguration(): SystemConfigurationContextValue {
  const ctx = useContext(SystemConfigurationContext);
  if (!ctx) {
    throw new Error("useSystemConfiguration must be used within SystemConfigurationProvider");
  }
  return ctx;
}

export function useSystemConfigurationOptional(): SystemConfigurationContextValue | null {
  return useContext(SystemConfigurationContext);
}

/** After admin saves policy or signers — refresh policy context + INS catalog for all roles. */
export function notifySystemConfigurationSaved(source: "schedulingPolicy" | "academicPeriod" | "collegeSigners" | "insSigners") {
  dispatchSystemConfigReload({ source });
  if (source === "insSigners" || source === "collegeSigners") {
    dispatchInsCatalogReload();
  }
}
