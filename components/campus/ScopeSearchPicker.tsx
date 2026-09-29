"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  buildScopeOptions,
  findScopeOption,
  scopeOptionLabel,
  searchScopeOptions,
  type ScopeCollege,
  type ScopeOption,
  type ScopeProgram,
} from "@/lib/campus/scope-search";

export type ScopeSelection = {
  collegeId: string | null;
  programId: string | null;
  programCode: string | null;
  collegeCode: string | null;
};

/**
 * One search box in place of the College → Program dropdown pair.
 *
 * Type a code or a name and pick either a college (college-wide) or a department. The list is loaded
 * once and filtered in memory, so it answers on every keystroke.
 */
export function ScopeSearchPicker({
  value,
  onChange,
  label = "College or department",
  placeholder = "Search college, department, code…",
  helpText,
  /** Hide the "All colleges" reset — used where a scope is required. */
  requireScope = false,
  /**
   * `"program"` offers departments only. The Department field on Buildings & Rooms needs this: a
   * college could otherwise be chosen there and would never satisfy "belongs to one department".
   */
  kind = "all",
  withinCollegeId = null,
  className = "",
}: {
  value: { collegeId: string | null; programId: string | null };
  onChange: (scope: ScopeSelection) => void;
  label?: string;
  placeholder?: string;
  helpText?: string;
  requireScope?: boolean;
  kind?: "all" | "program";
  /**
   * College Admin: only this college and its departments are offered, and the scope cannot be
   * cleared back to campus-wide.
   */
  withinCollegeId?: string | null;
  className?: string;
}) {
  const [colleges, setColleges] = useState<ScopeCollege[]>([]);
  const [programs, setPrograms] = useState<ScopeProgram[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  /** True while re-picking an already-chosen scope. */
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { apiFetch } = await import("@/lib/api/client");
        const [c, p] = await Promise.all([
          apiFetch<{ colleges: ScopeCollege[] }>("/api/catalog/colleges", { method: "GET" }),
          apiFetch<{ programs: ScopeProgram[] }>("/api/catalog/programs", { method: "GET" }),
        ]);
        if (cancelled) return;
        setColleges(c.colleges ?? []);
        setPrograms(p.programs ?? []);
      } catch {
        if (!cancelled) {
          setColleges([]);
          setPrograms([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    const all = buildScopeOptions(colleges, programs);
    const byKind = kind === "program" ? all.filter((o) => o.kind === "program") : all;
    if (!withinCollegeId) return byKind;
    return byKind.filter((o) => o.collegeId === withinCollegeId);
  }, [colleges, programs, kind, withinCollegeId]);
  const selected = useMemo(() => findScopeOption(options, value), [options, value]);
  const matches = useMemo(() => searchScopeOptions(options, query), [options, query]);

  // Close when the click lands outside, so the list never sits over the form.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Clicking away from a re-pick keeps the scope that was already chosen.
        setEditing(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function pick(option: ScopeOption) {
    onChange({
      collegeId: option.collegeId,
      programId: option.programId,
      programCode: option.programId ? option.code : null,
      collegeCode: option.kind === "college" ? option.code : option.parentLabel || null,
    });
    setQuery("");
    setOpen(false);
    setEditing(false);
  }

  function clear() {
    onChange({ collegeId: null, programId: null, programCode: null, collegeCode: null });
    setQuery("");
    setOpen(false);
    setEditing(false);
  }

  /**
   * The search box replaces the chip while editing. Without this a picked scope was final: "Change"
   * opened a list that was never rendered, because both the input and the list were hidden as soon
   * as something was selected.
   */
  const showSearch = !selected || editing;

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <div className="text-[12px] font-semibold text-black/75 mb-1">{label}</div>

      {!showSearch && selected ? (
        <div className="flex items-center gap-2 rounded-md border border-black/20 bg-white px-3 h-10">
          <span className="truncate text-sm">
            <span className="font-semibold">{selected.code}</span>
            <span className="text-black/55"> — {selected.name}</span>
            {selected.parentLabel ? <span className="text-black/40"> · {selected.parentLabel}</span> : null}
          </span>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="text-[11px] font-semibold text-[#780301] hover:underline"
              onClick={() => {
                setEditing(true);
                setOpen(true);
                setQuery("");
              }}
            >
              Change
            </button>
            {requireScope || withinCollegeId ? null : (
              <button
                type="button"
                aria-label="Clear scope"
                className="rounded p-1 text-black/45 hover:bg-black/[0.05] hover:text-black/70"
                onClick={clear}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={loading ? "Loading…" : placeholder}
            disabled={loading}
            className="pl-9"
            role="combobox"
            aria-expanded={open}
            autoComplete="off"
          />
        </div>
      )}

      {helpText ? <p className="mt-1 text-[11px] text-black/50">{helpText}</p> : null}

      {open && showSearch ? (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-black/10 bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)]">
          {matches.length === 0 ? (
            <li className="px-2.5 py-3 text-sm text-black/50">
              Nothing matches “{query.trim()}”.
            </li>
          ) : (
            matches.map((option) => (
              <li key={option.key}>
                <button
                  type="button"
                  className="flex w-full items-baseline gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-black/[0.055]"
                  onClick={() => pick(option)}
                >
                  <span className="text-sm font-semibold">{option.code}</span>
                  <span className="truncate text-[12px] text-black/55">{option.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-black/40">
                    {option.kind === "college" ? "College" : option.parentLabel || "Department"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

export { scopeOptionLabel };
