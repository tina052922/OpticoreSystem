"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Row = { id: string; message: string; isRead: boolean; createdAt: string };

export function NotificationBell() {
  const [items, setItems] = useState<Row[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;
    setUserId(user.id);
    const { data } = await supabase
      .from("Notification")
      .select("id,message,isRead,createdAt")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(25);
    setItems((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !userId) return;
    const ch = supabase
      .channel("opticore-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
          filter: `userId=eq.${userId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId, load]);

  const unread = items.filter((i) => !i.isRead).length;

  async function markRead(id: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.from("Notification").update({ isRead: true }).eq("id", id).eq("userId", userId ?? "");
    void load();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="relative p-1 rounded-md hover:bg-white/10" aria-label="Notifications">
          <Bell className="w-6 h-6 text-white" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-3 px-0.5 bg-[#FF990A] rounded-full border border-white/30 text-[9px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,360px)] max-h-[min(70vh,320px)] overflow-y-auto">
        <div className="px-2 py-1.5 text-xs font-semibold text-black/60 border-b border-black/10">Notifications</div>
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
