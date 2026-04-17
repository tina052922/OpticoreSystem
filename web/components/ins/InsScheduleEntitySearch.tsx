"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type Option = { id: string; name: string };

/**
 * Search narrows options; a single match or exact name match applies the selection immediately (no extra step).
 */
export function InsScheduleEntitySearch({
  label,
  placeholder,
  options,
  selectedId,
  onSelectedIdChange,
  disabled,
  listId,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  disabled?: boolean;
  listId: string;
}) {
  const [q, setQ] = useState("");

  const onSelectedIdChangeRef = useRef(onSelectedIdChange);
  onSelectedIdChangeRef.current = onSelectedIdChange;

  /** Keep the text field aligned when the parent sets `selectedId` (e.g. default section). */
  useEffect(() => {
    if (!selectedId) return;
    const opt = options.find((o) => o.id === selectedId);
    if (opt) setQ(opt.name);
  }, [selectedId, options]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.name.toLowerCase().includes(t));
  }, [options, q]);

  useEffect(() => {
    const t = q.trim().toLowerCase();
    const notify = onSelectedIdChangeRef.current;

    // Empty query must NOT clear selection: parents often re-apply a default id when selection becomes "",
    // which retriggered this effect and caused "Maximum update depth exceeded".
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
  }, [q, filtered, options, selectedId]);

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
