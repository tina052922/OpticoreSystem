import fs from "node:fs";

const ts = fs.readFileSync("web/lib/chairman/bs-envsci-prospectus.ts", "utf8");
const m = ts.match(/BSENVS_PROSPECTUS_SUBJECTS: ProspectusSubjectRow\[] = (\[[\s\S]*?\]);/);
if (!m) throw new Error("Could not parse BSENVS_PROSPECTUS_SUBJECTS");
const arr = eval(m[1].replace(/as const/g, ""));

function slug(c) {
  return c
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const rows = arr.map((s) => ({
  id: `sub-bsenvs-${slug(s.code.replace(/^BSENVS-/i, ""))}`,
  code: s.code,
  title: s.title.replace(/'/g, "''"),
  lecUnits: s.lecUnits,
  lecHours: s.lecHours,
  labUnits: s.labUnits,
  labHours: s.labHours,
  yearLevel: s.yearLevel,
  semester: s.semester,
}));

let sql = "";
sql += `insert into public."College" (id, code, name) values ('col-cafe', 'CAFE', 'College of Forestry and Environmental Sciences') on conflict (code) do nothing;\n`;
sql += `insert into public."Program" (id, code, name, "collegeId") values ('prog-bs-envsci', 'BSENVS', 'Bachelor of Science in Environmental Science', 'col-cafe') on conflict (code) do nothing;\n`;

const secs = [
  ["sec-bsenvs-1a", "BSENVS-1A", 1],
  ["sec-bsenvs-1b", "BSENVS-1B", 1],
  ["sec-bsenvs-2a", "BSENVS-2A", 2],
  ["sec-bsenvs-2b", "BSENVS-2B", 2],
  ["sec-bsenvs-3a", "BSENVS-3A", 3],
  ["sec-bsenvs-4a", "BSENVS-4A", 4],
];
for (const [id, name, yl] of secs) {
  sql += `insert into public."Section" (id, "programId", name, "yearLevel", "studentCount") values ('${id}', 'prog-bs-envsci', '${name}', ${yl}, 32) on conflict (id) do nothing;\n`;
}

sql += `insert into public."Subject" (id, code, subcode, title, "lecUnits", "lecHours", "labUnits", "labHours", "programId", "yearLevel", semester) values\n`;
sql += rows
  .map(
    (r) =>
      `  ('${r.id}', '${r.code}', null, '${r.title}', ${r.lecUnits}, ${r.lecHours}, ${r.labUnits}, ${r.labHours}, 'prog-bs-envsci', ${r.yearLevel}, ${r.semester})`,
  )
  .join(",\n");
sql += `\non conflict (code) do update set title = excluded.title, "lecUnits" = excluded."lecUnits", "lecHours" = excluded."lecHours", "labUnits" = excluded."labUnits", "labHours" = excluded."labHours", "programId" = excluded."programId", "yearLevel" = excluded."yearLevel", semester = excluded.semester;\n`;

fs.writeFileSync("supabase/seed_ctu_argao_bs_envsci_generated.sql", sql);
console.log("Wrote subjects:", rows.length);
