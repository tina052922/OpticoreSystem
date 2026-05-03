import { useState, useEffect, useRef, useCallback } from 'react';
import { Info, List, MapPin, Navigation, X } from 'lucide-react';
import { SidebarNav } from './components/kiosk/SidebarNav';
import { CampusMapInteractive } from './components/CampusMapInteractive';
import { InfoPanel } from './components/panels/InfoPanel';
import { PathfindingService } from './services/pathfinding';
import { smoothRoutePath } from './services/walkabilityGraph';
import type { PathNode } from './types/campus';
import type { LocationRecord } from './types/locationRecord';
import { getCanonicalLocation, locationRecords } from './data/placesCatalog';
import { pathNodes } from './data/campusData';

function polylineLength(pts: PathNode[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return d;
}

/** Connect catalog coordinates to the graph path ends when nearest-node snap is visibly offset. */
function attachTerminalSnaps(
  path: PathNode[],
  sx: number,
  sy: number,
  ex: number,
  ey: number
): PathNode[] {
  if (path.length === 0) {
    return [
      { id: '__snap-s', x: sx, y: sy, connections: [] },
      { id: '__snap-e', x: ex, y: ey, connections: [] },
    ];
  }
  const pts = path.map((p) => ({ ...p, connections: [] as string[] }));
  if (pts.length === 1) {
    return [
      { id: '__snap-s', x: sx, y: sy, connections: [] },
      { id: '__snap-e', x: ex, y: ey, connections: [] },
    ];
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.hypot(first.x - sx, first.y - sy) > 26) {
    pts.unshift({ id: '__snap-s', x: sx, y: sy, connections: [] });
  }
  if (Math.hypot(last.x - ex, last.y - ey) > 26) {
    pts.push({ id: '__snap-e', x: ex, y: ey, connections: [] });
  }
  return pts;
}

export default function App() {
  const pathfinderRef = useRef<PathfindingService | null>(null);
  if (!pathfinderRef.current) {
    pathfinderRef.current = new PathfindingService(pathNodes);
  }

  const [graphRevision, setGraphRevision] = useState(0);
  const [category, setCategory] = useState<'all' | LocationRecord['type']>('all');
  const [selectedLocation, setSelectedLocation] = useState<LocationRecord | null>(null);
  const selectLocation = useCallback((loc: LocationRecord | null) => {
    setSelectedLocation(loc == null ? null : getCanonicalLocation(loc));
  }, []);
  const [currentLocation, setCurrentLocation] = useState<LocationRecord | null>(null);
  const [routePath, setRoutePath] = useState<PathNode[]>([]);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'directory' | 'info'>('none');
  /** Exact SVG bbox center for the selected destination (from map); null until resolved. */
  const [destinationMapAnchor, setDestinationMapAnchor] = useState<{ x: number; y: number } | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedLocation?.id ?? null;

  useEffect(() => {
    setDestinationMapAnchor(null);
  }, [selectedLocation?.id]);

  const onDestinationCenterResolved = useCallback((locationId: string, x: number, y: number) => {
    if (selectedIdRef.current === locationId) {
      setDestinationMapAnchor({ x, y });
    }
  }, []);

  const onWalkGraphReady = useCallback((nodes: PathNode[]) => {
    if (nodes.length > 0) {
      pathfinderRef.current?.updateGraph(nodes);
      setGraphRevision((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    if (currentLocation && selectedLocation) {
      const destX = destinationMapAnchor?.x ?? selectedLocation.x;
      const destY = destinationMapAnchor?.y ?? selectedLocation.y;
      const route = pathfinderRef.current!.findPath(
        currentLocation.x,
        currentLocation.y,
        destX,
        destY
      );

      const withSnaps = attachTerminalSnaps(
        route.path,
        currentLocation.x,
        currentLocation.y,
        destX,
        destY
      );
      const smoothed = smoothRoutePath(withSnaps);
      setRoutePath(smoothed);
      setRouteDistance(polylineLength(smoothed));
    } else {
      setRoutePath([]);
      setRouteDistance(0);
    }
  }, [currentLocation, selectedLocation, destinationMapAnchor, graphRevision]);

  const handleSetAsStart = () => {
    setCurrentLocation(selectedLocation);
  };

  const handleClearRoute = () => {
    setCurrentLocation(null);
    selectLocation(null);
    setRoutePath([]);
  };

  return (
    <div className="campus-shell h-[100dvh] flex flex-col bg-opticore-bg text-foreground overflow-hidden min-h-0 min-w-0">
      <header className="shrink-0 z-30 bg-card border-b border-border shadow-sm supports-[backdrop-filter]:bg-card/95">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-gradient-to-br from-opticore-red-1 to-opticore-red-2 shadow-md shrink-0 ring-1 ring-black/10">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-foreground text-base sm:text-lg truncate">
                CTU Argao · Campus Navigator
              </h1>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                Wayfinding kiosk · Search the directory or tap the map
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide hidden md:block max-w-[14rem] lg:max-w-none truncate">
              Cebu Technological University
            </div>
            {/* Mobile quick actions */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMobileDrawer('directory')}
                className="p-2 rounded-lg border border-border bg-card hover:bg-muted/80 shadow-sm"
                aria-label="Open directory"
              >
                <List className="w-4 h-4 text-foreground" />
              </button>
              <button
                type="button"
                onClick={() => setMobileDrawer('info')}
                className="p-2 rounded-lg border border-border bg-card hover:bg-muted/80 shadow-sm"
                aria-label="Open info panel"
              >
                <Info className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 min-w-0 grid grid-cols-1 md:grid-cols-[minmax(180px,.9fr)_minmax(260px,1.2fr)_minmax(180px,.9fr)] xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        {/* Tablet + desktop directory — min-w-0 keeps columns stable when zooming / narrow viewports */}
        <div className="hidden md:flex md:min-h-0 md:min-w-0 md:flex-col">
          <SidebarNav
            category={category}
            onCategoryChange={setCategory}
            onLocationSelect={selectLocation}
            selectedLocation={selectedLocation}
          />
        </div>

        <section className="flex flex-col min-h-0 min-w-0 border-y md:border-y-0 md:border-x border-border bg-background/70">
          {(currentLocation || selectedLocation) && (
            <div className="shrink-0 p-2 sm:p-3 border-b border-border bg-card/95 backdrop-blur-sm">
              <div className="flex flex-wrap items-stretch gap-2 sm:gap-3 text-xs">
                <div className="flex-1 min-w-[min(100%,140px)] rounded-lg border border-border bg-muted/60 px-2.5 sm:px-3 py-2">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">From</div>
                  {currentLocation ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-foreground truncate">{currentLocation.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Set start after choosing destination</span>
                  )}
                </div>
                <div className="flex-1 min-w-[min(100%,140px)] rounded-lg border border-border bg-muted/60 px-2.5 sm:px-3 py-2">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">To</div>
                  {selectedLocation ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-opticore-red-2 shrink-0" />
                      <span className="font-semibold text-foreground truncate">{selectedLocation.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Pick a destination</span>
                  )}
                </div>
                {routePath.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-opticore-orange/35 bg-accent/80 px-2.5 sm:px-3 py-2">
                    <Navigation className="w-4 h-4 text-opticore-orange shrink-0" />
                    <div>
                      <div className="font-bold text-foreground">{Math.round(routeDistance)} u</div>
                      <div className="text-[10px] text-muted-foreground">{routePath.length} pts</div>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 w-full justify-end md:justify-start md:flex-nowrap md:ml-auto">
                  {selectedLocation && !currentLocation && (
                    <button
                      type="button"
                      onClick={handleSetAsStart}
                      className="px-3 py-2 rounded-lg bg-opticore-orange text-black text-xs font-semibold hover:brightness-95 active:brightness-90 shadow-sm"
                    >
                      Set start here
                    </button>
                  )}
                  {(currentLocation || selectedLocation) && (
                    <button
                      type="button"
                      onClick={handleClearRoute}
                      className="px-3 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/80 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 min-w-0 p-1.5 sm:p-2 md:p-3">
            <CampusMapInteractive
              selectedLocation={selectedLocation}
              routePath={routePath}
              locationRecords={locationRecords}
              onWalkGraphReady={onWalkGraphReady}
              onDestinationCenterResolved={onDestinationCenterResolved}
              onLocationClick={(loc) => {
                selectLocation(loc);
                // On mobile, tapping the map typically means "show me details"
                setMobileDrawer((d) => (d === 'none' ? 'info' : d));
              }}
            />
          </div>

          <div className="shrink-0 px-2 sm:px-3 pt-1.5 sm:pt-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] border-t border-border bg-card/90 text-[10px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 justify-center items-center">
            <span>
              <span className="font-semibold text-foreground">{locationRecords.filter((l) => l.type === 'building').length}</span> buildings
            </span>
            <span>
              <span className="font-semibold text-foreground">{locationRecords.filter((l) => l.type === 'room').length}</span> rooms
            </span>
            <span>
              <span className="font-semibold text-foreground">{locationRecords.filter((l) => l.type === 'office').length}</span> offices
            </span>
            <span>
              <span className="font-semibold text-foreground">
                {locationRecords.filter((l) => l.type === 'facility' || l.type === 'cr').length}
              </span>{' '}
              facilities / CR
            </span>
          </div>
        </section>

        {/* Tablet + desktop info */}
        <aside className="hidden md:flex md:flex-col md:min-h-0 md:min-w-0 bg-card border-l border-border shadow-sm overflow-hidden">
          <InfoPanel selected={selectedLocation} />
        </aside>
      </div>

      {/* Mobile drawers */}
      {mobileDrawer !== 'none' && (
        <div className="fixed inset-0 z-50 md:hidden min-h-0">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileDrawer('none')}
            aria-label="Close overlay"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[min(85dvh,560px)] rounded-t-2xl bg-card shadow-2xl border-t border-border overflow-hidden flex flex-col min-h-0">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
              <div className="text-sm font-bold text-foreground">
                {mobileDrawer === 'directory' ? 'Directory' : 'Information'}
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawer('none')}
                className="p-2 rounded-lg hover:bg-sidebar-accent text-foreground"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 max-h-[calc(min(85dvh,560px)-52px)] overflow-y-auto overscroll-contain">
              {mobileDrawer === 'directory' ? (
                <SidebarNav
                  category={category}
                  onCategoryChange={setCategory}
                  onLocationSelect={(loc) => {
                    selectLocation(loc);
                    setMobileDrawer('info');
                  }}
                  selectedLocation={selectedLocation}
                />
              ) : (
                <InfoPanel selected={selectedLocation} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
