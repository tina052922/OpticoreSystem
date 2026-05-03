import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** facility_id, name, svg_id (trimmed), image(s), x, y */
const rows = [
  ['AO-001', 'BIT Lecture Lab Room 5', 'BIT Lecture Lab Room 5', ['BITLectureLab5.JPG'], 1003, 767],
  ['AO-002', 'GT Lab 3', 'GT Lab 3', ['GTLab3.JPG'], 1003, 737],
  ['AO-003', 'DT Lab 1', 'DT Lab 1', ['DTLab1&2.JPG'], 1003, 707],
  ['AO-004', 'DT Lab 2', 'DT Lab 2', ['DTLab1&2.JPG'], 1003, 677],
  ['AO-005', 'ES Room 3', 'ES Room 3', ['ESRoom3.JPG'], 933, 704],
  ['AO-006', 'ES Room 2', 'ES Room 2', ['ESRoom2.JPG'], 905, 704],
  ['AO-007', 'ES Room 1', 'ES Room 1', ['ESRoom1.JPG'], 877, 704],
  ['AO-008', 'CWTS Office', 'CWTS Office', ['CWTSOffice.JPG'], 845, 719],
  ['AO-009', 'ROTC Office', 'ROTC Office', ['ROTCOffice.JPG'], 845, 697],
  ['AO-010', 'BIT AT Lab 1', 'BIT AT Lab 1', ['BITATLab1.JPG'], 934, 552],
  ['AO-011', 'BIT AT Lab 2', 'BIT AT Lab 2', ['BITATLab2.JPG'], 931, 522],
  ['AO-012', 'BIT AT Lab 3', 'BIT AT Lab 3', ['BITATLab3.JPG'], 927, 492],
  ['AO-013', 'BIT AT Lab 4', 'BIT AT Lab 4', ['BITATLab4.JPG'], 923, 462],
  ['AO-014', 'CTU-DOST-NICER Office', 'CTU-DOST-NICER Office', ['CTUACNICEROffice.JPG'], 928, 423],
  ['AO-015', 'BENRC Tissue Culture Lab', 'BENRC Tissue Culture Lab', ['BENRCTissueCultureLab.JPG'], 867, 427],
  ['AO-016', 'BENRC-IFNI Training Center', 'BENRC-IFNI Training Center', ['BENRCIFNITrainingCenter.JPG'], 833, 443],
  ['AO-017', 'BENRC Microtel', 'BENRC Microtel', ['BENRCMicrotel.JPG'], 829, 417],
  ['AO-018', 'HM 4', 'HM 4', ['HM4.JPG'], 604, 754],
  ['AO-019', 'HM 3', 'HM 3', ['HM3.JPG'], 604, 771],
  ['AO-020', 'HM 2', 'HM 2', ['HM2.JPG'], 604, 788],
  ['AO-021', 'HM 1', 'HM 1', ['HM1.JPG'], 604, 805],
  ['AO-022', 'TM 5', 'TM 5', ['TM5.JPG'], 652, 763],
  ['AO-023', 'TM 2', 'TM 2', ['TM2.JPG'], 652, 829],
  ['AO-024', 'TM 1', 'TM 1', ['TM1.JPG'], 652, 813],
  ['AO-025', 'TM 3', 'TM 3', ['TM3.JPG'], 645, 862],
  ['AO-026', 'TM 4', 'TM 4', ['TM4.JPG'], 631, 862],
  ['AO-027', 'GDS Lab', 'GDS Lab', ['GDSLab.JPG'], 652, 845],
  ['AO-028', 'Tourism Management Office', 'Tourism Management Office', ['TMOffice.JPG', 'TMOffice2.JPG'], 600, 675],
  ['AO-029', 'Power House', 'Power House', ['PowerHouse.JPG'], 652, 793],
  ['AO-030', 'General Services', 'General Services', ['GeneralServices.JPG'], 615, 668],
  ['AO-031', 'Maintenance', 'Maintenance', ['MaintenanceSR.JPG'], 628, 675],
  ['AO-032', 'DRRMO', 'DRRMO', ['DRRMO.JPG'], 595, 650],
  ['AO-033', 'Storage Room', 'Storage Room', ['StorageRoom.JPG'], 604, 842],
  ['AO-034', 'STO Office', 'STO Office', ['STOOffice.JPG'], 604, 853],
  ['AO-035', 'Southern Ripples', 'Southern Ripples', ['SouthernRipples.JPG'], 612, 868],
  ['AO-036', 'Utility Office', 'Utility Office', ['UtilityOffice.JPG'], 625, 650],
  ['AO-037', 'Student Affairs Office (SAO)', 'Student Affairs Office (SAO)', ['SAO.JPG'], 638, 668],
  ['AO-038', 'Cultural Office', 'Cultural Office', ['CulturalOffice.JPG'], 570, 680],
  ['AO-039', 'SSG Office', 'SSG Office', ['SSG.JPG'], 652, 655],
  ['AO-040', 'FSTLP', 'FSTLP', ['FSTLP.JPG'], 617, 962],
  ['AO-041', 'Campus Ministry', 'Campus Ministry', ['CampusMinistry.JPG'], 565, 665],
  ['AO-042', 'COOP Office', 'COOP Office', ['COOPOffice.JPG', 'COOP2.JPG'], 642, 685],
  ['AO-043', 'Kahimsug Center Sci-Tech Argao', 'Kahimsug Center Sci-Tech Argao', ['KahimsugCenter.JPG'], 656, 1004],
  ['AO-044', 'Balay sa Alumni', 'Balay sa Alumni', ['BalaySaAlumni.JPG'], 668, 992],
  ['AO-045', 'Guard House', 'Guard House', ['GuardHouse.JPG'], 690, 987]
];

const offices = rows.map(([id, name, svgId, imgs, x, y]) => {
  const paths = imgs.map((f) => `/images/offices/${f}`);
  const image = paths.length === 1 ? paths[0] : paths;
  const slug = id.toLowerCase();
  const kw = [slug, name.toLowerCase(), 'standalone', 'additional office'];
  return {
    id,
    name,
    type: 'office',
    svgId,
    svg_id: svgId,
    buildingId: null,
    floor: null,
    floors: null,
    category: 'Office',
    description: `${name}.`,
    image,
    keywords: kw,
    x,
    y
  };
});

const out = path.join(__dirname, '..', 'src', 'app', 'data', 'json', 'offices.json');
fs.writeFileSync(out, JSON.stringify(offices, null, 2) + '\n');
console.log('Wrote', offices.length, 'rows to', out);
