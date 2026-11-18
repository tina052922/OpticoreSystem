"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchSelectOption = {
  value: string;
  label: string;
  /** Extra text that is searched and shown in grey (e.g. an email). */
  hint?: string;
};

/**
 * A typeable picker: shows the chosen option's label, and lists matches only once something is typed —
 * no long dropdown to scroll. Matches any word of the label or hint. Arrow keys, Enter, Esc work.
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Type to search…",
  disabled = false,
  className = "",
  maxResults = 8,
  ariaLabel,
  inputClassName,
  id,
}: {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxResults?: number;
  ariaLabel?: string;
  /** Replaces the input's default classes (size, border, ring). */
  inputClassName?: string;
  id?: string;
}) {
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? null;
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q))
      .slice(0, maxResults);
  }, [options, query, maxResults]);

  useEffect(() => setActive(0), [query]);

  // Close when clicking elsewhere.
  useEffect(() => {
    if (!editing) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setEditing(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [editing]);

  function pick(o: SearchSelectOption) {
    onChange(o.value);
    setQuery("");
    setEditing(false);
  }

  const shown = editing ? query : selected ? `${selected.label}${selected.hint ? ` (${selected.hint})` : ""}` : "";
  const open = editing && query.trim().length > 0;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <input
        type="text"
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={`${
          inputClassName ??
          "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#780301]/30"
        } pr-7 disabled:opacity-60`}
        placeholder={selected && !editing ? "" : placeholder}
        value={shown}
        disabled={disabled}
        onFocus={() => setEditing(true)}
        onChange={(e) => {
          setEditing(true);
          setQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setEditing(false);
            setQuery("");
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "ArrowDown" && matches.length) {
            e.preventDefault();
            setActive((i) => Math.min(matches.length - 1, i + 1));
          } else if (e.key === "ArrowUp" && matches.length) {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && open && matches[active]) {
            e.preventDefault();
            pick(matches[active]!);
          }
        }}
      />
      {value && !disabled ? (
        <button
          type="button"
          aria-label="Clear"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1 text-[13px] text-black/45 hover:text-black"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange("");
            setQuery("");
            setEditing(true);
          }}
        >
          ✕
        </button>
      ) : null}
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-black/15 bg-white py-1 text-sm shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-black/45">No match</li>
          ) : (
            matches.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={i === active}
                className={`cursor-pointer px-3 py-1.5 ${i === active ? "bg-[#780301]/10" : "hover:bg-black/[0.04]"}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
              >
                <span className="font-medium">{o.label}</span>
                {o.hint ? <span className="ml-1.5 text-[12px] text-black/50">{o.hint}</span> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
