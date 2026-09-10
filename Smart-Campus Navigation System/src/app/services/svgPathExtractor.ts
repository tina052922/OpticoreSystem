// Extract navigation paths from the actual SVG road/walkway elements

export interface SVGPathSegment {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  type: 'horizontal' | 'vertical' | 'rotated';
}

// These are the ACTUAL paths from the CTU Argao SVG map
// Extracted from black rectangles (roads/walkways)
export const svgRoadPaths: SVGPathSegment[] = [
  // Main entrance roads (bottom)
  { id: 'road-entrance-1', x: 587, y: 1024, width: 130, height: 5, type: 'horizontal' },
  { id: 'road-entrance-2', x: 748, y: 1024, width: 125, height: 5, type: 'horizontal' },
  { id: 'road-entrance-3', x: 901, y: 1024, width: 51, height: 5, type: 'horizontal' },

  // Vertical main path (west side)
  { id: 'path-west-main', x: 623.905, y: 393.056, width: 637.086, height: 5, rotation: 93.3216, type: 'vertical' },

  // Horizontal paths (connecting areas)
  { id: 'path-admin-connection', x: 622.318, y: 393, width: 124.828, height: 5, rotation: 3.64261, type: 'rotated' },
  { id: 'path-hm-south', x: 949.624, y: 872.224, width: 98.3764, height: 5, rotation: -2.46074, type: 'horizontal' },
  { id: 'path-coed-north', x: 862.246, y: 633.851, width: 189.228, height: 5, rotation: -0.257543, type: 'horizontal' },
  { id: 'path-coed-mid', x: 859.709, y: 591.768, width: 127.897, height: 5, rotation: -0.257543, type: 'horizontal' },

  // Academic area paths
  { id: 'path-academic-1', x: 865, y: 428.913, width: 100.122, height: 5, rotation: -8.01764, type: 'rotated' },
  { id: 'path-academic-vert', x: 865.282, y: 432.979, width: 51.098, height: 5, rotation: -97.0461, type: 'vertical' },
  { id: 'path-library-vert', x: 891.409, y: 258.337, width: 51.098, height: 5, rotation: -94.485, type: 'vertical' },
  { id: 'path-bit-vert', x: 1042.97, y: 337.762, width: 70.7622, height: 5, rotation: -89.9094, type: 'vertical' },

  // North area paths (Agriculture/Ongoing building)
  { id: 'path-agri-1', x: 948.663, y: 209.334, width: 109.542, height: 5, rotation: -80.8451, type: 'rotated' },
  { id: 'path-agri-2', x: 859, y: 382.523, width: 51.098, height: 5, rotation: -62.985, type: 'rotated' },
  { id: 'path-agri-vert', x: 742, y: 403.057, width: 51.098, height: 5, rotation: -87.6901, type: 'vertical' },

  // East-west connectors
  { id: 'path-benrc-1', x: 882.105, y: 337.037, width: 163.369, height: 5, rotation: -1.52636, type: 'horizontal' },
  { id: 'path-library-horiz', x: 892.57, y: 254.386, width: 156.456, height: 5, rotation: 4.24245, type: 'horizontal' },
  { id: 'path-agri-top-1', x: 779.37, y: 87, width: 53.5638, height: 5, rotation: 4.24245, type: 'horizontal' },
  { id: 'path-agri-top-2', x: 866.37, y: 93, width: 105.163, height: 5, rotation: 4.24245, type: 'horizontal' },
  { id: 'path-library-mid', x: 887.37, y: 204, width: 66.4508, height: 5, rotation: 4.24245, type: 'horizontal' },

  // Vertical connectors
  { id: 'path-coed-vert', x: 864, y: 592, width: 46.985, height: 5, rotation: 89.9693, type: 'vertical' },
  { id: 'path-hm-vert', x: 954.627, y: 872.868, width: 156.133, height: 5, rotation: 89.8005, type: 'vertical' },
  { id: 'path-bit-east-vert', x: 1051.85, y: 633.029, width: 240.12, height: 5, rotation: 90.4258, type: 'vertical' },
  { id: 'path-library-west-vert', x: 784.768, y: 87.6725, width: 268.809, height: 5, rotation: 97.7301, type: 'vertical' },
  { id: 'path-benrc-diag', x: 964.777, y: 419.645, width: 174.808, height: 5, rotation: 82.4391, type: 'rotated' },
];

// Convert SVG path segment to navigation nodes
export function pathSegmentToNodes(segment: SVGPathSegment): { start: { x: number; y: number }, end: { x: number; y: number } } {
  const rad = (segment.rotation || 0) * (Math.PI / 180);

  if (segment.type === 'horizontal' && !segment.rotation) {
    return {
      start: { x: segment.x, y: segment.y + segment.height / 2 },
      end: { x: segment.x + segment.width, y: segment.y + segment.height / 2 }
    };
  } else if (segment.type === 'vertical' || (segment.rotation && Math.abs(Math.abs(segment.rotation) - 90) < 10)) {
    return {
      start: { x: segment.x, y: segment.y },
      end: { x: segment.x + segment.width * Math.cos(rad), y: segment.y + segment.width * Math.sin(rad) }
    };
  } else {
    // Rotated path
    return {
      start: { x: segment.x, y: segment.y },
      end: { x: segment.x + segment.width * Math.cos(rad), y: segment.y + segment.width * Math.sin(rad) }
    };
  }
}

// Build navigation graph from SVG paths
export function buildNavigationGraph(): Map<string, { x: number; y: number; connections: string[] }> {
  const nodes = new Map<string, { x: number; y: number; connections: string[] }>();
  const threshold = 50; // Connection distance threshold

  // Create nodes from path endpoints
  svgRoadPaths.forEach(segment => {
    const { start, end } = pathSegmentToNodes(segment);

    const startId = `node-${Math.round(start.x)}-${Math.round(start.y)}`;
    const endId = `node-${Math.round(end.x)}-${Math.round(end.y)}`;

    if (!nodes.has(startId)) {
      nodes.set(startId, { x: start.x, y: start.y, connections: [] });
    }
    if (!nodes.has(endId)) {
      nodes.set(endId, { x: end.x, y: end.y, connections: [] });
    }

    // Connect start and end
    nodes.get(startId)!.connections.push(endId);
    nodes.get(endId)!.connections.push(startId);
  });

  // Connect nearby nodes
  const nodeArray = Array.from(nodes.entries());
  for (let i = 0; i < nodeArray.length; i++) {
    for (let j = i + 1; j < nodeArray.length; j++) {
      const [id1, node1] = nodeArray[i];
      const [id2, node2] = nodeArray[j];

      const dist = Math.sqrt(Math.pow(node2.x - node1.x, 2) + Math.pow(node2.y - node1.y, 2));

      if (dist < threshold && !node1.connections.includes(id2)) {
        node1.connections.push(id2);
        node2.connections.push(id1);
      }
    }
  }

  return nodes;
}
