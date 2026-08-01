import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, MapPin, Navigation, X } from 'lucide-react';
import { FloatingSearchOverlay } from './components/kiosk/SidebarNav';
import { NavigationBottomSheet } from './components/kiosk/NavigationBottomSheet';
import { CampusMapInteractive } from './components/CampusMapInteractive';
import { InfoPanel } from './components/panels/InfoPanel';
import { PathfindingService } from './services/pathfinding';
import { smoothRoutePath } from './services/walkabilityGraph';
import type { PathNode } from './types/campus';
import type { LocationRecord } from './types/locationRecord';
import { getCanonicalLocation, locationRecords } from './data/placesCatalog';
import { pathNodes } from './data/campusData';
import { getOpticoreLandingHref } from './utils/opticoreHome';

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
  const [startSetSignal, setStartSetSignal] = useState(0);
  const [routePath, setRoutePath] = useState<PathNode[]>([]);
  const [routeDistance, setRouteDistance] = useState<number>(0);
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
    if (!selectedLocation) return;

    setCurrentLocation(selectedLocation);
    selectLocation(null);
    setDestinationMapAnchor(null);
    setRoutePath([]);
    setRouteDistance(0);
    // signal search UI to reset so users can immediately start a new search
    setStartSetSignal((n) => n + 1);
  };

  const handleClearRoute = () => {
    setCurrentLocation(null);
    selectLocation(null);
    setRoutePath([]);
  };

  const buildingCount = locationRecords.filter((l) => l.type === 'building').length;
  const roomCount = locationRecords.filter((l) => l.type === 'room').length;
  const officeCount = locationRecords.filter((l) => l.type === 'office').length;
  const facilityCount = locationRecords.filter((l) => l.type === 'facility' || l.type === 'cr').length;

  return (
    <div className="campus-shell relative h-[100dvh] w-full overflow-hidden bg-opticore-bg text-foreground">
      {/* Full-screen interactive map */}
      <div className="absolute inset-0 z-0 [&>div]:h-full [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
        <CampusMapInteractive
          selectedLocation={selectedLocation}
          routePath={routePath}
          locationRecords={locationRecords}
          onWalkGraphReady={onWalkGraphReady}
          onDestinationCenterResolved={onDestinationCenterResolved}
          onLocationClick={(loc) => {
            selectLocation(loc);
          }}
        />
      </div>

      {/* Google Maps–style floating search */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <FloatingSearchOverlay
          category={category}
          onCategoryChange={setCategory}
          onLocationSelect={selectLocation}
          selectedLocation={selectedLocation}
          startSetSignal={startSetSignal}
        />
      </div>

      {/* Draggable bottom sheet — info, routing, metadata */}
      <NavigationBottomSheet
        hasSelection={selectedLocation != null}
        peekTitle={selectedLocation?.name}
      >
        {(currentLocation || selectedLocation) && (
          <div className="shrink-0 px-3 sm:px-4 pb-3 border-b border-border bg-card/80">
            <div className="flex flex-wrap items-stretch gap-2 text-xs">
              <div className="flex-1 min-w-[min(100%,140px)] rounded-xl border border-border bg-muted/60 px-2.5 sm:px-3 py-2">
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
              <div className="flex-1 min-w-[min(100%,140px)] rounded-xl border border-border bg-muted/60 px-2.5 sm:px-3 py-2">
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
                <div className="flex items-center gap-2 rounded-xl border border-opticore-orange/35 bg-accent/80 px-2.5 sm:px-3 py-2">
                  <Navigation className="w-4 h-4 text-opticore-orange shrink-0" />
                  <div>
                    <div className="font-bold text-foreground">{Math.round(routeDistance)} u</div>
                    <div className="text-[10px] text-muted-foreground">{routePath.length} pts</div>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 w-full justify-end sm:justify-start sm:flex-nowrap sm:ml-auto">
                {selectedLocation && !currentLocation && (
                  <button
                    type="button"
                    onClick={handleSetAsStart}
                    className="px-3 py-2 rounded-full bg-opticore-orange text-black text-xs font-semibold hover:brightness-95 active:brightness-90 shadow-sm"
                  >
                    Set start here
                  </button>
                )}
                {(currentLocation || selectedLocation) && (
                  <button
                    type="button"
                    onClick={handleClearRoute}
                    className="px-3 py-2 rounded-full border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/80 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y">
          <InfoPanel selected={selectedLocation} embedded />
        </div>

        <div className="shrink-0 border-t border-border bg-card/90 px-3 sm:px-4 py-3">
          <a
            href={getOpticoreLandingHref()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-center text-xs font-semibold text-foreground shadow-sm hover:bg-muted/85 hover:border-opticore-orange/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opticore-orange/45 transition-colors"
            aria-label="Back to Opticore homepage"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-opticore-red-2" aria-hidden />
            <span className="truncate">Back to Opticore</span>
          </a>
        </div>

        <div className="shrink-0 px-3 sm:px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-border bg-card/90 text-[10px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 justify-center items-center">
          <span>
            <span className="font-semibold text-foreground">{buildingCount}</span> buildings
          </span>
          <span>
            <span className="font-semibold text-foreground">{roomCount}</span> rooms
          </span>
          <span>
            <span className="font-semibold text-foreground">{officeCount}</span> offices
          </span>
          <span>
            <span className="font-semibold text-foreground">{facilityCount}</span> facilities / CR
          </span>
        </div>
      </NavigationBottomSheet>
    </div>
  );
}
