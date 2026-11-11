"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/components/ui/utils";

type OpticoreToastVariant = "success" | "error" | "info";

export type OpticoreToast = {
  id: string;
  variant: OpticoreToastVariant;
  title: string;
  description?: string | null;
  /** How long it stays up, for the countdown bar; 0 = until dismissed (no bar). */
  durationMs?: number;
};

type Ctx = {
  notify: (t: Omit<OpticoreToast, "id"> & { id?: string; durationMs?: number }) => void;
  dismiss: (id: string) => void;
  success: (title: string, description?: string | null, durationMs?: number) => void;
  error: (title: string, description?: string | null, durationMs?: number) => void;
  info: (title: string, description?: string | null, durationMs?: number) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function OpticoreToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<OpticoreToast[]>([]);
  const timersRef = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      window.clearTimeout(t);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback(
    (t: Omit<OpticoreToast, "id"> & { id?: string; durationMs?: number }) => {
      const id = t.id ?? uid();
      const durationMs = typeof t.durationMs === "number" ? t.durationMs : 4500;
      setToasts((prev) => {
        const next = [
          { id, variant: t.variant, title: t.title, description: t.description ?? null, durationMs },
          ...prev.filter((x) => x.id !== id),
        ];
        return next.slice(0, 4);
      });
      /** durationMs <= 0 keeps the toast visible until user dismisses it (e.g. offline banner). */
      if (durationMs > 0) {
        const old = timersRef.current.get(id);
        if (old) window.clearTimeout(old);
        const timer = window.setTimeout(() => dismiss(id), durationMs);
        timersRef.current.set(id, timer);
      }
    },
    [dismiss],
  );

  const api = useMemo<Ctx>(() => {
    return {
      notify,
      dismiss,
      success: (title, description, durationMs) => notify({ variant: "success", title, description, durationMs }),
      error: (title, description, durationMs) => notify({ variant: "error", title, description, durationMs }),
      info: (title, description, durationMs) => notify({ variant: "info", title, description, durationMs }),
    };
  }, [notify, dismiss]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          /*
           * A soft wash of the variant colour fading to white, a gradient edge, and a gradient icon
           * badge — noticeable without being heavy: plain CSS gradients, no blur, no images.
           */
          const style =
            t.variant === "success"
              ? {
                  card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white",
                  edge: "from-emerald-400 to-teal-500",
                  badge: "from-emerald-500 to-teal-500",
                  bar: "bg-gradient-to-r from-emerald-400 to-teal-400",
                  title: "text-emerald-950",
                }
              : t.variant === "error"
                ? {
                    card: "border-red-200/80 bg-gradient-to-br from-red-50 via-white to-white",
                    edge: "from-red-500 to-[#780301]",
                    badge: "from-red-500 to-[#780301]",
                    bar: "bg-gradient-to-r from-red-400 to-[#780301]",
                    title: "text-red-950",
                  }
                : {
                    card: "border-orange-200/80 bg-gradient-to-br from-orange-50 via-white to-white",
                    edge: "from-[#FF990A] to-[#780301]",
                    badge: "from-[#FF990A] to-[#e0700a]",
                    bar: "bg-gradient-to-r from-[#FF990A] to-[#780301]",
                    title: "text-[#4a1d00]",
                  };
          const Icon = t.variant === "success" ? CheckCircle2 : t.variant === "error" ? XCircle : Info;
          const timed = typeof t.durationMs === "number" && t.durationMs > 0;

          return (
            <div
              key={t.id}
              role={t.variant === "error" ? "alert" : "status"}
              className={cn(
                "oc-toast-enter relative overflow-hidden rounded-xl border pl-4 pr-2.5 py-3",
                "shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)]",
                style.card,
              )}
            >
              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b", style.edge)} />
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm",
                    style.badge,
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className={cn("text-sm font-semibold", style.title)}>{t.title}</p>
                  {t.description ? (
                    <p className="mt-0.5 text-xs text-black/70 whitespace-pre-wrap break-words">{t.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="flex-none rounded-md p-1 text-black/45 hover:text-black/80 hover:bg-black/[0.05] transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {timed ? (
                <span
                  aria-hidden
                  className={cn("oc-toast-timer absolute bottom-0 left-0 h-[3px] w-full opacity-70", style.bar)}
                  style={{ animationDuration: `${t.durationMs}ms` }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useOpticoreToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useOpticoreToast must be used within OpticoreToastProvider");
  }
  return ctx;
}

