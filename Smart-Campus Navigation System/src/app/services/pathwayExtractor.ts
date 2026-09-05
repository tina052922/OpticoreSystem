// Extract VALID navigation pathways from the CTU Argao SVG
// ONLY paths with #B4BEC7 (grey roads) and #3BB4FF (blue pathways) are walkable
// Elements with #6E6D6D are GATES and must be EXCLUDED

export interface ValidPathway {
  id: string;
  type: 'road' | 'pathway';
  d: string; // SVG path data
  color: string;
}

// Valid walkable pathways extracted from the updated SVG
export const validPathways: ValidPathway[] = [
  // ROAD PATHS (#B4BEC7 - Grey roads)
  {
    id: 'road-main-vertical',
    type: 'road',
    d: 'M730.5 1028.5V993.5L744 977.5L754.5 966.5L765.5 962L785.5 960L816.5 957.5L832 956L840.5 953M840.5 953L869.5 922L873 917L875 926L882.5 988M840.5 953L882.5 988M882.5 988L887.5 1028.5M873 915.5L861 827.5L828 794L825 790L823 445.5L827 311L839.5 181L846.5 93.5',
    color: '#B4BEC7'
  },
  {
    id: 'road-west-corridor',
    type: 'road',
    d: 'M730.5 993L700 949L695 940.5L691 929.5L689 920.5V747.5L687 739L683.5 731L678 723L672 717L666.5 713L658 706M658 706L649 703.5M658 706L669.5 696.5M669.5 696.5H689L821.5 691M669.5 696.5L675.5 599.5L683 489.5L684.5 458L687 454L691 450.5L818.5 458',
    color: '#B4BEC7'
  },

  // PATHWAYS (#3BB4FF - Blue walkways)
  {
    id: 'pathway-admin-area',
    type: 'pathway',
    d: 'M710 962L715.5 942.5V906.5V901.5H798.5V848.5V840.5H820.5L830.5 806',
    color: '#3BB4FF'
  },
  {
    id: 'pathway-admin-horiz-1',
    type: 'pathway',
    d: 'M693 841.5H797',
    color: '#3BB4FF'
  },
  {
    id: 'pathway-admin-horiz-2',
    type: 'pathway',
    d: 'M692.5 824H819.5H825',
    color: '#3BB4FF'
  },
  {
    id: 'pathway-west-vertical',
    type: 'pathway',
    d: 'M724.5 1026.5V993L721 986.5L713 980.5L704.5 976.5L695 964L688 952.5L685 949H670.5H661.5H652.5H647.5V937.5C647.5 934.5 647.5 928.2 647.5 927C647.5 925.8 647.5 921.5 647.5 919.5V910.5V906V903V901H643.5H637.5H629.5H624V884.5V857.5L627 851V845.5V841.5V839.5H637.5V827V760.5L643.5 755.5L647.5 670V666',
    color: '#3BB4FF'
  },
  {
    id: 'pathway-west-connector',
    type: 'pathway',
    d: 'M637 839H648V761.5L650 759.5H683.5H686.5',
    color: '#3BB4FF'
  },
  {
    id: 'pathway-east-main',
    type: 'pathway',
    d: 'M897 1027.5L892.5 882V875H924.5L930.5 871.5V864.5V846.5L934 837.5L939 832.5H944V806V798.5V795M944 795H997.5M944 795H884.5H875H839.5',
    color: '#3BB4FF'
  },
  {
    id: 'pathway-cote-coed',
    type: 'pathway',
    d: 'M829 744.5H999V693H834H829',
    color: '#3BB4FF'
  },
  {
    id: 'pathway-benrc-connector',
    type: 'pathway',
    d: 'M842 540.5L856 533.5L850 494.5L846.5 487L861 482L868.5 475.5L914 469.5',
    color: '#3BB4FF'
  },
  {
    id: 'pathway-east-vertical',
    type: 'pathway',
    d: 'M834.5 689.5V598.5L853.5 593.5L883.5 584.5L924.5 578H930V572.5V567.5L920 487.5',
    color: '#3BB4FF'
  },
];

// Extract navigation nodes from path data
export interface NavNode {
  id: string;
  x: number;
  y: number;
  connections: string[]; // Node IDs this node connects to
  pathways: string[]; // Pathway IDs this node is part of
}

// Helper function to extract coordinates from SVG path
function extractCoordinatesFromPath(pathData: string): { x: number; y: number }[] {
  const coords: { x: number; y: number }[] = [];
  const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];

  let currentX = 0;
  let currentY = 0;

  commands.forEach(cmd => {
    const type = cmd[0];
    const values = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

    switch (type) {
      case 'M':
      case 'L':
        if (values.length >= 2) {
          currentX = values[0];
          currentY = values[1];
          coords.push({ x: currentX, y: currentY });
        }
        break;
      case 'H':
        currentX = values[0];
        coords.push({ x: currentX, y: currentY });
        break;
      case 'V':
        currentY = values[0];
        coords.push({ x: currentX, y: currentY });
        break;
    }
  });

  return coords;
}

// Build navigation graph from valid pathways
export function buildPathwayGraph(): Map<string, NavNode> {
  const nodes = new Map<string, NavNode>();
  const proximityThreshold = 30; // Distance to consider nodes connected

  // Extract all coordinate points from valid pathways
  validPathways.forEach(pathway => {
    const coords = extractCoordinatesFromPath(pathway.d);
    const pathNodeIds: string[] = [];

    coords.forEach((coord, index) => {
      const nodeId = `node-${Math.round(coord.x)}-${Math.round(coord.y)}`;
      pathNodeIds.push(nodeId);

      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          x: coord.x,
          y: coord.y,
          connections: [],
          pathways: [pathway.id]
        });
      } else {
        const node = nodes.get(nodeId)!;
        if (!node.pathways.includes(pathway.id)) {
          node.pathways.push(pathway.id);
        }
      }
    });

    // Connect sequential nodes in this pathway
    for (let i = 0; i < pathNodeIds.length - 1; i++) {
      const node1 = nodes.get(pathNodeIds[i])!;
      const node2 = nodes.get(pathNodeIds[i + 1])!;

      if (!node1.connections.includes(pathNodeIds[i + 1])) {
        node1.connections.push(pathNodeIds[i + 1]);
      }
      if (!node2.connections.includes(pathNodeIds[i])) {
        node2.connections.push(pathNodeIds[i]);
      }
    }
  });

  // Connect nearby nodes from different pathways (intersections)
  const nodeArray = Array.from(nodes.values());
  for (let i = 0; i < nodeArray.length; i++) {
    for (let j = i + 1; j < nodeArray.length; j++) {
      const node1 = nodeArray[i];
      const node2 = nodeArray[j];

      const dist = Math.sqrt(
        Math.pow(node2.x - node1.x, 2) + Math.pow(node2.y - node1.y, 2)
      );

      if (dist < proximityThreshold && !node1.connections.includes(node2.id)) {
        node1.connections.push(node2.id);
        node2.connections.push(node1.id);
      }
    }
  }

  return nodes;
}
