import { ArrowLeft } from 'lucide-react';
import { SearchBar } from '../SearchBar';
import { getOpticoreLandingHref } from '../../utils/opticoreHome';
import type { LocationRecord } from '../../types/locationRecord';

const CATS: { id: 'all' | LocationRecord['type']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'building', label: 'Buildings' },
  { id: 'room', label: 'Rooms' },
  { id: 'office', label: 'Offices' },
  { id: 'facility', label: 'Facilities' },
  { id: 'cr', label: 'CR' },
  { id: 'landmark', label: 'Landmarks' },
];

interface SidebarNavProps {
  category: 'all' | LocationRecord['type'];
  onCategoryChange: (c: 'all' | LocationRecord['type']) => void;
  onLocationSelect: (loc: LocationRecord | null) => void;
  selectedLocation: LocationRecord | null;
}

export function SidebarNav({
  category,
  onCategoryChange,
  onLocationSelect,
  selectedLocation,
}: SidebarNavProps) {
  return (
    <aside className="flex flex-col h-full min-h-0 min-w-0 bg-sidebar border-r border-sidebar-border shadow-sm overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Directory</h2>
        <div className="flex flex-wrap gap-1.5">
          {CATS.map((c) => (
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
