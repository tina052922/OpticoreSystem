"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Megaphone } from "lucide-react";
import { notificationsApi, type Notification } from "@/lib/api/client";
import {
  isChairmanPlottedReadinessMessage,
  isGecReadyMessage,
} from "@/lib/notifications/workflow-indicators";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";

export function WorkflowReadinessBanner({
  evaluatorHref,
  variant,
}: {
  evaluatorHref: string;
  variant: "college" | "doi" | "gec";
}) {
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    try {
      const { notifications } = await notificationsApi.list({ limit: 25 }, { forceRefresh: true });
      setItems(notifications.filter((n) => !n.isRead));
    } catch {
      /* keep last */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeEvent("notification.changed", () => {
    void load();
  });

  const plotted = useMemo(
    () =>
      variant !== "gec"
        ? items.filter((n) => isChairmanPlottedReadinessMessage(n.message))
        : [],
    [items, variant],
  );
  const gecReady = useMemo(
    () => (variant === "gec" ? items.filter((n) => isGecReadyMessage(n.message)) : []),
    [items, variant],
  );

  if (plotted.length === 0 && gecReady.length === 0) return null;

  const notice = plotted[0] ?? gecReady[0];
  if (!notice) return null;

  return (
    <Link
      href={evaluatorHref}
      className="flex items-start gap-3 rounded-xl border-2 border-[#ff990a]/70 bg-amber-50/90 p-4 shadow-sm hover:border-[#ff990a] transition-colors"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff990a] text-white">
        {gecReady.length > 0 ? (
          <Megaphone className="w-5 h-5" aria-hidden />
        ) : (
          <ClipboardCheck className="w-5 h-5" aria-hidden />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#780301]">
          {gecReady.length > 0 ? "GEC is ready to plot" : "Section ready for double-check"}
        </p>
        <p className="text-sm text-black/75 mt-0.5 leading-relaxed">{notice.message}</p>
        <p className="text-xs font-semibold text-[#780301] mt-1">Open Evaluator</p>
      </div>
    </Link>
  );
}
