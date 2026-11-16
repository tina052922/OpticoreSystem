"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type Option = { id: string; name: string };

/** Kept so existing call sites compile; every picker is now the same type-to-search box. */
export type InsScheduleEntityPickerMode = "search" | "select";

/** How many matches the list shows at once; typing more narrows it. */
const MAX_RESULTS = 50;

/**
 * Search box for the INS Forms pickers (section, room, faculty), for every role that opens them.
 *
 * It starts EMPTY — nothing is pre-selected — and shows matching names as you type. Picking one
 * (click, or arrows + Enter) selects it; clearing the box clears the selection. A selection made from
 * outside (a link such as "View schedule" or `?section=…`) fills the box with that name.
 *
 * It replaces a plain dropdown that arrived with the first section already chosen and could not be
 * typed into.
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
  /** Ignored — kept for older call sites. */
  mode?: InsScheduleEntityPickerMode;
  /** Ignored — kept for older call sites. */
  emptyLabel?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputId = useId();
  const listRef = useRef<HTMLUListElement | null>(null);

  const onChangeRef = useRef(onSelectedIdChange);
  onChangeRef.current = onSelectedIdChange;

  /**
   * The catalog rebuilds `options` on most renders; depend on its content, not its identity, or the
   * effects below loop ("Maximum update depth exceeded").
   */
  const optionsKey = useMemo(() => options.map((o) => `${o.id}:${o.name}`).join("|"), [options]);

  /** Show the selected name when the selection is set from outside (deep link, "View schedule"). */
  const shownForIdRef = useRef("");
  useEffect(() => {
    if (!selectedId) {
      shownForIdRef.current = "";
      return;
    }
    if (selectedId === shownForIdRef.current) return;
    const opt = options.find((o) => o.id === selectedId);
    if (!opt) return;
    shownForIdRef.current = selectedId;
    setQ(opt.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, optionsKey]);

  const matches = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return options
      .filter((o) => {
        const name = o.name.toLowerCase();
        return words.every((w) => name.includes(w));
      })
      .slice(0, MAX_RESULTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey, q]);

  useEffect(() => setActive(0), [q]);

  // Keep the highlighted row in view while moving with the arrow keys.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(o: Option) {
    shownForIdRef.current = o.id;
    setQ(o.name);
    setOpen(false);
    if (o.id !== selectedId) onChangeRef.current(o.id);
  }

  function onType(next: string) {
    setQ(next);
    setOpen(true);
    if (!next.trim()) {
      // An empty box means nothing is selected.
      shownForIdRef.current = "";
      if (selectedId) onChangeRef.current("");
      return;
    }
    // Typing a name exactly selects it; editing away from the selected name drops the selection.
    const exact = options.find((o) => o.name.trim().toLowerCase() === next.trim().toLowerCase());
    if (exact) {
      shownForIdRef.current = exact.id;
      if (exact.id !== selectedId) onChangeRef.current(exact.id);
    } else if (selectedId) {
      shownForIdRef.current = "";
      onChangeRef.current("");
    }
  }

  function clear() {
    shownForIdRef.current = "";
    setQ("");
    setOpen(false);
    if (selectedId) onChangeRef.current("");
  }

  const showList = open && q.trim().length > 0;

  return (
    <div className="relative w-full lg:max-w-md">
      <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" aria-hidden />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder={options.length === 0 && !disabled ? "None available" : placeholder}
          className="h-9 w-full rounded-md border border-black/15 bg-white py-1 pl-8 pr-8 text-sm outline-none transition focus-visible:ring-[3px] focus-visible:ring-black/10 disabled:opacity-60"
          value={q}
          disabled={disabled}
          onChange={(e) => onType(e.target.value)}
          onFocus={() => q.trim() && setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, Math.max(matches.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              const pick = matches[active];
              if (showList && pick) {
                e.preventDefault();
                choose(pick);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {q && !disabled ? (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-black/40 hover:text-black/70"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {showList ? (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-black/10 bg-white py-1 text-sm shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-black/50">No match for “{q.trim()}”.</li>
          ) : (
            matches.map((o, i) => (
              <li
                key={o.id}
                role="option"
                data-index={i}
                aria-selected={o.id === selectedId}
                className={`cursor-pointer px-3 py-1.5 ${
                  i === active ? "bg-[#780301]/[0.08]" : "hover:bg-black/[0.03]"
                } ${o.id === selectedId ? "font-semibold text-[#780301]" : "text-black/85"}`}
                onMouseEnter={() => setActive(i)}
                // mousedown, not click: the input's blur would close the list first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
              >
                {o.name}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
