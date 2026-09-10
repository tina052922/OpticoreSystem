import type { LocationRecord } from '../types/locationRecord';
import { resolveCatalogImageList } from '../utils/campusImageAssets';
import { PUBLIC_IMAGE_PLACEHOLDER } from '../utils/publicAssetUrl';
import buildings from './json/buildings.json';
import rooms from './json/rooms.json';
import offices from './json/offices.json';
import facilities from './json/facilities.json';
import cr from './json/cr.json';
import landmarks from './json/landmarks.json';

type JsonRow = {
  id: string;
  /** Official display name (may include spaces); used in UI and search. */
  name: string;
  type: LocationRecord['type'];
  /**
   * SVG / Figma layer `id` for `getElementById` / highlighting (no spaces; matches exported layer id).
   * Official tables may label this column `svg_id` — see `svg_id` below.
   */
  svgId: string | null;
  /** Optional official column: when present, must equal the SVG element `id` (same as `svgId` after load). */
  svg_id?: string | null;
  buildingId: string | null;
  floor: number | null;
  floors: number[] | null;
  category: string;
  description: string;
  images?: string[];
  image?: string | string[];
  keywords: string[];
  x: number;
  y: number;
  room_id?: string | null;
  building_id?: number | null;
};

function collectImageStrings(row: JsonRow): string[] {
  const raw =
    row.images ??
    (Array.isArray(row.image) ? row.image : row.image != null && row.image !== '' ? [row.image] : []);
  return raw
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter((s) => s !== '' && s !== '-');
}

/** Additional offices (table 3) are always standalone — never parented to a building. Facilities may link to a building when the official data says so (e.g. Chapel). */
function normalize(row: JsonRow): LocationRecord {
  const rawPaths = collectImageStrings(row);
  const imgs = resolveCatalogImageList(rawPaths.length ? rawPaths : [PUBLIC_IMAGE_PLACEHOLDER]);
  const effectiveBuildingId = row.type === 'office' ? null : row.buildingId;
  const svgFromOfficial = row.svg_id ?? row.svgId;
  if (
    import.meta.env.DEV &&
    row.svg_id != null &&
    row.svgId != null &&
    String(row.svg_id).trim() !== String(row.svgId).trim()
  ) {
    console.warn('[catalog] svg_id and svgId differ for', row.id, row.name, row.svg_id, row.svgId);
  }
  const rid = row.room_id?.trim();
  const rawSvg = svgFromOfficial == null ? '' : String(svgFromOfficial);
  /** Preserve Figma/CSS `id` exactly (e.g. trailing spaces); empty-only → null. */
  const svgId = rawSvg.trim() === '' ? null : rawSvg;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    x: row.x,
    y: row.y,
    floor: row.floor ?? undefined,
    building: effectiveBuildingId ?? undefined,
    keywords: row.keywords,
    svgId,
    roomId: rid || undefined,
    category: row.category,
    description: row.description,
    images: imgs.length ? imgs : [PUBLIC_IMAGE_PLACEHOLDER],
    floors: row.floors ?? undefined,
    buildingId: effectiveBuildingId,
  };
}

const rows: JsonRow[] = [
  ...(buildings as JsonRow[]),
  ...(rooms as JsonRow[]),
  ...(offices as JsonRow[]),
  ...(facilities as JsonRow[]),
  ...(cr as JsonRow[]),
  ...(landmarks as JsonRow[]),
];

if (import.meta.env.DEV) {
  for (const row of rows) {
    if (row.type === 'office' && row.buildingId != null) {
      console.warn(
        '[catalog] office rows must use buildingId null in JSON (standalone). Ignoring parent for:',
        row.id,
        row.name
      );
    }
  }
}

export const locationRecords: LocationRecord[] = rows.map(normalize);

export function getLocationById(id: string): LocationRecord | undefined {
  return locationRecords.find((l) => l.id === id);
}

/** Use after search/list pick so UI always reflects normalized images and `svgId` from the catalog. */
export function getCanonicalLocation(loc: LocationRecord): LocationRecord {
  return getLocationById(loc.id) ?? loc;
}

/**
 * Interiors that belong on a building floor plan: rooms and CRs with a building link only.
 * Never offices, facilities, or landmarks — they do not appear under building room lists.
 */
function isInteriorOfBuilding(loc: LocationRecord): boolean {
  if (
    loc.type === 'office' ||
    loc.type === 'facility' ||
    loc.type === 'landmark' ||
    loc.type === 'department'
  ) {
    return false;
  }
  if (!loc.buildingId) return false;
  return loc.type === 'room' || loc.type === 'cr';
}

export function getInteriorForBuilding(buildingId: string): LocationRecord[] {
  return locationRecords.filter((l) => l.buildingId === buildingId && isInteriorOfBuilding(l));
}

export function getRelatedForSelection(selected: LocationRecord): LocationRecord[] {
  if (selected.type === 'building') {
    return getInteriorForBuilding(selected.id).filter((l) => l.id !== selected.id);
  }
  if (selected.buildingId && isInteriorOfBuilding(selected)) {
    const sibs = locationRecords.filter(
      (l) => l.buildingId === selected.buildingId && l.id !== selected.id && isInteriorOfBuilding(l)
    );
    const parent = getLocationById(selected.buildingId);
    return parent ? [parent, ...sibs.filter((x) => x.id !== parent.id)] : sibs;
  }
  return [];
}
