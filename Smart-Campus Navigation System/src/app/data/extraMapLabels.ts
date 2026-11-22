/**
 * Labels for places the map drawing does not name (its labels are drawn into the SVG as shapes,
 * and these were left out). Drawn by the map at load, at each place's catalog position, in the
 * same style as the drawn labels: dark text with a white outline.
 *
 * `lines` wrap long names to fit narrow boxes; `size` is in map units (the drawing's labels are
 * about 5–12); `dy` moves the label down (negative: up — e.g. above a box too small to hold it).
 */
export type ExtraMapLabel = { name: string; lines: string[]; size: number; dy?: number };

export const EXTRA_MAP_LABELS: ExtraMapLabel[] = [
  { name: 'Basketball Court', lines: ['Basketball Court'], size: 9.5 },
  { name: 'Green House', lines: ['Green', 'House'], size: 7 },
  { name: 'Power House', lines: ['Power', 'House'], size: 6 },
  { name: 'Maintenance', lines: ['Mainte-', 'nance'], size: 5.5 },
  { name: 'Storage Room', lines: ['Storage', 'Room'], size: 5.5 },
  { name: 'CTU-Argao Chess Center', lines: ['Chess', 'Center'], size: 6, dy: -16 },
  { name: 'BIT Lecture Lab Room 5', lines: ['BIT Lecture', 'Lab Rm 5'], size: 5 },
  { name: 'GT Lab 3', lines: ['GT Lab 3'], size: 6 },
  { name: 'DT Lab 1', lines: ['DT Lab 1'], size: 6 },
  { name: 'DT Lab 2', lines: ['DT Lab 2'], size: 6 },
];
