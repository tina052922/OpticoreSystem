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
import { useRealtimeEvent } from "@/hooks/use-realtime-event";

export type SystemConfigurationContextValue = {
  schedulingPolicy: SchedulingPolicyConfig | null;
  policyConstants: ResolvedFacultyPolicyConstants;
  /** GA / optimizer soft cap (hrs/week). */
  defaultMaxFacultyHoursPerWeek: number;
  loading: boolean;
  error: string | null;
  reload: (opts?: { forceRefresh?: boolean }) => Promise<void>;
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

  /**
   * `forceRefresh` is used by the save/broadcast listeners below: those fire
   * precisely because the config just changed, so serving a TTL-cached copy
   * would show stale policy. The mount call stays cached to collapse the
   * duplicate requests from multiple providers/portals mounting at once.
   */
  const reload = useCallback(async (opts: { forceRefresh?: boolean } = {}) => {
    try {
      const { config } = await systemConfigApi.get({ forceRefresh: opts.forceRefresh });
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

  /**
   * Cross-user push: an admin saving policy on another machine now reaches
   * every open client. The window/BroadcastChannel listeners below remain for
   * same-tab and same-browser propagation, which fire without a round trip.
   */
  useRealtimeEvent("config.changed", () => {
    void reload({ forceRefresh: true });
  });

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
