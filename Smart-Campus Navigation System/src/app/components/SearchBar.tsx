import { useState, useMemo } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import type { LocationRecord } from '../types/locationRecord';
import { getLocationById, locationRecords } from '../data/placesCatalog';

interface SearchBarProps {
  category: 'all' | LocationRecord['type'];
  onLocationSelect: (location: LocationRecord | null) => void;
  selectedLocation: LocationRecord | null;
}

export function SearchBar({ category, onLocationSelect, selectedLocation }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const pool = useMemo(() => {
    if (category === 'all') return locationRecords;
    return locationRecords.filter((l) => l.type === category);
  }, [category]);

  const filteredLocations = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return pool
      .filter((loc) => {
        const matchName = loc.name.toLowerCase().includes(lowerQuery);
        const matchKeywords = loc.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery));
        const matchType = loc.type.toLowerCase().includes(lowerQuery);
        const matchCat = loc.category.toLowerCase().includes(lowerQuery);
        const sid = loc.svgId?.trim().toLowerCase() ?? '';
        const matchSvgId = sid && (sid === lowerQuery || sid.includes(lowerQuery));
        const matchCatalogId = loc.id.toLowerCase() === lowerQuery;
        const rid = loc.roomId?.trim().toLowerCase() ?? '';
        const matchRoomId = rid && (rid === lowerQuery || rid.includes(lowerQuery));
        return (
          matchName ||
          matchKeywords ||
          matchType ||
          matchCat ||
          matchSvgId ||
          matchCatalogId ||
          matchRoomId
        );
      })
      .slice(0, 12);
  }, [query, pool]);

  const handleSelect = (location: LocationRecord) => {
    onLocationSelect(location);
    setQuery('');
    setIsOpen(false);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      building: 'bg-accent text-accent-foreground border border-opticore-orange/20',
      room: 'bg-emerald-100 text-emerald-800',
      office: 'bg-violet-100 text-violet-800',
      cr: 'bg-rose-100 text-rose-800',
      department: 'bg-amber-100 text-amber-800',
      facility: 'bg-teal-100 text-teal-800',
      landmark: 'bg-yellow-100 text-yellow-900',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="relative w-full min-w-0">
      <div className="relative min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search buildings, rooms, offices…"
          className="w-full min-w-0 pl-9 pr-9 py-2.5 rounded-lg border border-border focus:border-opticore-orange focus:ring-2 focus:ring-opticore-orange/25 focus:outline-none text-sm shadow-sm bg-card"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedLocation && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-accent rounded-lg border border-opticore-orange/25">
          <MapPin className="w-4 h-4 text-opticore-orange shrink-0" />
          <span className="text-xs font-medium text-foreground truncate min-w-0">{selectedLocation.name}</span>
          <button
            type="button"
            onClick={() => onLocationSelect(null)}
            className="ml-auto shrink-0 text-opticore-red-2 hover:text-opticore-red-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isOpen && filteredLocations.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-lg shadow-xl border border-border max-h-[min(18rem,50dvh)] overflow-y-auto overscroll-contain z-50">
          {filteredLocations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => handleSelect(location)}
              className="w-full px-3 py-2.5 hover:bg-muted text-left border-b border-border last:border-b-0 transition-colors flex items-start gap-2 min-w-0"
            >
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-popover-foreground truncate">{location.name}</div>
                {location.building && (
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    Linked: {getLocationById(location.building)?.name ?? location.building}
                  </div>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shrink-0 ${getTypeColor(location.type)}`}>
                {location.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && filteredLocations.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-lg shadow-lg border border-border px-3 py-4 text-center text-muted-foreground text-xs z-50">
          No results for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
