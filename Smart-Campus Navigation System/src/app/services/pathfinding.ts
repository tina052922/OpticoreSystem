import { PathNode, Route } from '../types/campus';

interface AStarNode {
  node: PathNode;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class PathfindingService {
  private nodes: Map<string, PathNode>;

  constructor(pathNodes: PathNode[]) {
    this.nodes = new Map(pathNodes.map((node) => [node.id, node]));
  }

  updateGraph(pathNodes: PathNode[]) {
    this.nodes = new Map(pathNodes.map((node) => [node.id, node]));
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  private distance(a: PathNode, b: PathNode): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  /** Nearest graph nodes to a coordinate (prefer nodes with edges). */
  findNearestNodes(x: number, y: number, limit = 14, maxDist = 8000): PathNode[] {
    if (this.nodes.size === 0) return [];
    const scored = [...this.nodes.values()]
      .map((node) => ({ node, d: Math.hypot(node.x - x, node.y - y) }))
      .filter(({ d }) => d <= maxDist)
      .sort((a, b) => a.d - b.d);

    const withEdges = scored.filter(({ node }) => node.connections.length > 0).map(({ node }) => node);
    const any = scored.map(({ node }) => node);
    const merged: PathNode[] = [];
    const seen = new Set<string>();
    for (const n of [...withEdges, ...any]) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      merged.push(n);
      if (merged.length >= limit) break;
    }
    return merged;
  }

  private aStar(startNode: PathNode, endNode: PathNode): Route | null {
    if (startNode.id === endNode.id) {
      return { path: [startNode], distance: 0 };
    }

    const openSet: AStarNode[] = [];
    const closedSet = new Set<string>();

    const startAStarNode: AStarNode = {
      node: startNode,
      g: 0,
      h: this.distance(startNode, endNode),
      f: this.distance(startNode, endNode),
      parent: null,
    };

    openSet.push(startAStarNode);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.node.id === endNode.id) {
        const path: PathNode[] = [];
        let node: AStarNode | null = current;
        let totalDistance = 0;

        while (node) {
          path.unshift(node.node);
          if (node.parent) {
            totalDistance += this.distance(node.node, node.parent.node);
          }
          node = node.parent;
        }

        return { path, distance: totalDistance };
      }

      closedSet.add(current.node.id);

      for (const neighborId of current.node.connections) {
        if (closedSet.has(neighborId)) continue;

        const neighborNode = this.nodes.get(neighborId);
        if (!neighborNode) continue;

        const tentativeG = current.g + this.distance(current.node, neighborNode);

        const existingOpen = openSet.find((n) => n.node.id === neighborId);

        if (existingOpen && tentativeG >= existingOpen.g) continue;

        const neighborAStarNode: AStarNode = {
          node: neighborNode,
          g: tentativeG,
          h: this.distance(neighborNode, endNode),
          f: tentativeG + this.distance(neighborNode, endNode),
          parent: current,
        };

        if (existingOpen) {
          Object.assign(existingOpen, neighborAStarNode);
        } else {
          openSet.push(neighborAStarNode);
        }
      }
    }

    return null;
  }

  private directLineRoute(sx: number, sy: number, ex: number, ey: number): Route {
    const path: PathNode[] = [
      { id: '__fb-start', x: sx, y: sy, connections: [] },
      { id: '__fb-end', x: ex, y: ey, connections: [] },
    ];
    return {
      path,
      distance: Math.hypot(ex - sx, ey - sy),
      usedFallback: true,
    };
  }

  /**
   * Shortest path via A* over multiple start/end anchors; never returns null (direct line fallback).
   */
  findPath(startX: number, startY: number, endX: number, endY: number): Route {
    if (this.nodes.size === 0) {
      return this.directLineRoute(startX, startY, endX, endY);
    }

    const tryAnchors = (startLimit: number, endLimit: number, maxDist: number) => {
      const starts = this.findNearestNodes(startX, startY, startLimit, maxDist);
      const ends = this.findNearestNodes(endX, endY, endLimit, maxDist);
      let best: Route | null = null;
      for (const s of starts) {
        for (const e of ends) {
          if (s.connections.length === 0 && e.connections.length === 0) continue;
          const r = this.aStar(s, e);
          if (r && (!best || r.distance < best.distance)) best = r;
        }
      }
      return best;
    };

    let best = tryAnchors(10, 10, 4000);
    if (!best) best = tryAnchors(18, 18, 12000);
    if (!best) best = tryAnchors(24, 24, 80000);

    if (best) {
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        // eslint-disable-next-line no-console
        console.log('[nav-path] A* ok nodes=', best.path.length, 'dist=', Math.round(best.distance));
      }
      return best;
    }

    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[nav-path] A* failed — using direct fallback');
    }
    return this.directLineRoute(startX, startY, endX, endY);
  }
}
