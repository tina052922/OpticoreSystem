export interface Location {
  id: string;
  name: string;
  type: 'building' | 'room' | 'office' | 'cr' | 'department' | 'facility' | 'landmark';
  x: number;
  y: number;
  floor?: number;
  building?: string;
  keywords?: string[];
}

export interface PathNode {
  id: string;
  x: number;
  y: number;
  connections: string[];
}

export interface Route {
  path: PathNode[];
  distance: number;
  /** True when graph search failed and a direct line was used as last resort. */
  usedFallback?: boolean;
}
