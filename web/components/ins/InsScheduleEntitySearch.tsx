"use client";

import { useEffect, useMemo, useState } from "react";
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

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.name.toLowerCase().includes(t));
  }, [options, q]);

  useEffect(() => {
    const t = q.trim().toLowerCase();
    if (!t) {
      if (selectedId) onSelectedIdChange("");
      return;
    }
    if (filtered.length === 1) {
      if (filtered[0]!.id !== selectedId) onSelectedIdChange(filtered[0]!.id);
      return;
    }
    const exact = options.find((o) => o.name.trim().toLowerCase() === t);
    if (exact) {
      if (exact.id !== selectedId) onSelectedIdChange(exact.id);
      return;
    }
    if (selectedId && !filtered.some((f) => f.id === selectedId)) {
      onSelectedIdChange("");
    }
  }, [q, filtered, options, selectedId, onSelectedIdChange]);

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
