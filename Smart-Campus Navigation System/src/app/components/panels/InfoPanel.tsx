import { MapPin, Navigation, Building2, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import type { LocationRecord } from '../../types/locationRecord';
import {
  getInteriorForBuilding,
  getLocationById,
  getRelatedForSelection,
  locationRecords,
} from '../../data/placesCatalog';
import { ImageCarousel } from './ImageCarousel';

interface InfoPanelProps {
  selected: LocationRecord | null;
}

export function InfoPanel({ selected }: InfoPanelProps) {
  if (!selected) {
    return (
      <div className="h-full min-h-0 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-8 sm:py-12 text-muted-foreground overflow-y-auto">
        <Navigation className="w-12 h-12 mb-3 opacity-40 text-opticore-orange" />
        <p className="text-sm font-medium text-foreground">Select a destination</p>
        <p className="text-xs mt-2 max-w-[240px]">
          Search the campus directory or tap the map. Building details and photos appear here.
        </p>
      </div>
    );
  }

  const parent =
    selected.buildingId &&
    (selected.type === 'room' || selected.type === 'cr' || selected.type === 'facility')
      ? getLocationById(selected.buildingId)
      : null;
  const related = getRelatedForSelection(selected).filter((r) => r.id !== selected.id).slice(0, 8);

  const selectedBuilding = selected.type === 'building' ? selected : parent;
  const buildingChildren =
    selectedBuilding?.id && selectedBuilding.type === 'building'
      ? getInteriorForBuilding(selectedBuilding.id).filter((l) => l.id !== selectedBuilding.id)
      : [];

  const floors = selectedBuilding?.floors ?? [];
  const childrenByFloor = floors.map((f) => ({
    floor: f,
    items: buildingChildren
      .filter((x) => (x.floor ?? null) === f)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <motion.div
      key={selected.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="h-full min-h-0 flex flex-col"
    >
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-border bg-card shrink-0">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-accent border border-opticore-orange/20 shrink-0">
            <MapPin className="w-5 h-5 text-opticore-orange" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground leading-tight break-words">{selected.name}</h2>
            {selected.roomId && (
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">{selected.roomId}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {selected.type}
              </span>
              <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                {selected.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4 touch-pan-y">
        <ImageCarousel locationKey={selected.id} images={selected.images} alt={selected.name} />

        <div className="space-y-2 text-sm text-muted-foreground">
          {selected.floors && selected.floors.length > 0 && (
            <div className="flex items-center gap-2 text-foreground">
              <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>
                <span className="font-semibold text-foreground">Floors: </span>
                {selected.floors.join(', ')}
              </span>
            </div>
          )}
          {selected.floor != null && (
            <div className="flex items-center gap-2 text-foreground">
              <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>
                <span className="font-semibold text-foreground">Floor: </span>
                {selected.floor}
              </span>
            </div>
          )}
          {parent && (
            <div className="flex items-start gap-2 text-foreground">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="min-w-0">
                <span className="font-semibold text-foreground">Area / building: </span>
                {parent.name}
              </span>
            </div>
          )}
          <p className="leading-relaxed break-words">{selected.description}</p>
        </div>

        {related.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Related places</h3>
            <ul className="space-y-1.5">
              {related.map((r) => (
                <li
                  key={r.id}
                  className="text-xs text-muted-foreground flex items-center gap-2 py-1.5 px-2 rounded-lg bg-muted border border-border"
                >
                  <span className="font-medium text-foreground truncate min-w-0">{r.name}</span>
                  <span className="text-muted-foreground shrink-0">· {r.type}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedBuilding && selectedBuilding.type === 'building' && floors.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Rooms & comfort rooms (by floor)
            </h3>
            <div className="space-y-3">
              {childrenByFloor.map(({ floor, items }) => (
                <div
                  key={floor}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <div className="px-3 py-2 bg-muted border-b border-border text-xs font-bold text-foreground">
                    Floor {floor}
                  </div>
                  {items.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground italic">No items listed.</div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {items.map((it) => (
                        <li key={it.id} className="px-3 py-2 text-xs flex gap-2 min-w-0">
                          <span className="font-semibold text-foreground truncate flex-1 min-w-0">
                            {it.name}
                          </span>
                          <span className="text-muted-foreground shrink-0">{it.category}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
