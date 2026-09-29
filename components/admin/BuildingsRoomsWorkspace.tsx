"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildingsRoomsApi, ApiClientError } from "@/lib/api/client";
import { ScopeSearchPicker } from "@/components/campus/ScopeSearchPicker";
import { scrollIntoAppView } from "@/lib/ui/scroll-into-app-view";
import type { Building, Room } from "@/types/db";

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Prefer FK; fall back to building name when migration columns were incomplete. */
function roomBelongsToBuilding(room: Room, building: Building): boolean {
  if (room.buildingId && room.buildingId === building.id) return true;
  if (!room.buildingId && norm(room.building) && norm(room.building) === norm(building.name)) {
    return true;
  }
  return false;
}

export function BuildingsRoomsWorkspace({
  scopeCollegeId,
  scopeProgramId,
  scopeProgramCode,
}: {
  scopeCollegeId: string | null;
  scopeProgramId: string | null;
  scopeProgramCode?: string | null;
}) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [buildingName, setBuildingName] = useState("");
  const [buildingCode, setBuildingCode] = useState("");
  const [floorCount, setFloorCount] = useState("2");
  const [gecUsable, setGecUsable] = useState(false);
  const [savingBuilding, setSavingBuilding] = useState(false);
  /** Quick add inside the "Rooms in …" panel, for a building that already exists. */
  const [panelAddOpen, setPanelAddOpen] = useState(false);
  const [panelRoomCode, setPanelRoomCode] = useState("");
  const [panelRoomFloor, setPanelRoomFloor] = useState("1");
  const [panelRoomCapacity, setPanelRoomCapacity] = useState("");
  const [savingPanelRoom, setSavingPanelRoom] = useState(false);
  /**
   * Rooms typed on the same form as the building.
   *
   * With no building name these are saved as standalone rooms, which is why the department is
   * required: a room with neither a building nor a department belongs to nobody and cannot be
   * plotted by any chairman.
   */
  const [newRooms, setNewRooms] = useState<{ code: string; floor: string; capacity: string }[]>([
    { code: "", floor: "1", capacity: "" },
  ]);
  /** Department for this form; defaults to the page scope but can be set per entry. */
  const [formScope, setFormScope] = useState<{ collegeId: string | null; programId: string | null }>({
    collegeId: null,
    programId: null,
  });

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editBuildingName, setEditBuildingName] = useState("");
  const [editBuildingCode, setEditBuildingCode] = useState("");
  const [editFloorCount, setEditFloorCount] = useState("1");
  const [editRoomCode, setEditRoomCode] = useState("");
  const [editRoomFloor, setEditRoomFloor] = useState("1");
  const [editRoomCapacity, setEditRoomCapacity] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  /**
   * Follow the page scope only when it names a department, and never overwrite one already chosen
   * here. A College Admin's scope is their college with no department, which used to land in this
   * field as the college itself — unchangeable, and never a valid department.
   */
  useEffect(() => {
    if (!scopeProgramId) return;
    setFormScope({ collegeId: scopeCollegeId, programId: scopeProgramId });
  }, [scopeCollegeId, scopeProgramId]);

  /** A department is what makes a building or a standalone room belong to someone. */
  const canEdit = Boolean(formScope.programId);

  const load = useCallback(async () => {
    // No college in scope means "all colleges": list every building rather than nothing.
    setLoading(true);
    setError(null);
    try {
      const [bRes, rRes] = await Promise.all([
        buildingsRoomsApi.listBuildings({
          collegeId: scopeCollegeId || null,
          programId: scopeProgramId || null,
        }),
        buildingsRoomsApi.listRooms({
          collegeId: scopeCollegeId || null,
          programId: scopeProgramId || null,
        }),
      ]);
      const nextBuildings = bRes.buildings ?? [];
      const incomingRooms = rRes.rooms ?? [];
      setBuildings(nextBuildings);
      setRooms((prev) => {
        const byId = new Map(incomingRooms.map((r) => [r.id, r]));
        // Keep client-side building links when the API omitted buildingId (partial migration).
        for (const local of prev) {
          const server = byId.get(local.id);
          if (!server) continue;
          if (!server.buildingId && local.buildingId) {
            byId.set(local.id, {
              ...server,
              buildingId: local.buildingId,
              building: server.building ?? local.building,
              programId: server.programId ?? local.programId,
            });
          }
        }
        return [...byId.values()];
      });
      setWarning(bRes.warning ?? null);
      setSelectedBuildingId((prev) => {
        if (prev && nextBuildings.some((b) => b.id === prev)) return prev;
        return null;
      });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to load buildings.");
    } finally {
      setLoading(false);
    }
  }, [scopeCollegeId, scopeProgramId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * "Manage rooms" selects a building whose panel renders below the lists. On a long page that is
   * off-screen, so the click looked like it did nothing — bring the panel into view.
   */
  const roomsPanelRef = useRef<HTMLDivElement | null>(null);
  const alertsRef = useRef<HTMLDivElement | null>(null);
  const scrollToRoomsRef = useRef(false);

  function openRoomsFor(buildingId: string) {
    scrollToRoomsRef.current = true;
    setSelectedBuildingId(buildingId);
  }

  useEffect(() => {
    if (!error && !success && !warning) return;
    scrollIntoAppView(alertsRef.current);
  }, [error, success, warning]);

  useEffect(() => {
    setPanelAddOpen(false);
    setPanelRoomCode("");
    setPanelRoomCapacity("");
    setPanelRoomFloor("1");
  }, [selectedBuildingId]);

  useEffect(() => {
    if (!selectedBuildingId || !scrollToRoomsRef.current) return;
    scrollToRoomsRef.current = false;
    scrollIntoAppView(roomsPanelRef.current);
  }, [selectedBuildingId]);

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId],
  );

  const searchQ = norm(search);

  const filteredBuildings = useMemo(() => {
    if (!searchQ) return buildings;
    return buildings.filter((b) => {
      if (norm(b.name).includes(searchQ) || norm(b.code).includes(searchQ)) return true;
      return rooms.some(
        (r) =>
          roomBelongsToBuilding(r, b) &&
          (norm(r.code).includes(searchQ) || norm(r.displayName).includes(searchQ)),
      );
    });
  }, [buildings, rooms, searchQ]);

  const roomsInSelected = useMemo(() => {
    if (!selectedBuilding) return [];
    return rooms
      .filter((r) => roomBelongsToBuilding(r, selectedBuilding))
      .filter((r) => {
        if (!searchQ) return true;
        return (
          norm(r.code).includes(searchQ) ||
          norm(r.displayName).includes(searchQ) ||
          norm(selectedBuilding.name).includes(searchQ) ||
          norm(selectedBuilding.code).includes(searchQ)
        );
      })
      .sort((a, b) => (a.floor ?? 0) - (b.floor ?? 0) || a.code.localeCompare(b.code));
  }, [rooms, selectedBuilding, searchQ]);

  const roomsByFloor = useMemo(() => {
    const map = new Map<number | "unassigned", Room[]>();
    for (const r of roomsInSelected) {
      const key = r.floor != null && r.floor >= 1 ? r.floor : "unassigned";
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    const floors = [...map.keys()].sort((a, b) => {
      if (a === "unassigned") return 1;
      if (b === "unassigned") return -1;
      return a - b;
    });
    return floors.map((floor) => ({ floor, rooms: map.get(floor) ?? [] }));
  }, [roomsInSelected]);

  /**
   * Rooms with no building, for the scope in view. Without a list of their own these were invisible:
   * every other view groups rooms under a building.
   */
  const standaloneRooms = useMemo(() => {
    const q = searchQ;
    return rooms
      .filter((r) => !buildings.some((b) => roomBelongsToBuilding(r, b)))
      .filter(
        (r) =>
          !q ||
          norm(r.code).includes(q) ||
          norm(r.displayName).includes(q) ||
          norm(r.building).includes(q),
      )
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [rooms, buildings, searchQ]);

  const floorOptions = useMemo(() => {
    const n = selectedBuilding?.floorCount ?? Math.max(1, parseInt(floorCount, 10) || 1);
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [selectedBuilding?.floorCount, floorCount]);

  function patchNewRoom(index: number, patch: Partial<{ code: string; floor: string; capacity: string }>) {
    setNewRooms((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function resetCreateForm() {
    setBuildingName("");
    setBuildingCode("");
    setFloorCount("2");
    setGecUsable(false);
    setNewRooms([{ code: "", floor: "1", capacity: "" }]);
  }

  /**
   * Saves the building and its rooms in one go.
   *
   * With no building name, the rooms are saved standalone under the chosen department — the case for
   * a room that is not part of any building on file.
   */
  async function onCreate() {
    const name = buildingName.trim();
    const roomRows = newRooms
      .map((r) => ({ ...r, code: r.code.trim() }))
      .filter((r) => r.code);

    if (!formScope.programId) {
      setError("Choose a department. A building or room has to belong to one.");
      return;
    }
    if (!name && roomRows.length === 0) {
      setError("Enter a building name, one or more room codes, or both.");
      return;
    }

    setSavingBuilding(true);
    setError(null);
    setSuccess(null);
    try {
      let building: Building | null = null;
      if (name) {
        const created = await buildingsRoomsApi.createBuilding({
          name,
          code: buildingCode.trim() || null,
          floorCount: Math.max(1, parseInt(floorCount, 10) || 1),
          collegeId: formScope.collegeId,
          programId: formScope.programId,
          gecUsable,
        });
        building = created.building;
        setBuildings((prev) => {
          const next = prev.some((b) => b.id === created.building.id)
            ? prev.map((b) => (b.id === created.building.id ? created.building : b))
            : [...prev, created.building];
          return next.sort((a, b) => a.name.localeCompare(b.name));
        });
        setSelectedBuildingId(created.building.id);
      }

      const savedRooms: Room[] = [];
      const failed: string[] = [];
      for (const row of roomRows) {
        const floor = Math.max(1, parseInt(row.floor, 10) || 1);
        try {
          const { room, warning: w } = await buildingsRoomsApi.createRoom({
            code: row.code,
            buildingId: building?.id ?? null,
            floor,
            capacity: row.capacity.trim() ? parseInt(row.capacity, 10) : null,
            collegeId: formScope.collegeId,
            programId: formScope.programId,
            gecUsable: building?.gecUsable ?? gecUsable,
            building: building?.name ?? null,
          });
          savedRooms.push({
            ...room,
            buildingId: room.buildingId ?? building?.id ?? null,
            building: room.building ?? building?.name ?? null,
            programId: room.programId ?? formScope.programId,
            collegeId: room.collegeId ?? formScope.collegeId,
            floor: room.floor ?? floor,
            gecUsable: room.gecUsable ?? building?.gecUsable ?? gecUsable,
          });
          if (w) setWarning(w);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "could not be saved";
          failed.push(`${row.code} (${msg})`);
        }
      }

      if (savedRooms.length > 0) {
        setRooms((prev) => {
          const byId = new Map(prev.map((r) => [r.id, r]));
          for (const r of savedRooms) byId.set(r.id, r);
          return [...byId.values()];
        });
      }

      const parts: string[] = [];
      if (building) parts.push(`Building “${building.name}” saved`);
      if (savedRooms.length > 0) {
        parts.push(
          `${savedRooms.length} room${savedRooms.length === 1 ? "" : "s"} added${
            building ? ` under it` : " without a building"
          }`,
        );
      }
      if (parts.length > 0) setSuccess(`${parts.join(" · ")}.`);
      if (failed.length > 0) setError(`Could not save: ${failed.join("; ")}`);
      if (failed.length === 0) resetCreateForm();
      void load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSavingBuilding(false);
    }
  }

  async function onToggleGec(building: Building) {
    setError(null);
    try {
      const { building: updated } = await buildingsRoomsApi.updateBuilding(building.id, {
        gecUsable: !building.gecUsable,
      });
      setBuildings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setRooms((prev) =>
        prev.map((r) =>
          roomBelongsToBuilding(r, building) ? { ...r, gecUsable: updated.gecUsable } : r,
        ),
      );
      setSuccess(
        updated.gecUsable
          ? `“${updated.name}” marked usable for GEC subjects.`
          : `“${updated.name}” removed from GEC-usable set.`,
      );
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to update building.");
    }
  }

  async function onDeleteBuilding(building: Building) {
    if (!window.confirm(`Delete building “${building.name}”? Rooms stay in the catalog but lose this building link.`)) {
      return;
    }
    setError(null);
    try {
      await buildingsRoomsApi.deleteBuilding(building.id);
      setBuildings((prev) => prev.filter((b) => b.id !== building.id));
      setRooms((prev) =>
        prev.map((r) =>
          r.buildingId === building.id ? { ...r, buildingId: null } : r,
        ),
      );
      if (selectedBuildingId === building.id) setSelectedBuildingId(null);
      setSuccess(`Building “${building.name}” deleted.`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to delete building.");
    }
  }

  async function onDeleteRoom(room: Room) {
    if (!window.confirm(`Delete room “${room.code}”?`)) return;
    try {
      await buildingsRoomsApi.deleteRoom(room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      if (editingRoomId === room.id) setEditingRoomId(null);
      setSuccess(`Room “${room.code}” deleted.`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to delete room.");
    }
  }

  /**
   * Adds one room straight into the building whose panel is open.
   *
   * The form at the top of the page creates a building with its rooms; this is for a building that
   * already exists, where opening its panel and typing a code is the whole job.
   */
  async function onAddRoomToOpenBuilding() {
    if (!selectedBuilding) return;
    const code = panelRoomCode.trim();
    if (!code) {
      setError("Room code is required.");
      return;
    }
    setSavingPanelRoom(true);
    setError(null);
    setSuccess(null);
    try {
      const floor = Math.min(
        selectedBuilding.floorCount,
        Math.max(1, parseInt(panelRoomFloor, 10) || 1),
      );
      const capacityRaw = panelRoomCapacity.trim();
      const { room, warning: w } = await buildingsRoomsApi.createRoom({
        code,
        buildingId: selectedBuilding.id,
        floor,
        capacity: capacityRaw === "" ? null : Math.max(0, parseInt(capacityRaw, 10) || 0),
        collegeId: selectedBuilding.collegeId,
        programId: selectedBuilding.programId,
        gecUsable: selectedBuilding.gecUsable,
        building: selectedBuilding.name,
      });
      // Keep the row listable under this building even if the API omitted the link fields.
      const linked: Room = {
        ...room,
        buildingId: room.buildingId ?? selectedBuilding.id,
        building: room.building ?? selectedBuilding.name,
        programId: room.programId ?? selectedBuilding.programId,
        collegeId: room.collegeId ?? selectedBuilding.collegeId,
        floor: room.floor ?? floor,
        gecUsable: room.gecUsable ?? selectedBuilding.gecUsable,
      };
      setRooms((prev) => {
        const byId = new Map(prev.map((r) => [r.id, r]));
        byId.set(linked.id, linked);
        return [...byId.values()];
      });
      setPanelRoomCode("");
      setPanelRoomCapacity("");
      setSuccess(`Room \u201c${linked.code}\u201d added to ${selectedBuilding.name}.`);
      if (w) setWarning(w);
      void load();
    } catch (e) {
      setError(
        e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to save room.",
      );
    } finally {
      setSavingPanelRoom(false);
    }
  }

  function startEditBuilding(b: Building) {
    setEditingBuildingId(b.id);
    setEditBuildingName(b.name);
    setEditBuildingCode(b.code ?? "");
    setEditFloorCount(String(b.floorCount ?? 1));
    setError(null);
    setSuccess(null);
  }

  async function onSaveBuildingEdit() {
    if (!editingBuildingId) return;
    const name = editBuildingName.trim();
    if (!name) {
      setError("Building name is required.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const { building: updated } = await buildingsRoomsApi.updateBuilding(editingBuildingId, {
        name,
        code: editBuildingCode.trim() || null,
        floorCount: Math.min(50, Math.max(1, parseInt(editFloorCount, 10) || 1)),
      });
      setBuildings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setRooms((prev) =>
        prev.map((r) =>
          r.buildingId === updated.id ? { ...r, building: updated.name } : r,
        ),
      );
      setEditingBuildingId(null);
      setSuccess(`Building “${updated.name}” updated.`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to update building.");
    } finally {
      setSavingEdit(false);
    }
  }

  function startEditRoom(r: Room) {
    setEditingRoomId(r.id);
    setEditRoomCode(r.code);
    setEditRoomFloor(String(r.floor ?? 1));
    setEditRoomCapacity(r.capacity != null ? String(r.capacity) : "");
    setError(null);
    setSuccess(null);
  }

  async function onSaveRoomEdit() {
    if (!editingRoomId) return;
    const code = editRoomCode.trim();
    if (!code) {
      setError("Room code is required.");
      return;
    }
    /**
     * A room with no building is edited from its own list, so there is no `selectedBuilding` to read
     * the floor cap or the links from. Saving used to return silently in that case.
     */
    const editingRoom = rooms.find((r) => r.id === editingRoomId) ?? null;
    const building =
      selectedBuilding && editingRoom && roomBelongsToBuilding(editingRoom, selectedBuilding)
        ? selectedBuilding
        : null;

    setSavingEdit(true);
    setError(null);
    try {
      const floorCap = building?.floorCount ?? 50;
      const floor = Math.min(floorCap, Math.max(1, parseInt(editRoomFloor, 10) || 1));
      const capacityRaw = editRoomCapacity.trim();
      const { room: updated } = await buildingsRoomsApi.updateRoom(editingRoomId, {
        code,
        floor,
        capacity: capacityRaw === "" ? null : Math.max(0, parseInt(capacityRaw, 10) || 0),
        // Keep a standalone room standalone: only a room inside a building carries the links.
        building: building?.name ?? editingRoom?.building ?? null,
        buildingId: building?.id ?? editingRoom?.buildingId ?? null,
        programId: editingRoom?.programId ?? scopeProgramId,
        collegeId: editingRoom?.collegeId ?? scopeCollegeId,
        gecUsable: building?.gecUsable ?? editingRoom?.gecUsable ?? false,
      });
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setEditingRoomId(null);
      setSuccess(`Room “${updated.code}” updated.`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to update room.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-8 space-y-6 max-w-[1100px]">
      <p className="text-[13px] text-black/65 leading-relaxed">
        Create buildings, set floor counts, and add rooms for the selected department. Those rooms are available
        only to that department when plotting. Mark a building as GEC-usable so GEC subjects can be assigned there.
        This is for scheduling only — it does not affect Campus Navigation.
      </p>

      {!canEdit ? (
        <p className="text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {scopeCollegeId
            ? "Pick a department above to add or edit — a building belongs to one. The list below shows every building in this college."
            : "Showing every building on campus. Pick a college and department above to add or edit."}
        </p>
      ) : null}

      {/* Row actions happen far down the page; `alertsRef` brings their outcome into view. */}
      <div ref={alertsRef} className="space-y-3 scroll-mt-4 empty:hidden">
        {warning ? (
          <p className="text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {warning}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2" role="status">
            {success}
          </p>
        ) : null}
      </div>

      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-5">
        <div>
          <div className="text-[16px] font-semibold">Add building and rooms</div>
          <p className="text-[12px] text-black/55 mt-0.5">
            Fill both halves to create a building with its rooms, or leave the building blank to add
            standalone rooms to a department.
          </p>
        </div>

        <ScopeSearchPicker
          value={formScope}
          onChange={(next) => setFormScope({ collegeId: next.collegeId, programId: next.programId })}
          label="Department"
          placeholder="Search a department — code or name"
          helpText="Required. A building, and any standalone room, belongs to one department."
          requireScope
          kind="program"
          className="max-w-xl"
        />

        <div className="space-y-3">
          <div className="text-[13px] font-semibold text-black/80">Building (optional)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[12px] font-semibold text-black/75">Building name</span>
              <Input
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="e.g. Technology Building"
                disabled={!canEdit || savingBuilding}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[12px] font-semibold text-black/75">Code</span>
              <Input
                value={buildingCode}
                onChange={(e) => setBuildingCode(e.target.value)}
                placeholder="e.g. TECH"
                disabled={!canEdit || savingBuilding}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[12px] font-semibold text-black/75">Number of floors</span>
              <Input
                type="number"
                min={1}
                max={50}
                value={floorCount}
                onChange={(e) => setFloorCount(e.target.value)}
                disabled={!canEdit || savingBuilding}
              />
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-[13px] text-black/80">
            <input
              type="checkbox"
              checked={gecUsable}
              onChange={(e) => setGecUsable(e.target.checked)}
              disabled={!canEdit || savingBuilding}
            />
            Usable for GEC subjects
          </label>
        </div>

        <div className="space-y-3 border-t border-black/10 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-[13px] font-semibold text-black/80">Rooms</div>
            <p className="text-[11px] text-black/50">
              {buildingName.trim()
                ? "Saved inside the building above."
                : "No building name — these are saved as standalone rooms for the department."}
            </p>
          </div>

          {newRooms.map((row, i) => (
            <div key={`new-room-${i}`} className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_7rem_auto] gap-3 items-end">
              <label className="space-y-1">
                <span className="text-[12px] font-semibold text-black/75">Room code</span>
                <Input
                  value={row.code}
                  onChange={(e) => patchNewRoom(i, { code: e.target.value })}
                  placeholder="e.g. TECH 101"
                  disabled={!canEdit || savingBuilding}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[12px] font-semibold text-black/75">Floor</span>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={row.floor}
                  onChange={(e) => patchNewRoom(i, { floor: e.target.value })}
                  disabled={!canEdit || savingBuilding}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[12px] font-semibold text-black/75">Capacity</span>
                <Input
                  type="number"
                  min={0}
                  value={row.capacity}
                  onChange={(e) => patchNewRoom(i, { capacity: e.target.value })}
                  placeholder="optional"
                  disabled={!canEdit || savingBuilding}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                className="h-10 text-[12px]"
                disabled={savingBuilding || newRooms.length === 1}
                onClick={() => setNewRooms((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="h-9 text-[12px]"
            disabled={!canEdit || savingBuilding}
            onClick={() => setNewRooms((prev) => [...prev, { code: "", floor: "1", capacity: "" }])}
          >
            + Add another room
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={!canEdit || savingBuilding}
            onClick={() => void onCreate()}
          >
            {savingBuilding ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={savingBuilding}
            onClick={() => resetCreateForm()}
          >
            Clear form
          </Button>
          {!canEdit ? (
            <span className="text-[12px] text-amber-900">Choose a department to save.</span>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="p-4 border-b border-black/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[16px] font-semibold">Department buildings</div>
            <div className="text-[12px] text-black/55">
              {loading ? "Loading…" : `${filteredBuildings.length} building${filteredBuildings.length === 1 ? "" : "s"}`}
              {scopeProgramCode ? ` · ${scopeProgramCode}` : ""}
            </div>
          </div>
          <label className="min-w-[220px] flex-1 max-w-sm space-y-1">
            <span className="sr-only">Search buildings or rooms</span>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by building or room…"
              // Not gated on a college: the list is campus-wide until a scope is chosen, so the
              // search has to work there too.
              disabled={loading}
            />
          </label>
        </div>
        {filteredBuildings.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-black/50">
            {buildings.length === 0
              ? "No buildings for this department yet."
              : "No buildings or rooms match your search."}
          </p>
        ) : (
          <ul className="divide-y divide-black/10">
            {filteredBuildings.map((b) => {
              const count = rooms.filter((r) => roomBelongsToBuilding(r, b)).length;
              const active = selectedBuildingId === b.id;
              return (
                <li key={b.id} className={active ? "bg-[#fdf6f5]" : "bg-white"}>
                  {editingBuildingId === b.id ? (
                    <div className="px-4 py-3 flex flex-wrap items-end gap-2">
                      <label className="space-y-1 flex-1 min-w-[160px]">
                        <span className="text-[11px] text-black/60">Name</span>
                        <Input
                          value={editBuildingName}
                          onChange={(e) => setEditBuildingName(e.target.value)}
                          disabled={savingEdit}
                        />
                      </label>
                      <label className="space-y-1 w-28">
                        <span className="text-[11px] text-black/60">Code</span>
                        <Input
                          value={editBuildingCode}
                          onChange={(e) => setEditBuildingCode(e.target.value)}
                          disabled={savingEdit}
                        />
                      </label>
                      <label className="space-y-1 w-24">
                        <span className="text-[11px] text-black/60">Floors</span>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={editFloorCount}
                          onChange={(e) => setEditFloorCount(e.target.value)}
                          disabled={savingEdit}
                        />
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#780301] text-white hover:bg-[#5a0201]"
                        disabled={savingEdit}
                        onClick={() => void onSaveBuildingEdit()}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={savingEdit}
                        onClick={() => setEditingBuildingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                  <div className="px-4 py-3 flex flex-wrap items-center gap-2 justify-between">
                    <button
                      type="button"
                      className="text-left min-w-0"
                      onClick={() => setSelectedBuildingId(b.id)}
                    >
                      <div className="font-semibold text-[14px] text-[#780301]">{b.name}</div>
                      <div className="text-[12px] text-black/55">
                        {b.floorCount} floor{b.floorCount === 1 ? "" : "s"} · {count} room
                        {count === 1 ? "" : "s"}
                        {b.gecUsable ? " · GEC-usable" : ""}
                      </div>
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEditBuilding(b)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void onToggleGec(b)}>
                        {b.gecUsable ? "Unset GEC" : "Mark GEC"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-pressed={active}
                        className={active ? "border-[#780301] text-[#780301]" : undefined}
                        onClick={() => openRoomsFor(b.id)}
                      >
                        {active ? "Viewing rooms" : "Manage rooms"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void onDeleteBuilding(b)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {standaloneRooms.length > 0 ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-3">
          <div>
            <div className="text-[16px] font-semibold">Rooms without a building</div>
            <p className="text-[12px] text-black/55 mt-0.5">
              {standaloneRooms.length} room{standaloneRooms.length === 1 ? "" : "s"} that belong to a
              department but sit in no building on file. They are plottable exactly like any other room.
            </p>
          </div>
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
            {standaloneRooms.map((r) => (
              <li
                key={r.id}
                className={`flex flex-wrap items-center gap-2 px-3 py-2 ${
                  editingRoomId === r.id ? "bg-amber-50/80" : ""
                }`}
              >
                {editingRoomId === r.id ? (
                  /* Edit in place: a room with no building has no other panel to open. */
                  <div className="flex w-full flex-wrap items-end gap-2">
                    <label className="space-y-1 flex-1 min-w-[140px]">
                      <span className="text-[11px] text-black/60">Room code</span>
                      <Input
                        value={editRoomCode}
                        onChange={(e) => setEditRoomCode(e.target.value)}
                        disabled={savingEdit}
                      />
                    </label>
                    <label className="space-y-1 w-24">
                      <span className="text-[11px] text-black/60">Floor</span>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={editRoomFloor}
                        onChange={(e) => setEditRoomFloor(e.target.value)}
                        disabled={savingEdit}
                      />
                    </label>
                    <label className="space-y-1 w-28">
                      <span className="text-[11px] text-black/60">Capacity</span>
                      <Input
                        type="number"
                        min={0}
                        value={editRoomCapacity}
                        onChange={(e) => setEditRoomCapacity(e.target.value)}
                        placeholder="optional"
                        disabled={savingEdit}
                      />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[#780301] text-white hover:bg-[#5a0201]"
                      disabled={savingEdit}
                      onClick={() => void onSaveRoomEdit()}
                    >
                      {savingEdit ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingEdit}
                      onClick={() => setEditingRoomId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-[13px] font-semibold">{r.code}</span>
                    <span className="text-[12px] text-black/55">
                      Floor {r.floor ?? 1}
                      {r.capacity ? ` · ${r.capacity} seats` : ""}
                    </span>
                    <div className="ml-auto flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => startEditRoom(r)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void onDeleteRoom(r)}>
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {selectedBuilding ? (
        <div
          ref={roomsPanelRef}
          className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-4 scroll-mt-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="text-[16px] font-semibold">Rooms in {selectedBuilding.name}</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 bg-[#780301] text-[11px] text-white hover:bg-[#5a0201]"
                onClick={() => setPanelAddOpen((open) => !open)}
              >
                {panelAddOpen ? "Cancel" : "+ Add room"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => setSelectedBuildingId(null)}
              >
                Close
              </Button>
            </div>
          </div>
          <div>
            <p className="text-[12px] text-black/55 mt-0.5">
              Listed by floor ({selectedBuilding.floorCount} floor
              {selectedBuilding.floorCount === 1 ? "" : "s"}). Use <strong>+ Add room</strong> for this building,
              or the form at the top of the page to create a building with its rooms.
            </p>
          </div>

          {panelAddOpen ? (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_8rem_auto] gap-3 items-end rounded-lg border border-black/10 bg-black/[0.02] p-3">
              <label className="space-y-1">
                <span className="text-[12px] font-semibold text-black/75">Room code</span>
                <Input
                  value={panelRoomCode}
                  onChange={(e) => setPanelRoomCode(e.target.value)}
                  placeholder={`e.g. ${selectedBuilding.code?.trim() || "ROOM"} 101`}
                  disabled={savingPanelRoom}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onAddRoomToOpenBuilding();
                    }
                  }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[12px] font-semibold text-black/75">Floor</span>
                <select
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                  value={panelRoomFloor}
                  onChange={(e) => setPanelRoomFloor(e.target.value)}
                  disabled={savingPanelRoom}
                >
                  {floorOptions.map((f) => (
                    <option key={f} value={String(f)}>
                      Floor {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[12px] font-semibold text-black/75">Capacity</span>
                <Input
                  type="number"
                  min={0}
                  value={panelRoomCapacity}
                  onChange={(e) => setPanelRoomCapacity(e.target.value)}
                  placeholder="optional"
                  disabled={savingPanelRoom}
                />
              </label>
              <Button
                type="button"
                className="h-10 bg-[#780301] text-white hover:bg-[#5a0201]"
                disabled={savingPanelRoom}
                onClick={() => void onAddRoomToOpenBuilding()}
              >
                {savingPanelRoom ? "Adding\u2026" : "Add"}
              </Button>
            </div>
          ) : null}
          {roomsByFloor.length === 0 ? (
            <p className="text-center text-[13px] text-black/50 border border-black/10 rounded-lg py-8">
              {searchQ ? "No rooms match your search in this building." : "No rooms in this building yet."}
            </p>
          ) : (
            <div className="space-y-4">
              {roomsByFloor.map(({ floor, rooms: floorRooms }) => (
                <div key={String(floor)} className="border border-black/10 rounded-lg overflow-hidden">
                  <div className="bg-black/[0.04] px-3 py-2 text-[13px] font-semibold text-black/80">
                    {floor === "unassigned" ? "Unassigned floor" : `Floor ${floor}`}
                    <span className="ml-2 font-normal text-black/50">
                      ({floorRooms.length} room{floorRooms.length === 1 ? "" : "s"})
                    </span>
                  </div>
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#780301] text-white">
                        <th className="border border-black/20 px-2 py-2 text-left">Code</th>
                        <th className="border border-black/20 px-2 py-2 text-center">Capacity</th>
                        <th className="border border-black/20 px-2 py-2 text-left">GEC</th>
                        <th className="border border-black/20 px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {floorRooms.map((r) => (
                        <tr key={r.id} className={editingRoomId === r.id ? "bg-amber-50/80" : undefined}>
                          {editingRoomId === r.id ? (
                            <>
                              <td className="border border-black/20 px-2 py-2" colSpan={4}>
                                <div className="flex flex-wrap items-end gap-2">
                                  <label className="space-y-1 flex-1 min-w-[120px]">
                                    <span className="text-[11px] text-black/60">Code</span>
                                    <Input
                                      value={editRoomCode}
                                      onChange={(e) => setEditRoomCode(e.target.value)}
                                      disabled={savingEdit}
                                    />
                                  </label>
                                  <label className="space-y-1 w-28">
                                    <span className="text-[11px] text-black/60">Floor</span>
                                    <select
                                      className="w-full h-10 rounded-md border border-gray-300 bg-white px-2 text-sm"
                                      value={editRoomFloor}
                                      onChange={(e) => setEditRoomFloor(e.target.value)}
                                      disabled={savingEdit}
                                    >
                                      {floorOptions.map((f) => (
                                        <option key={f} value={String(f)}>
                                          Floor {f}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="space-y-1 w-24">
                                    <span className="text-[11px] text-black/60">Capacity</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={editRoomCapacity}
                                      onChange={(e) => setEditRoomCapacity(e.target.value)}
                                      disabled={savingEdit}
                                    />
                                  </label>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="bg-[#780301] text-white hover:bg-[#5a0201]"
                                    disabled={savingEdit}
                                    onClick={() => void onSaveRoomEdit()}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={savingEdit}
                                    onClick={() => setEditingRoomId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="border border-black/20 px-2 py-2 font-medium">{r.code}</td>
                              <td className="border border-black/20 px-2 py-2 text-center tabular-nums">
                                {r.capacity ?? "—"}
                              </td>
                              <td className="border border-black/20 px-2 py-2">{r.gecUsable ? "Yes" : "—"}</td>
                              <td className="border border-black/20 px-2 py-2 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  className="text-[#780301] font-semibold hover:underline mr-3"
                                  onClick={() => startEditRoom(r)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="text-red-800 font-semibold hover:underline"
                                  onClick={() => void onDeleteRoom(r)}
                                >
                                  Delete
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
