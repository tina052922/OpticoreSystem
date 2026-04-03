import { BSIT_PROSPECTUS_SUBJECTS } from "../lib/chairman/bsit-prospectus.ts";

const pid = "prog-bsit";
const skipCodes = new Set(["CC-111", "CC-112", "CC-112L", "CC-214", "CC-214L", "PC-224"]);
const rows = BSIT_PROSPECTUS_SUBJECTS.filter((s) => !skipCodes.has(s.code)).map((s) => {
  const id =
    "sub-bsit-" +
    s.code
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const title = s.title.replace(/'/g, "''");
  return `  ('${id}', '${s.code}', null, '${title}', ${s.lecUnits}, ${s.lecHours}, ${s.labUnits}, ${s.labHours}, '${pid}', ${s.yearLevel})`;
});
console.log(rows.join(",\n"));
