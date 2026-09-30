"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type Option = { id: string; name: string };

export type InsScheduleEntityPickerMode = "search" | "select";

/**
 * Picker for the INS section / room forms.
 *
 * `select` is a plain dropdown with no effects at all. It is what the read-only portals use: a
 * faculty member has a handful of sections, and a free-text box that guesses at your selection as
 * you type is a worse way to choose between three things than a list of three things.
 *
 * `search` keeps the type-ahead for the chairman and DOI forms, where the list runs to hundreds.
 */
export function InsScheduleEntitySearch({
  label,
  placeholder,
  options,
  selectedId,
  onSelectedIdChange,
  disabled,
  listId,
  mode = "search",
  emptyLabel = "Select…",
}: {
  label: string;
  placeholder: string;
  options: Option[];
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  disabled?: boolean;
  listId: string;
  mode?: InsScheduleEntityPickerMode;
  emptyLabel?: string;
}) {
  const [q, setQ] = useState("");

  const onSelectedIdChangeRef = useRef(onSelectedIdChange);
  onSelectedIdChangeRef.current = onSelectedIdChange;

  const lastExternalIdRef = useRef<string>("");

  /**
   * The option list, reduced to something that only changes when the options really do.
   *
   * The catalog rebuilds this array on most renders, so depending on its identity made the effect
   * below run every render — and a single `notify` inside it then re-rendered the parent, which
   * rebuilt the array, which ran the effect again. That is the "Maximum update depth exceeded" this
   * component has been blamed for twice.
   */
  const optionsKey = useMemo(() => options.map((o) => `${o.id}:${o.name}`).join("|"), [options]);

  /**
   * Keep the text field aligned only when the parent *externally* changes `selectedId` (e.g. a deep
   * link or the initial load), never while the user is typing.
   */
  useEffect(() => {
    if (mode !== "search") return;
    if (!selectedId) return;
    if (selectedId === lastExternalIdRef.current) return;
    lastExternalIdRef.current = selectedId;
    const opt = options.find((o) => o.id === selectedId);
    if (opt) setQ(opt.name);
    // `optionsKey` stands in for `options` on purpose; see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedId, optionsKey]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.name.toLowerCase().includes(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey, q]);

  useEffect(() => {
    if (mode !== "search") return;
    const t = q.trim().toLowerCase();
    const notify = onSelectedIdChangeRef.current;

    // An empty query must NOT clear the selection: parents re-apply a default id when selection
    // becomes "", which retriggers this effect.
    if (!t) return;

    if (filtered.length === 1) {
      if (filtered[0]!.id !== selectedId) notify(filtered[0]!.id);
      return;
    }
    const exact = options.find((o) => o.name.trim().toLowerCase() === t);
    if (exact) {
      if (exact.id !== selectedId) notify(exact.id);
      return;
    }
    if (selectedId && !filtered.some((f) => f.id === selectedId)) {
      notify("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, q, filtered, optionsKey, selectedId]);

  if (mode === "select") {
    return (
      <div className="w-full lg:max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={listId}>
          {label}
        </label>
        <select
          id={listId}
          className="h-9 w-full rounded-md border border-black/15 bg-white px-2 text-sm outline-none transition focus-visible:ring-[3px] focus-visible:ring-black/10 disabled:opacity-60"
          value={selectedId}
          disabled={disabled}
          onChange={(e) => onSelectedIdChange(e.target.value)}
        >
          <option value="">{options.length === 0 ? "None available" : emptyLabel}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="w-full lg:max-w-md">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <Input
        list={listId}
        placeholder={placeholder}
        className="bg-white"
        aria-label={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={disabled}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.id} value={o.name} />
        ))}
      </datalist>
    </div>
  );
}
