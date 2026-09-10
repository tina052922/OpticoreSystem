import type { Location, PathNode } from '../types/campus';
import { buildPathwayGraph } from '../services/pathwayExtractor';
import { locationRecords } from './placesCatalog';

// Walkable graph only (gates excluded at pathway definition level).
const navigationGraph = buildPathwayGraph();

export const pathNodes: PathNode[] = Array.from(navigationGraph.entries()).map(([id, data]) => ({
  id,
  x: data.x,
  y: data.y,
  connections: data.connections,
}));

/** @deprecated Prefer `locationRecords` from `placesCatalog` for rich fields. */
export const locations: Location[] = locationRecords;
