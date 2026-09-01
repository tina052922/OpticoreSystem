"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, ClipboardCheck, Megaphone } from "lucide-react";
import { ApiClientError, authApi, notificationsApi, type Notification, type Role } from "@/lib/api/client";
import { usePolledCallback } from "@/hooks/use-polled-callback";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isScheduleRelatedNotificationMessage } from "@/lib/notifications/notification-relevance";
import { isWorkflowReadinessMessage } from "@/lib/notifications/workflow-indicators";

/**
 * Realtime (SSE) is the primary delivery path; this poll is only a fallback for
 * a dropped connection or notifications written outside the API. It is
 * deliberately slow — tightening it would undo the load reduction realtime buys.
 */
const POLL_INTERVAL_MS = 180_000;

/**
 * Notification bell — pulls notifications from the Express backend.
 *
 * Polling cadence is 30 s; this is a deliberate trade-off until the SSE
 * realtime stream is wired up. A manual click on the bell also triggers a
 * load so users see fresh state immediately.
 *
 * Instructors and students only see schedule-related messages (mirrors
 * the original behavior); admin roles see the full feed for workflow
 * visibility.
 */
export function NotificationBell() {
  const [raw, setRaw] = useState<Notification[]>([]);
  const [role, setRole] = useState<Role | null>(null);

  /**
   * Stable across role changes on purpose: role only affects *filtering*, which
   * we do at render time. Keeping it out of the dep array stops the poll
   * interval from being torn down and re-firing an extra request once
   * `authApi.me()` resolves.
   */
  const load = useCallback(async (opts: { forceRefresh?: boolean } = {}) => {
    try {
      const { notifications } = await notificationsApi.list(
        { limit: 25 },
        { forceRefresh: opts.forceRefresh },
      );
      setRaw(notifications);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        // Not logged in — fail silently; the layout will redirect.
        setRaw([]);
        return;
      }
      // Keep the previous list on transient errors.
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const { user } = await authApi.me();
        setRole(user.role);
      } catch {
        setRole(null);
      }
    })();
  }, []);

  /**
   * Initial load goes through the cache so several shells mounting at once
   * (portal shell + campus-intelligence shell) collapse into one request.
   */
  useEffect(() => {
    void load();
  }, [load]);

  /** Instant push: the server tells us the moment a notification lands. */
  useRealtimeEvent("notification.changed", () => {
    void load({ forceRefresh: true });
  });

  /**
   * Safety net behind realtime, not the primary path — hence the much longer
   * interval. It covers a dropped SSE connection that hasn't reconnected yet
   * and any notification written outside the API (DB trigger, manual insert),
   * which produces no event.
   *
   * Polls bypass the cache; ticks are skipped in hidden tabs and jittered.
   */
  usePolledCallback(() => load({ forceRefresh: true }), {
    intervalMs: POLL_INTERVAL_MS,
  });

  const items = useMemo(
    () =>
      role === "student" || role === "instructor"
        ? raw.filter((r) => isScheduleRelatedNotificationMessage(r.message))
        : raw,
    [raw, role],
  );

  const unread = items.filter((i) => !i.isRead).length;

  async function markRead(id: string) {
    try {
      await notificationsApi.markRead(id);
    } catch {
      /* ignore — the next poll will reconcile */
    }
    void load({ forceRefresh: true });
  }

  async function markAllRead() {
    setRaw((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationsApi.markAllRead();
    } catch {
      /* ignore */
    }
    void load({ forceRefresh: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          suppressHydrationWarning
          className="relative p-1 rounded-md hover:bg-white/10"
          aria-label="Notifications"
          onClick={() => void load({ forceRefresh: true })}
        >
          <Bell className="w-6 h-6 text-white" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-3 px-0.5 bg-[#FF990A] rounded-full border border-white/30 text-[9px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-2rem,360px)] max-h-[min(70vh,320px)] overflow-y-auto"
      >
        <div className="px-2 py-1.5 text-xs font-semibold text-black/60 border-b border-black/10 flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unread > 0 ? (
            <button
              type="button"
              className="text-[11px] font-bold text-[#780301] hover:underline"
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void markAllRead();
              }}
            >
              Read all
            </button>
          ) : null}
        </div>
        {items.length === 0 ? (
          <div className="px-3 py-4 text-sm text-black/50">No notifications yet.</div>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-1 whitespace-normal cursor-default focus:bg-black/[0.04]"
              onSelect={(e) => e.preventDefault()}
            >
              <span className="text-sm text-black/90 flex items-start gap-1.5">
                {isWorkflowReadinessMessage(n.message) ? (
                  <span className="mt-0.5 shrink-0 text-[#ff990a]" aria-hidden>
                    {n.message.toLowerCase().includes("gec") ? (
                      <Megaphone className="w-3.5 h-3.5" />
                    ) : (
                      <ClipboardCheck className="w-3.5 h-3.5" />
                    )}
                  </span>
                ) : null}
                {n.message}
              </span>
              <span className="text-[11px] text-black/45">
                {new Date(n.createdAt).toLocaleString()}
                {!n.isRead ? (
                  <button
                    type="button"
                    suppressHydrationWarning
                    className="ml-2 text-[#780301] font-medium hover:underline"
                    onClick={() => void markRead(n.id)}
                  >
                    Mark read
                  </button>
                ) : null}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
