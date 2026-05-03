import type { Location } from './campus';

/** Rich location row from JSON (buildings, rooms, offices, facilities, landmarks). */
export interface LocationRecord extends Location {
  /** Same as official `svg_id`: SVG element `id` / Figma-exported layer id for map lookup. */
  svgId: string | null;
  /** Official `room_id` / `item_id` from campus tables (e.g. `COTE 101`, `AO-028`). */
  roomId?: string;
  category: string;
  description: string;
  images: string[];
  floors?: number[];
  /** Same as `building` when linked to a parent building/office id. */
  buildingId?: string | null;
}
