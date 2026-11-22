import { ArrowLeft } from 'lucide-react';
import { SearchBar } from '../SearchBar';
import { getOpticoreLandingHref } from '../../utils/opticoreHome';
import type { LocationRecord } from '../../types/locationRecord';
import { locationRecords } from '../../data/placesCatalog';

/** How many places each chip holds (shown on the chip). */
const CATEGORY_COUNTS: Record<string, number> = locationRecords.reduce<Record<string, number>>((acc, l) => {
  acc[l.type] = (acc[l.type] ?? 0) + 1;
  return acc;
}, {});

export const DIRECTORY_CATEGORIES: { id: 'all' | LocationRecord['type']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'building', label: 'Buildings' },
  { id: 'room', label: 'Rooms' },
  { id: 'office', label: 'Offices' },
  { id: 'facility', label: 'Facilities' },
  { id: 'cr', label: 'CR' },
  { id: 'landmark', label: 'Landmarks' },
];

interface FloatingSearchOverlayProps {
  category: 'all' | LocationRecord['type'];
  onCategoryChange: (c: 'all' | LocationRecord['type']) => void;
  onLocationSelect: (loc: LocationRecord | null) => void;
  selectedLocation: LocationRecord | null;
  startSetSignal?: number;
}

export function FloatingSearchOverlay({
  category,
  onCategoryChange,
  onLocationSelect,
  selectedLocation,
  startSetSignal,
}: FloatingSearchOverlayProps) {
  return (
    <div className="pointer-events-none w-full max-w-2xl lg:max-w-3xl mx-auto px-3 sm:px-4 pt-[max(0.75rem,env(safe-area-inset-top))] space-y-2">
      {/* items-start: the button stays level with the search box when the selected-place bar appears under it. */}
      <div className="flex items-start gap-2 pointer-events-auto">
        {/* Back to OptiCore: a round button on phones, with its label from small tablets up. */}
        <a
          href={getOpticoreLandingHref()}
          aria-label="Back to OptiCore"
          title="Back to OptiCore"
          className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border/80 bg-card px-3 text-sm font-semibold text-foreground shadow-lg hover:bg-muted active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opticore-orange/50 w-11 sm:w-auto sm:px-4"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-opticore-red-2" aria-hidden />
          <span className="hidden sm:inline">OptiCore</span>
        </a>
        <div className="flex-1 min-w-0">
          <SearchBar
            variant="floating"
            category={category}
            onLocationSelect={onLocationSelect}
            selectedLocation={selectedLocation}
            startSetSignal={startSetSignal}
          />
        </div>
      </div>

      {/* Category chips: tap one to list every place of that kind (and mark them on the map); tap again for All. */}
      <div
        role="toolbar"
        aria-label="Show places by category"
        className="pointer-events-auto overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex gap-1.5 pb-1 w-max max-w-full pr-1">
          {DIRECTORY_CATEGORIES.filter((c) => c.id === 'all' || CATEGORY_COUNTS[c.id]).map((c) => {
            const active = category === c.id;
            const count = c.id === 'all' ? locationRecords.length : CATEGORY_COUNTS[c.id] ?? 0;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => onCategoryChange(active && c.id !== 'all' ? 'all' : c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors shrink-0 shadow-sm ${
                  active
                    ? 'bg-primary text-primary-foreground ring-1 ring-black/10'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/80'
                }`}
              >
                {c.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    active ? 'bg-white/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Legacy sidebar layout — kept for reference; category constants shared with floating overlay. */
interface SidebarNavProps {
  category: 'all' | LocationRecord['type'];
  onCategoryChange: (c: 'all' | LocationRecord['type']) => void;
  onLocationSelect: (loc: LocationRecord | null) => void;
  selectedLocation: LocationRecord | null;
  startSetSignal?: number;
}

export function SidebarNav({
  category,
  onCategoryChange,
  onLocationSelect,
  selectedLocation,
  startSetSignal,
}: SidebarNavProps) {
  return (
    <aside className="flex flex-col h-full min-h-0 min-w-0 bg-sidebar border-r border-sidebar-border shadow-sm overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Directory</h2>
        <div className="flex flex-wrap gap-1.5">
          {DIRECTORY_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCategoryChange(c.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors shrink-0 ${
                category === c.id
                  ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-black/10'
                  : 'bg-card text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 sm:p-4 flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain touch-pan-y">
        <SearchBar
          category={category}
          onLocationSelect={onLocationSelect}
          selectedLocation={selectedLocation}
          startSetSignal={startSetSignal}
        />
      </div>
      <div className="shrink-0 border-t border-border bg-sidebar p-3 sm:p-4">
        <a
          href={getOpticoreLandingHref()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-center text-xs font-semibold text-foreground shadow-sm hover:bg-muted/85 hover:border-opticore-orange/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opticore-orange/45 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar transition-colors"
          aria-label="Back to Opticore homepage"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-opticore-red-2" aria-hidden />
          <span className="truncate">Back to Opticore</span>
        </a>
      </div>
    </aside>
  );
}
