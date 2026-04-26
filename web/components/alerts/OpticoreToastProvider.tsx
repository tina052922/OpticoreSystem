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
};

type Ctx = {
  notify: (t: Omit<OpticoreToast, "id"> & { id?: string; durationMs?: number }) => void;
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
        const next = [{ id, variant: t.variant, title: t.title, description: t.description ?? null }, ...prev];
        return next.slice(0, 4);
      });
      const timer = window.setTimeout(() => dismiss(id), durationMs);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const api = useMemo<Ctx>(() => {
    return {
      notify,
      success: (title, description, durationMs) => notify({ variant: "success", title, description, durationMs }),
      error: (title, description, durationMs) => notify({ variant: "error", title, description, durationMs }),
      info: (title, description, durationMs) => notify({ variant: "info", title, description, durationMs }),
    };
  }, [notify]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const accent =
            t.variant === "success"
              ? "border-emerald-200 bg-emerald-50"
              : t.variant === "error"
                ? "border-red-200 bg-red-50"
                : "border-[var(--color-opticore-orange)]/25 bg-[var(--color-opticore-orange)]/10";
          const Icon = t.variant === "success" ? CheckCircle2 : t.variant === "error" ? XCircle : Info;
          const iconColor =
            t.variant === "success"
              ? "text-emerald-700"
              : t.variant === "error"
                ? "text-red-700"
                : "text-[var(--color-opticore-orange)]";

          return (
            <div
              key={t.id}
              role={t.variant === "error" ? "alert" : "status"}
              className={cn(
                "rounded-xl border shadow-sm px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-white/80",
                accent,
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className={cn("mt-0.5 h-5 w-5 flex-none", iconColor)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-black">{t.title}</p>
                  {t.description ? (
                    <p className="mt-0.5 text-xs text-black/70 whitespace-pre-wrap break-words">{t.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="flex-none rounded-md p-1 text-black/50 hover:text-black/80 hover:bg-black/[0.05] transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
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

