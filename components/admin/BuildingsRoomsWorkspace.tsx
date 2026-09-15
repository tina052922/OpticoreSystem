"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildingsRoomsApi, ApiClientError } from "@/lib/api/client";
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

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [roomFloor, setRoomFloor] = useState("1");
  const [roomCapacity, setRoomCapacity] = useState("");
  const [savingRoom, setSavingRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editBuildingName, setEditBuildingName] = useState("");
  const [editBuildingCode, setEditBuildingCode] = useState("");
  const [editFloorCount, setEditFloorCount] = useState("1");
  const [editRoomCode, setEditRoomCode] = useState("");
  const [editRoomFloor, setEditRoomFloor] = useState("1");
  const [editRoomCapacity, setEditRoomCapacity] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const canEdit = Boolean(scopeCollegeId && scopeProgramId);

  const load = useCallback(async () => {
    if (!scopeCollegeId) {
      setBuildings([]);
      setRooms([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [bRes, rRes] = await Promise.all([
        buildingsRoomsApi.listBuildings({
          collegeId: scopeCollegeId,
          programId: scopeProgramId,
        }),
        buildingsRoomsApi.listRooms({
          collegeId: scopeCollegeId,
          programId: scopeProgramId,
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

  const floorOptions = useMemo(() => {
    const n = selectedBuilding?.floorCount ?? Math.max(1, parseInt(floorCount, 10) || 1);
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [selectedBuilding?.floorCount, floorCount]);

  async function onAddBuilding() {
    if (!canEdit) return;
    const name = buildingName.trim();
    if (!name) {
      setError("Building name is required.");
      return;
    }
    setSavingBuilding(true);
    setError(null);
    setSuccess(null);
    try {
      const { building } = await buildingsRoomsApi.createBuilding({
        name,
        code: buildingCode.trim() || null,
        floorCount: Math.max(1, parseInt(floorCount, 10) || 1),
        collegeId: scopeCollegeId,
        programId: scopeProgramId,
        gecUsable,
      });
      setBuildingName("");
      setBuildingCode("");
      setFloorCount("2");
      setGecUsable(false);
      setBuildings((prev) => {
        if (prev.some((b) => b.id === building.id)) {
          return prev.map((b) => (b.id === building.id ? building : b));
        }
        return [...prev, building].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedBuildingId(building.id);
      setSuccess(`Building “${building.name}” saved for ${scopeProgramCode ?? "department"}.`);
      void load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to save building.");
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

  async function onAddRoom() {
    if (!canEdit || !selectedBuilding) return;
    const code = roomCode.trim();
    if (!code) {
      setError("Room code is required.");
      return;
    }
    setSavingRoom(true);
    setError(null);
    setSuccess(null);
    try {
      const floor = Math.max(1, parseInt(roomFloor, 10) || 1);
      const { room, warning: w } = await buildingsRoomsApi.createRoom({
        code,
        buildingId: selectedBuilding.id,
        floor,
        capacity: roomCapacity.trim() ? parseInt(roomCapacity, 10) : null,
        collegeId: scopeCollegeId,
        programId: scopeProgramId,
        gecUsable: selectedBuilding.gecUsable,
        building: selectedBuilding.name,
      });
      // Ensure the row is listable under this building even if the API omitted FK fields.
      const linked: Room = {
        ...room,
        buildingId: room.buildingId ?? selectedBuilding.id,
        building: room.building ?? selectedBuilding.name,
        programId: room.programId ?? scopeProgramId,
        collegeId: room.collegeId ?? scopeCollegeId,
        floor: room.floor ?? floor,
        gecUsable: room.gecUsable ?? selectedBuilding.gecUsable,
      };
      setRooms((prev) => {
        if (prev.some((r) => r.id === linked.id)) {
          return prev.map((r) => (r.id === linked.id ? linked : r));
        }
        return [...prev, linked];
      });
      setRoomCode("");
      setRoomCapacity("");
      setSuccess(`Room “${linked.code}” added under ${selectedBuilding.name}.`);
      if (w) setWarning(w);
      // Background reconcile with server (does not clear optimistic row first).
      void load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to save room.");
    } finally {
      setSavingRoom(false);
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
    if (!editingRoomId || !selectedBuilding) return;
    const code = editRoomCode.trim();
    if (!code) {
      setError("Room code is required.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const floor = Math.min(
        selectedBuilding.floorCount,
        Math.max(1, parseInt(editRoomFloor, 10) || 1),
      );
      const capacityRaw = editRoomCapacity.trim();
      const { room: updated } = await buildingsRoomsApi.updateRoom(editingRoomId, {
        code,
        floor,
        capacity: capacityRaw === "" ? null : Math.max(0, parseInt(capacityRaw, 10) || 0),
        building: selectedBuilding.name,
        buildingId: selectedBuilding.id,
        programId: scopeProgramId,
        collegeId: scopeCollegeId,
        gecUsable: selectedBuilding.gecUsable,
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
          Select a college and department above to manage buildings and rooms.
        </p>
      ) : null}

      {warning ? (
        <p className="text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{warning}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      ) : null}
      {success ? (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2">{success}</p>
      ) : null}

      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-4">
        <div className="text-[16px] font-semibold">Add building</div>
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
            <span className="text-[12px] font-semibold text-black/75">Code (optional)</span>
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
        <Button
          type="button"
          className="bg-[#780301] hover:bg-[#5a0201] text-white"
          disabled={!canEdit || savingBuilding}
          onClick={() => void onAddBuilding()}
        >
          {savingBuilding ? "Saving…" : "Save building"}
        </Button>
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
              disabled={!scopeCollegeId}
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
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedBuildingId(b.id)}>
                        Manage rooms
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

      {selectedBuilding ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-4">
          <div>
            <div className="text-[16px] font-semibold">Rooms in {selectedBuilding.name}</div>
            <p className="text-[12px] text-black/55 mt-0.5">
              Listed by floor ({selectedBuilding.floorCount} floor
              {selectedBuilding.floorCount === 1 ? "" : "s"}). New rooms appear here as soon as they are saved.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[12px] font-semibold text-black/75">Room code</span>
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="e.g. TECH 201"
                disabled={savingRoom}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[12px] font-semibold text-black/75">Floor</span>
              <select
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                value={roomFloor}
                onChange={(e) => setRoomFloor(e.target.value)}
                disabled={savingRoom}
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
                min={1}
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(e.target.value)}
                placeholder="optional"
                disabled={savingRoom}
              />
            </label>
          </div>
          <Button
            type="button"
            className="bg-[#ff990a] hover:bg-[#e68a09] text-white"
            disabled={savingRoom}
            onClick={() => void onAddRoom()}
          >
            {savingRoom ? "Saving…" : "Add room"}
          </Button>

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
