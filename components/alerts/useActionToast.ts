"use client";

import { useCallback, useMemo } from "react";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";
import { isDeveloperMessage, reportUserError } from "@/lib/ui/user-message";

/**
 * How a page reports the outcome of something the person did.
 *
 * Pages used to keep `error` and `success` in state and render a coloured `<p>` somewhere on the
 * form. That has two problems: the message appears wherever the markup happens to sit rather than
 * where the person is looking, and it shows whatever text the failure arrived with — including
 * `Cannot reach API (Failed to fetch)` and the occasional migration filename.
 *
 * This raises a toast instead, and runs every failure through `reportUserError`, which keeps the
 * technical detail in the console and shows the person something they can act on.
 */
export type ActionToast = {
  /** Something worked. Keep the title short; it is read at a glance. */
  ok: (title: string, detail?: string | null) => void;
  /**
   * Something failed. `fallbackTitle` says what was being attempted, in a person's words —
   * "Could not save the subject" — and is used when the error has nothing presentable of its own.
   */
  fail: (err: unknown, fallbackTitle: string, context?: string) => void;
  /** A refusal the app decided on its own, with no underlying error to translate. */
  refuse: (title: string, detail?: string | null) => void;
  /** Neutral news: nothing succeeded or failed, there is just something worth saying. */
  note: (title: string, detail?: string | null) => void;
  /**
   * A caveat the server returned alongside a success — "saved, but not all of it".
   *
   * These are often written for whoever maintains the system ("run migration 016_… on the
   * database"), so the text is only shown when it reads as something the person can act on.
   */
  caution: (message: string | null | undefined, fallbackTitle: string) => void;
};

export function useActionToast(): ActionToast {
  const toast = useOpticoreToast();

  const ok = useCallback(
    (title: string, detail?: string | null) => toast.success(title, detail ?? null),
    [toast],
  );

  const fail = useCallback(
    (err: unknown, fallbackTitle: string, context?: string) => {
      const { title, detail } = reportUserError(err, fallbackTitle, context);
      toast.error(title, detail ?? null);
    },
    [toast],
  );

  const refuse = useCallback(
    (title: string, detail?: string | null) => toast.error(title, detail ?? null),
    [toast],
  );

  const note = useCallback(
    (title: string, detail?: string | null) => toast.info(title, detail ?? null),
    [toast],
  );

  const caution = useCallback(
    (message: string | null | undefined, fallbackTitle: string) => {
      const text = (message ?? "").trim();
      if (!text) return;
      if (isDeveloperMessage(text)) {
        if (typeof console !== "undefined") console.warn(`[opticore] ${fallbackTitle}`, text);
        toast.info(fallbackTitle, "Some details could not be stored. Tell your administrator.");
        return;
      }
      toast.info(fallbackTitle, text);
    },
    [toast],
  );

  return useMemo(
    () => ({ ok, fail, refuse, note, caution }),
    [ok, fail, refuse, note, caution],
  );
}
