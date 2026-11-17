/**
 * Summary of Teaching Load header colours, as on the college's sheet: PREPS red, UNITS/WEEK blue,
 * HOURS/WEEK orange. Shared by the page, the PDF and the Excel export.
 */
export const TEACHING_LOAD_SUBHEAD_COLORS = {
  preps: "#FF0000",
  units: "#00B0F0",
  hours: "#FFC000",
} as const;

export const TEACHING_LOAD_SUBHEADS = [
  { key: "preps", label: "PREPS", color: TEACHING_LOAD_SUBHEAD_COLORS.preps },
  { key: "units", label: "UNITS/ WEEK", color: TEACHING_LOAD_SUBHEAD_COLORS.units },
  { key: "hours", label: "HOURS/ WEEK", color: TEACHING_LOAD_SUBHEAD_COLORS.hours },
] as const;
