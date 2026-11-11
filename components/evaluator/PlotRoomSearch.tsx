"use client";

import { useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Building, Room } from "@/types/db";
import { searchPlotRooms } from "@/lib/scheduling/program-plot-rooms";
import { insRoomLabel } from "@/lib/ins/ins-room-label";

/**
 * "Search room" box above the Building / Room selects of the plot windows. Typing a room name, code
 * or building lists matches from every building; picking one fills both selects, so nobody has to
 * scroll through the whole campus.
 */
export function PlotRoomSearch({
  rooms,
  buildingsCatalog,
  busyRoomIds,
  currentRoomId,
  disabled,
  onPick,
}: {
  rooms: readonly Room[];
  buildingsCatalog?: readonly Building[];
  busyRoomIds?: ReadonlySet<string>;
  currentRoomId?: string;
  disabled?: boolean;
  onPick: (buildingName: string, roomId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  const hits = useMemo(
    () => searchPlotRooms(rooms, buildingsCatalog, query),
    [rooms, buildingsCatalog, query],
  );
  const open = query.trim().length > 0;

  const isBusy = (id: string) => busyRoomIds?.has(id) === true && id !== currentRoomId;

  function pick(i: number) {
    const hit = hits[i];
    if (!hit || isBusy(hit.room.id)) return;
    onPick(hit.buildingName, hit.room.id);
    setQuery("");
    setActive(0);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" aria-hidden />
        <input
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label="Search room"
          placeholder="Search room or building (e.g. IT Lab 4, COTE 303)…"
          className="w-full rounded-lg border border-black/15 bg-white py-2 pl-8 pr-8 text-[13px] outline-none focus:border-[#780301]/50 focus:ring-2 focus:ring-[#780301]/15 disabled:opacity-50"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, hits.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(active);
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setQuery("");
            }
          }}
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-black/40 hover:text-black/70"
            onClick={() => setQuery("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-black/10 bg-white py-1 text-[13px] shadow-lg"
        >
          {hits.length === 0 ? (
            <li className="px-3 py-2 text-black/50">No room matches “{query.trim()}”.</li>
          ) : (
            hits.map((h, i) => {
              const busy = isBusy(h.room.id);
              const name = insRoomLabel(h.room, h.room.code);
              return (
                <li
                  key={h.room.id}
                  role="option"
                  aria-selected={i === active}
                  aria-disabled={busy}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 ${
                    busy ? "cursor-not-allowed opacity-50" : i === active ? "bg-[#780301]/[0.07]" : "hover:bg-black/[0.03]"
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(i);
                  }}
                >
                  <span className="min-w-0">
                    <span className="font-semibold text-black/85">{name}</span>
                    {name !== h.room.code ? <span className="ml-1.5 text-[11px] text-black/45">{h.room.code}</span> : null}
                    <span className="block truncate text-[11px] text-black/50">{h.buildingName}</span>
                  </span>
                  {busy ? <span className="shrink-0 text-[11px] font-semibold text-red-700">Occupied</span> : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
