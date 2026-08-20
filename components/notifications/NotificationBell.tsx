"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { ApiClientError, authApi, notificationsApi, type Notification, type Role } from "@/lib/api/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isScheduleRelatedNotificationMessage } from "@/lib/notifications/notification-relevance";

const POLL_INTERVAL_MS = 30_000;

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
  const [items, setItems] = useState<Notification[]>([]);
  const [role, setRole] = useState<Role | null>(null);

  const load = useCallback(async () => {
    try {
      const { notifications } = await notificationsApi.list({ limit: 25 });
      const filtered =
        role === "student" || role === "instructor"
          ? notifications.filter((r) => isScheduleRelatedNotificationMessage(r.message))
          : notifications;
      setItems(filtered);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        // Not logged in — fail silently; the layout will redirect.
        setItems([]);
        return;
      }
      // Keep the previous list on transient errors.
    }
  }, [role]);

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

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const unread = items.filter((i) => !i.isRead).length;

  async function markRead(id: string) {
    try {
      await notificationsApi.markRead(id);
    } catch {
      /* ignore — the next poll will reconcile */
    }
    void load();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          suppressHydrationWarning
          className="relative p-1 rounded-md hover:bg-white/10"
          aria-label="Notifications"
          onClick={() => void load()}
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
        <div className="px-2 py-1.5 text-xs font-semibold text-black/60 border-b border-black/10">
          Notifications
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
              <span className="text-sm text-black/90">{n.message}</span>
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
