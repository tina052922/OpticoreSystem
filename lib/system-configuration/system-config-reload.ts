export const SYSTEM_CONFIG_RELOAD_EVENT = "opticore:system-config-reload";

const BROADCAST = "opticore-system-config-sync";

export type SystemConfigReloadDetail = {
  t: number;
  source?: "schedulingPolicy" | "academicPeriod" | "collegeSigners" | "insSigners";
};

export function dispatchSystemConfigReload(detail?: Omit<SystemConfigReloadDetail, "t">): void {
  if (typeof window === "undefined") return;
  const payload: SystemConfigReloadDetail = { t: Date.now(), ...detail };
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BROADCAST);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent<SystemConfigReloadDetail>(SYSTEM_CONFIG_RELOAD_EVENT, { detail: payload }));
}

export function subscribeSystemConfigBroadcast(onReload: (detail?: SystemConfigReloadDetail) => void): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const bc = new BroadcastChannel(BROADCAST);
  bc.onmessage = (ev) => {
    onReload((ev?.data as SystemConfigReloadDetail | undefined) ?? undefined);
  };
  return () => {
    try {
      bc.close();
    } catch {
      /* ignore */
    }
  };
}
