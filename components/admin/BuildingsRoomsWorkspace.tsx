"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildingsRoomsApi, ApiClientError } from "@/lib/api/client";
import type { Building, Room } from "@/types/db";

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
      setBuildings(bRes.buildings ?? []);
      setRooms(rRes.rooms ?? []);
      setWarning(bRes.warning ?? null);
      if (selectedBuildingId && !(bRes.buildings ?? []).some((b) => b.id === selectedBuildingId)) {
        setSelectedBuildingId(null);
      }
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to load buildings.");
    } finally {
      setLoading(false);
    }
  }, [scopeCollegeId, scopeProgramId, selectedBuildingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId],
  );

  const roomsInSelected = useMemo(() => {
    if (!selectedBuildingId) return [];
    return rooms
      .filter((r) => r.buildingId === selectedBuildingId)
      .sort((a, b) => (a.floor ?? 0) - (b.floor ?? 0) || a.code.localeCompare(b.code));
  }, [rooms, selectedBuildingId]);

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
      setSelectedBuildingId(building.id);
      setSuccess(`Building “${building.name}” saved for ${scopeProgramCode ?? "department"}.`);
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to save building.");
    } finally {
      setSavingBuilding(false);
    }
  }

  async function onToggleGec(building: Building) {
    setError(null);
    try {
      await buildingsRoomsApi.updateBuilding(building.id, { gecUsable: !building.gecUsable });
      setSuccess(
        !building.gecUsable
          ? `“${building.name}” marked usable for GEC subjects.`
          : `“${building.name}” removed from GEC-usable set.`,
      );
      await load();
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
      if (selectedBuildingId === building.id) setSelectedBuildingId(null);
      setSuccess(`Building “${building.name}” deleted.`);
      await load();
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
      const { room, warning: w } = await buildingsRoomsApi.createRoom({
        code,
        buildingId: selectedBuilding.id,
        floor: Math.max(1, parseInt(roomFloor, 10) || 1),
        capacity: roomCapacity.trim() ? parseInt(roomCapacity, 10) : null,
      });
      setRoomCode("");
      setRoomCapacity("");
      setSuccess(`Room “${room.code}” added under ${selectedBuilding.name}.`);
      if (w) setWarning(w);
      await load();
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
      setSuccess(`Room “${room.code}” deleted.`);
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to delete room.");
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
        <div className="p-4 border-b border-black/10 flex items-center justify-between gap-2">
          <div>
            <div className="text-[16px] font-semibold">Department buildings</div>
            <div className="text-[12px] text-black/55">
              {loading ? "Loading…" : `${buildings.length} building${buildings.length === 1 ? "" : "s"}`}
              {scopeProgramCode ? ` · ${scopeProgramCode}` : ""}
            </div>
          </div>
        </div>
        {buildings.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-black/50">No buildings for this department yet.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {buildings.map((b) => {
              const count = rooms.filter((r) => r.buildingId === b.id).length;
              const active = selectedBuildingId === b.id;
              return (
                <li key={b.id} className={active ? "bg-[#fdf6f5]" : "bg-white"}>
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
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedBuilding ? (
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-5 space-y-4">
          <div className="text-[16px] font-semibold">Rooms in {selectedBuilding.name}</div>
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

          <table className="w-full border-collapse text-[12px] mt-2">
            <thead>
              <tr className="bg-[#780301] text-white">
                <th className="border border-black/20 px-2 py-2 text-left">Code</th>
                <th className="border border-black/20 px-2 py-2 text-center">Floor</th>
                <th className="border border-black/20 px-2 py-2 text-center">Capacity</th>
                <th className="border border-black/20 px-2 py-2 text-left">GEC</th>
                <th className="border border-black/20 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roomsInSelected.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-black/20 px-3 py-6 text-center text-black/50">
                    No rooms in this building yet.
                  </td>
                </tr>
              ) : (
                roomsInSelected.map((r) => (
                  <tr key={r.id}>
                    <td className="border border-black/20 px-2 py-2 font-medium">{r.code}</td>
                    <td className="border border-black/20 px-2 py-2 text-center tabular-nums">{r.floor ?? "—"}</td>
                    <td className="border border-black/20 px-2 py-2 text-center tabular-nums">{r.capacity ?? "—"}</td>
                    <td className="border border-black/20 px-2 py-2">{r.gecUsable ? "Yes" : "—"}</td>
                    <td className="border border-black/20 px-2 py-2 text-right">
                      <button
                        type="button"
                        className="text-[#780301] font-semibold hover:underline"
                        onClick={() => void onDeleteRoom(r)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
