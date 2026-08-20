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
import { ApiClientError, systemConfigApi } from "@/lib/api/client";
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

/**
 * Loads the singleton `CampusInsSettings` row from the Express backend
 * (`systemConfigApi.get`). Realtime postgres_changes subscription is
 * removed — the in-app reload events (`SYSTEM_CONFIG_RELOAD_EVENT` +
 * the BroadcastChannel) trigger a re-fetch instead.
 */
export function SystemConfigurationProvider({ children }: { children: ReactNode }) {
  const [schedulingPolicy, setSchedulingPolicy] = useState<SchedulingPolicyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { config } = await systemConfigApi.get();
      setSchedulingPolicy((config.schedulingPolicy as SchedulingPolicyConfig | null) ?? null);
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load system configuration",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onWindow = () => {
      void reload();
    };
    window.addEventListener(SYSTEM_CONFIG_RELOAD_EVENT, onWindow);
    const unsubBc = subscribeSystemConfigBroadcast(() => {
      void reload();
    });
    return () => {
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
