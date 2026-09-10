/**
 * Official CTU campus catalog → src/app/data/json/*.json
 * Run: node scripts/generate-official-catalog.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'src', 'app', 'data', 'json');
const PLACEHOLDER = '/images/placeholders/default.svg';

const B = (n) => `B${String(n).padStart(3, '0')}`;

/** Box center (left + w/2, top + h/2) from Figma/CSS export — keys must match `svg_id` on layers. */
function c(l, t, w, h) {
  return { x: Math.round((l + w / 2) * 100) / 100, y: Math.round((t + h / 2) * 100) / 100 };
}

const CSS_LAYER_CENTERS = {
  'Kahimsug Center Sci-Tech Argao': c(646, 992, 20, 24),
  'Guard House': c(690, 987, 26, 29),
  'Balay sa Alumni': c(668, 992, 20, 24),
  'COOP Office': c(596, 994, 41, 22),
  'Student Affairs Office (SAO)': c(597, 906, 40, 16),
  'Cultural Office': c(597, 922, 40, 16),
  'SSG Office': c(597, 938, 40, 16),
  FSTLP: c(597, 954, 40, 16),
  'Campus Ministry': c(597, 970, 40, 16),
  'TM 4': c(631, 862, 14, 33),
  'TM 3': c(645, 862, 14, 33),
  'Tourism Management Office': c(659, 862, 22, 33),
  'GDS Lab': c(652, 845, 29, 17),
  'TM 2': c(652, 829, 29, 16),
  'TM 1': c(652, 813, 29, 16),
  'Power House': c(652, 793, 29, 20),
  'General Services': c(668, 763, 13, 30),
  'TM 5': c(652, 763, 16, 30),
  DRRMO: c(641, 844, 11, 18),
  Maintenance: c(631, 844, 11, 18),
  'CR (SAO)': c(598, 887, 15, 12),
  'CR SAO': c(598, 887, 15, 12),
  'CR (Male)': c(605, 822, 14, 20),
  'CR (Female)': c(616, 822, 17, 13),
  'STO Office': c(604, 853, 16, 10),
  'Southern Ripples': c(604, 863, 16, 10),
  'Utility Office': c(604, 873, 16, 10),
  'HM 1': c(604, 805, 29, 17),
  'HM 2': c(604, 788, 29, 17),
  'HM 3': c(604, 771, 29, 17),
  'HM 4': c(604, 754, 29, 17),
  'Admin Building  ': c(608, 662, 31.79, 88),
  'Admin Building': c(608, 662, 31.79, 88),
  'Science and Technology Building': c(623.84, 400, 33.98, 245.88),
  'ACAD Bldg. Pres. Diosdado Macapagal Academic': c(678.07, 403, 113.19, 32.03),
  Library: c(755.06, 270.64, 48.25, 94.49),
  'Agriculture Building': c(779.11, 91.85, 33.2, 92.47),
  'Green House': c(780.28, 195.8, 29.53, 38.75),
  Oval: c(686, 460, 113.27, 221),
  'Kalampusan Gym': c(695.58, 707.08, 118.05, 76.71),
  Canteen: c(753, 784.67, 44.66, 33.76),
  'Basketball Court': c(703, 848, 93, 51),
  'Shared Service Facility for Handbloom Weaving': c(903, 928, 43, 90),
  'Mini Hotel': c(903, 882, 43, 42),
  'HM Department': c(936.9, 805.98, 105.01, 63.95),
  'CTU-Argao Chess Center': c(863, 1009, 7, 11),
  Chapel: c(880, 806, 49, 29),
  'Student Lounge': c(800, 848, 49, 29),
  'COTE Building': c(845, 750, 153, 38),
  'COED Building': c(845, 647, 153, 38),
  'ROTC Office': c(845, 697, 28, 22),
  'ES Room 1': c(877, 704, 28, 22),
  'ES Room 2': c(905, 704, 28, 22),
  'ES Room 3': c(933, 704, 28, 22),
  'CWTS Office': c(845, 719, 28, 22),
  'Old Stage': c(843, 561, 23, 28),
  'BIT AT Lab 1': c(934.79, 552.42, 41.11, 30.84),
  'BIT AT Lab 2': c(931, 522, 41.11, 30.84),
  'BIT AT Lab 3': c(927, 492, 41.11, 30.84),
  'BIT AT Lab 4': c(923, 462, 41.11, 30.84),
  'CTU-DOST-NICER Office': c(928.18, 423.01, 30.75, 39.33),
  'BENRC Microtel': c(829, 416.86, 31.82, 28.05),
  'BENRC-IFNI Training Center': c(833, 443.39, 36.43, 28.05),
  'BENRC Tissue Culture Lab': c(867.42, 426.74, 61.79, 29.63),
  'DT Lab 2': c(1003, 677, 30.5, 35.18),
  'DT Lab 1': c(1003, 707, 30.5, 35.18),
  'GT Lab 3': c(1003, 737, 30.5, 35.18),
  'BIT Lecture Lab Room 5': c(1003, 767, 30.5, 35.18),
  Biodiversity: c(853.4, 474.46, 71.48, 88.49),
  'Storage Room': c(604, 842, 19, 11)
};

const BUILDING_ID_CENTER = {
  1: CSS_LAYER_CENTERS['Shared Service Facility for Handbloom Weaving'],
  2: CSS_LAYER_CENTERS['Mini Hotel'],
  3: CSS_LAYER_CENTERS['HM Department'],
  4: CSS_LAYER_CENTERS.Chapel,
  5: CSS_LAYER_CENTERS['COTE Building'],
  6: CSS_LAYER_CENTERS['COED Building'],
  7: CSS_LAYER_CENTERS['Admin Building'],
  8: CSS_LAYER_CENTERS['Science and Technology Building'],
  9: CSS_LAYER_CENTERS['ACAD Bldg. Pres. Diosdado Macapagal Academic'],
  10: CSS_LAYER_CENTERS.Library,
  11: CSS_LAYER_CENTERS['Agriculture Building'],
  12: CSS_LAYER_CENTERS.Biodiversity
};

function cssXY(svg) {
  if (svg == null || svg === '') return null;
  const s = String(svg);
  return CSS_LAYER_CENTERS[s] ?? CSS_LAYER_CENTERS[s.trim()] ?? null;
}

function applyCssAnchors(rows) {
  return rows.map((r) => {
    const p = cssXY(r.svg_id);
    return p ? { ...r, x: p.x, y: p.y } : r;
  });
}

/** Interior / ST / AB rooms: layer hit first, else building bbox center from CSS. */
function alignRoomRows(rows) {
  return rows.map((r) => {
    if (r.type !== 'room') return r;
    const p = cssXY(r.svg_id);
    if (p) return { ...r, x: p.x, y: p.y };
    const bid = r.building_id;
    if (bid != null && BUILDING_ID_CENTER[bid]) {
      const bc = BUILDING_ID_CENTER[bid];
      return { ...r, x: bc.x, y: bc.y };
    }
    return r;
  });
}

function alignCrRows(rows) {
  return rows.map((r) => {
    const p = cssXY(r.svg_id);
    if (p) return { ...r, x: p.x, y: p.y };
    const bid = r.building_id;
    if (bid != null && BUILDING_ID_CENTER[bid]) {
      const bc = BUILDING_ID_CENTER[bid];
      return { ...r, x: bc.x, y: bc.y };
    }
    return r;
  });
}

function imgRooms(f) {
  if (!f || f === '-') return PLACEHOLDER;
  return `/images/rooms/${f}`;
}
function imgOff(f) {
  if (!f || f === '-') return PLACEHOLDER;
  return `/images/offices/${f}`;
}
function imgFac(f) {
  if (!f || f === '-') return PLACEHOLDER;
  return `/images/facilities/${f}`;
}
function imgBld(f) {
  return `/images/buildings/${f}`;
}

const buildings = [
  [1, 'Shared Service Facility for Handbloom Weaving', 'Shared Service Facility for Handbloom Weaving', [1, 2, 3], 'SharedServiceFacilityForHandbloomWeaving.JPG', 903, 928],
  [2, 'Mini Hotel', 'Mini Hotel', [1, 2], 'MiniHotel.JPG', 903, 882],
  [3, 'HM Department', 'HM Department', [1], 'HMDepartment.JPG', 936, 805],
  [4, 'Chapel', 'Chapel', [1], 'Chapel.JPG', 880, 806],
  [5, 'COTE Building', 'COTE Building', [1, 2, 3, 4], ['COTEBuilding1.JPG', 'COTEBuilding2.JPG'], 845, 750],
  [6, 'COED Building', 'COED Building', [1, 2, 3, 4], ['COEDBuilding1.JPG', 'COEDBuilding2.JPG'], 845, 647],
  [7, 'Admin Building', 'Admin Building', [1, 2], 'AdminBuilding.JPG', 608, 662],
  [8, 'Science and Technology Building', 'Science and Technology Building', [1, 2, 3], 'Sci-TechBuilding.JPG', 623, 400],
  [9, 'ACAD Bldg. Pres. Diosdado Macapagal Academic', 'ACAD Bldg. Pres. Diosdado Macapagal Academic', [1], 'ACAD.JPG', 678, 403],
  [10, 'Library', 'Library', [1, 2], ['Library1.JPG', 'Library2.JPG'], 755, 270],
  [11, 'Agriculture Building', 'Agriculture Building', [1, 2], 'AgricultureBuilding.JPG', 779, 91],
  [12, 'Biodiversity', 'Biodiversity', [1, 2], 'Biodiversity.JPG', 853, 474]
].map(([num, name, svg, floors, img, x, y]) => {
  const id = B(num);
  const image = Array.isArray(img) ? img.map(imgBld) : imgBld(img);
  return {
    id,
    name,
    type: 'building',
    svgId: svg,
    svg_id: svg,
    buildingId: null,
    floor: null,
    floors,
    category: 'Building',
    description: `${name}.`,
    image,
    keywords: [name.toLowerCase(), `building-${num}`, id.toLowerCase()],
    x,
    y,
    building_id: num
  };
});

/** [id, room_id, name, buildingNum, floor, svg_id, imageFile, category, x, y] */
const interiorRooms = [
  // Shared Service Facility for Handbloom Weaving (B001)
  ['B001-R01', 'Room 01', 'Show Room', 1, 1, 'Room 01', 'ShowRoom.JPG', 'Room', 903, 928],
  ['B001-R02', 'Room 02', 'Embroidery', 1, 1, 'Room 02', 'Embroidery.JPG', 'Room', 903, 928],
  ['B001-R03', 'Room 03', 'Conference Room', 1, 2, 'Room 03', 'ConferenceRoom.JPG', 'Room', 903, 928],
  ['B001-R04', 'Room 04', 'Garments Room', 1, 2, 'Room 04', 'IMG_4473.JPG', 'Room', 903, 928],
  ['B001-R05', 'Room 05', 'Thread Room', 1, 2, 'Room 05', 'ThreadRoom.JPG', 'Room', 903, 928],
  ['B001-R06', 'Room 06', 'Studio Room', 1, 3, 'Room 06', 'StudioRoom.JPG', 'Room', 903, 928],
  ['B001-R07', 'Room 07', 'Food Laboratory', 1, 3, 'Room 07', 'FoodLab.JPG', 'Laboratory', 903, 928],
  ['COTE-101', 'COTE 101', "COTE Dean's Office", 5, 1, 'COTE 101', 'COTEDeansOffice.JPG', 'Office', 845, 750],
  ['COTE-102', 'COTE 102', 'FAB Lab', 5, 1, 'COTE 102', 'FABLab.JPG', 'Laboratory', 845, 750],
  ['COTE-103', 'COTE 103', 'W.S.M. & Ergonomics Lab', 5, 1, 'COTE 103', 'WSM&ErgonomicsLab.JPG', 'Laboratory', 845, 750],
  ['COTE-104', 'COTE 104', 'GT Lab 2', 5, 1, 'COTE 104', 'GTLab2.JPG', 'Laboratory', 845, 750],
  ['COTE-105', 'COTE 105', 'GT Lab 1', 5, 1, 'COTE 105', 'GTLab1.JPG', 'Laboratory', 845, 750],
  ['COTE-201', 'COTE 201', 'BIT Faculty Office', 5, 2, 'COTE 201', 'BITFacultyRoom.JPG', 'Office', 845, 750],
  ['COTE-202', 'COTE 202', 'ET Lab 01 Automation Lab', 5, 2, 'COTE 202', 'ETLab1.JPG', 'Laboratory', 845, 750],
  ['COTE-203', 'COTE 203', 'ET Lab 02', 5, 2, 'COTE 203', 'ETLab2.JPG', 'Laboratory', 845, 750],
  ['COTE-204', 'COTE 204', 'ET Lab 03 Digital Communication Lab', 5, 2, 'COTE 204', 'ETLab3.JPG', 'Laboratory', 845, 750],
  ['COTE-205', 'COTE 205', 'DT Lab 01 (CAD)', 5, 2, 'COTE 205', 'DTLab1.JPG', 'Laboratory', 845, 750],
  ['COTE-206', 'COTE 206', 'DT Lab 02', 5, 2, 'COTE 206', 'DTLab2.JPG', 'Laboratory', 845, 750],
  ['COTE-207', 'COTE 207', 'DT Lab 03', 5, 2, 'COTE 207', 'DTLab3.JPG', 'Laboratory', 845, 750],
  ['COTE-301', 'COTE 301', 'BSIT Faculty Office', 5, 3, 'COTE 301', 'BSITFaculty.JPG', 'Office', 845, 750],
  ['COTE-302', 'COTE 302', 'IT Lab 04', 5, 3, 'COTE 302', 'ITLab4.JPG', 'Laboratory', 845, 750],
  ['COTE-303', 'COTE 303', 'IT Lab 03', 5, 3, 'COTE 303', 'ITLab3.JPG', 'Laboratory', 845, 750],
  ['COTE-304', 'COTE 304', 'IT Lab 02', 5, 3, 'COTE 304', 'ITLab2.JPG', 'Laboratory', 845, 750],
  ['COTE-305', 'COTE 305', 'IT Lab 01', 5, 3, 'COTE 305', 'ITLab1.JPG', 'Laboratory', 845, 750],
  ['COTE-306', 'COTE 306', 'CT Lab 02', 5, 3, 'COTE 306', 'CTLab2.JPG', 'Laboratory', 845, 750],
  ['COTE-307', 'COTE 307', 'CT Lab 01', 5, 3, 'COTE 307', 'CTLab1.JPG', 'Laboratory', 845, 750],
  ['COTE-401', 'COTE 401', 'CAFE Faculty', 5, 4, 'COTE 401', 'CAFEFaculty.JPG', 'Office', 845, 750],
  ['COTE-402', 'COTE 402', 'Forestry Lab 1', 5, 4, 'COTE 402', 'Forestry.JPG', 'Laboratory', 845, 750],
  ['COTE-403', 'COTE 403', 'Forestry Lab 2', 5, 4, 'COTE 403', 'Forestry.JPG', 'Laboratory', 845, 750],
  ['COTE-404', 'COTE 404', 'Forestry Lab 3', 5, 4, 'COTE 404', 'ForestryLab3.JPG', 'Laboratory', 845, 750],
  ['COTE-405', 'COTE 405', 'Forestry Lab 4', 5, 4, 'COTE 405', 'Forestry.JPG', 'Laboratory', 845, 750],
  ['COTE-406', 'COTE 406', 'CT Lab 04', 5, 4, 'COTE 406', 'CTLab4.JPG', 'Laboratory', 845, 750],
  ['COTE-407', 'COTE 407', 'CT Lab 03', 5, 4, 'COTE 407', 'CTLab3.JPG', 'Laboratory', 845, 750],
  ['Room-101', 'Room 101', 'Accreditation Room', 6, 1, 'Room 101', 'AccreditationRoom.JPG', 'Room', 845, 647],
  ['Room-102', 'Room 102', 'COED Lab 1', 6, 1, 'Room 102', 'COEDLab1.JPG', 'Laboratory', 845, 647],
  ['Room-103', 'Room 103', 'COED Lab 2', 6, 1, 'Room 103', 'COEDLab2.JPG', 'Laboratory', 845, 647],
  ['Room-104', 'Room 104', 'COED Lab 3', 6, 1, 'Room 104', 'COEDLab3.JPG', 'Laboratory', 845, 647],
  ['Room-200', 'Room 200', 'Temp Faculty Room', 6, 2, 'Room 200', 'TempFacultyRoom.JPG', 'Office', 845, 647],
  ['Room-201', 'Room 201', '201', 6, 2, 'Room 201', '2ndFloor.JPG', 'Room', 845, 647],
  ['Room-202', 'Room 202', '202', 6, 2, 'Room 202', '2ndFloor.JPG', 'Room', 845, 647],
  ['Room-203', 'Room 203', '203', 6, 2, 'Room 203', '2ndFloor.JPG', 'Room', 845, 647],
  ['Room-204', 'Room 204', '204', 6, 2, 'Room 204', '2ndFloor.JPG', 'Room', 845, 647],
  ['Room-205', 'Room 205', '205', 6, 2, 'Room 205', '2ndFloor.JPG', 'Room', 845, 647],
  ['Room-206', 'Room 206', '206', 6, 2, 'Room 206', '2ndFloor.JPG', 'Room', 845, 647],
  ['Room-300', 'Room 300', 'EDUC Faculty', 6, 3, 'Room 300', 'EDUCFaculty.JPG', 'Office', 845, 647],
  ['Room-301', 'Room 301', '301', 6, 3, 'Room 301', '301.JPG', 'Room', 845, 647],
  ['Room-302', 'Room 302', '302', 6, 3, 'Room 302', '3rdFloor.JPG', 'Room', 845, 647],
  ['Room-303', 'Room 303', '303', 6, 3, 'Room 303', '3rdFloor.JPG', 'Room', 845, 647],
  ['Room-304', 'Room 304', '304', 6, 3, 'Room 304', '3rdFloor.JPG', 'Room', 845, 647],
  ['Room-305', 'Room 305', '305', 6, 3, 'Room 305', '3rdFloor.JPG', 'Room', 845, 647],
  ['Room-306', 'Room 306', '306', 6, 3, 'Room 306', '3rdFloor.JPG', 'Room', 845, 647],
  ['Room-400', 'Room 400', 'CAS / BAEL Faculty Room', 6, 4, 'Room 400', 'CASBAELFaculty.JPG', 'Office', 845, 647],
  ['Room-401', 'Room 401', '401', 6, 4, 'Room 401', '4thFloor.JPG', 'Room', 845, 647],
  ['Room-402', 'Room 402', '402', 6, 4, 'Room 402', '4thFloor.JPG', 'Room', 845, 647],
  ['Room-403', 'Room 403', '403', 6, 4, 'Room 403', '4thFloor.JPG', 'Room', 845, 647],
  ['Room-404', 'Room 404', '404', 6, 4, 'Room 404', '4thFloor.JPG', 'Room', 845, 647],
  ['Room-405', 'Room 405', '405', 6, 4, 'Room 405', '4thFloor.JPG', 'Room', 845, 647],
  ['Room-406', 'Room 406', '406', 6, 4, 'Room 406', '4thFloor.JPG', 'Room', 845, 647],
  ['Room-CA-0', 'Room CA 0', 'Storage Room', 11, 1, 'Room CA 0', 'AGStorageRoom.JPG', 'Room', 779, 91],
  ['Room-CA-1', 'Room CA 1', 'CA 1', 11, 1, 'Room CA 1', 'CA-1.JPG', 'Room', 779, 91],
  ['Room-CA-2', 'Room CA 2', 'CA 2 Crop Protection Classroom', 11, 1, 'Room CA 2', 'CA2(CropProtectionClassroom).JPG', 'Room', 779, 91],
  ['Room-CA-3', 'Room CA 3', 'CA 3 Animal Science', 11, 1, 'Room CA 3', 'CA3(AnimalScience).JPG', 'Room', 779, 91],
  ['Room-CR-1', 'Room CR 1', 'CR Faculty', 11, 2, 'Room CR 1', '-', 'Room', 779, 91],
  ['Room-CA-4', 'Room CA 4', 'Faculty Office', 11, 2, 'Room CA 4', 'CA-4FacultyRoom.JPG', 'Office', 779, 91],
  ['Room-CA-5', 'Room CA 5', 'CA 5 Agronomy Classroom', 11, 2, 'Room CA 5', 'CA-5(AgronomyClassroom).JPG', 'Room', 779, 91],
  ['Room-CA-6', 'Room CA 6', 'CA 6 Horticulture Classroom', 11, 2, 'Room CA 6', 'CA-6(HorticultureClassroom).JPG', 'Room', 779, 91]
];

const stRooms = [
  ['ST-101', 'ST 101', 'Production and Resource Generation Office', 8, 1, 'ST 101', '-', 'Office', 623, 400],
  ['ST-102', 'ST 102', 'Gender and Development Office', 8, 1, 'ST 102', 'Gender&DevelopmentOffice.JPG', 'Office', 623, 400],
  ['ST-103', 'ST 103', 'IE Room 3', 8, 1, 'ST 103', 'IE3.JPG', 'Room', 623, 400],
  ['ST-104', 'ST 104', 'GS 101', 8, 1, 'ST 104', 'GS101.JPG', 'Room', 623, 400],
  ['ST-105', 'ST 105', 'IE Room 2', 8, 1, 'ST 105', 'IE02.JPG', 'Room', 623, 400],
  ['ST-106', 'ST 106', 'IE Faculty', 8, 1, 'ST 106', 'IEFaculty.JPG', 'Office', 623, 400],
  ['ST-107', 'ST 107', 'Storage IE', 8, 1, 'ST 107', 'StorageIE.JPG', 'Room', 623, 400],
  ['ST-108', 'ST 108', 'Maintenance Office', 8, 1, 'ST 108', 'MaintenanceOffice.JPG', 'Office', 623, 400],
  ['ST-109', 'ST 109', 'GS 105', 8, 1, 'ST 109', 'GS105.JPG', 'Room', 623, 400],
  ['ST-110', 'ST 110', 'GS 104 Faculty BAL Lit', 8, 1, 'ST 110', 'GS104.JPG', 'Room', 623, 400],
  ['ST-111', 'ST 111', 'GS 103 Research', 8, 1, 'ST 111', 'GS103.JPG', 'Room', 623, 400],
  ['ST-112', 'ST 112', 'GS 102 Extension Office', 8, 1, 'ST 112', 'GS102.JPG', 'Room', 623, 400],
  ['ST-201', 'ST 201', 'LAB ST 201 Biology', 8, 2, 'ST 201', 'ST201.JPG', 'Laboratory', 623, 400],
  ['ST-202', 'ST 202', 'LAB ST 202 Chemistry', 8, 2, 'ST 202', 'ST202.JPG', 'Laboratory', 623, 400],
  ['ST-203', 'ST 203', 'LAB ST 203 Physics', 8, 2, 'ST 203', 'ST203.JPG', 'Laboratory', 623, 400],
  ['ST-204', 'ST 204', 'BA Lit 1', 8, 2, 'ST 204', 'BALit1.JPG', 'Room', 623, 400],
  ['ST-205', 'ST 205', 'BA Lit 2', 8, 2, 'ST 205', 'BALit2.JPG', 'Room', 623, 400],
  ['ST-206', 'ST 206', 'GS 204 Office of the Dean', 8, 2, 'ST 206', 'GS204.JPG', 'Office', 623, 400],
  ['ST-207', 'ST 207', 'GS 203 BAL Lit 3', 8, 2, 'ST 207', 'GS203.JPG', 'Room', 623, 400],
  ['ST-208', 'ST 208', 'GS 202 BAL Lit 4', 8, 2, 'ST 208', 'GS202.JPG', 'Room', 623, 400],
  ['ST-209', 'ST 209', 'GS Accreditation', 8, 2, 'ST 209', 'GSAccreditation.JPG', 'Room', 623, 400],
  ['ST-301', 'ST 301', 'Psych Lab', 8, 3, 'ST 301', 'ShowRoom.JPG', 'Laboratory', 623, 400],
  ['ST-302', 'ST 302', 'Humanities and Social Sciences', 8, 3, 'ST 302', 'HUMSS.JPG', 'Room', 623, 400],
  ['ST-303', 'ST 303', 'Psych Office', 8, 3, 'ST 303', 'PsychOffice.JPG', 'Office', 623, 400],
  ['ST-304', 'ST 304', 'PSYCH 1', 8, 3, 'ST 304', 'Psych1.JPG', 'Room', 623, 400],
  ['ST-305', 'ST 305', 'PSYCH 2', 8, 3, 'ST 305', 'Psych2.JPG', 'Room', 623, 400],
  ['ST-306', 'ST 306', 'PSYCH 3', 8, 3, 'ST 306', 'Psych3.JPG', 'Room', 623, 400],
  ['ST-307', 'ST 307', 'PSYCH 4', 8, 3, 'ST 307', 'Psych4.JPG', 'Room', 623, 400],
  ['ST-308', 'ST 308', 'PSYCH 5', 8, 3, 'ST 308', 'Psych5.JPG', 'Room', 623, 400],
  ['ST-309', 'ST 309', 'PSYCH 6', 8, 3, 'ST 309', 'Psych6.JPG', 'Room', 623, 400]
];

const abRooms = [
  ['AB-01', 'AB 01', 'Cashier Office', 7, 1, 'AB 01', 'CashiersOffice.JPG', 608, 662],
  ['AB-02', 'AB 02', 'Accounting and Budget Office', 7, 1, 'AB 02', 'Accounting&BudgetOffice.JPG', 608, 662],
  ['AB-03', 'AB 03', 'Supply Office', 7, 1, 'AB 03', 'SupplyOffice.JPG', 608, 662],
  ['AB-04', 'AB 04', 'Registrar', 7, 1, 'AB 04', 'Registrar.JPG', 608, 662],
  ['AB-05', 'AB 05', 'MIS Office', 7, 1, 'AB 05', 'MISOffice.JPG', 608, 662],
  ['AB-06', 'AB 06', 'Campus Director Office', 7, 2, 'AB 06', 'CampusDirector.JPG', 608, 662],
  ['AB-07', 'AB 07', 'HRMO', 7, 2, 'AB 07', 'HRMO.JPG', 608, 662],
  ['AB-08', 'AB 08', 'Procurement Office / Office of the DOI', 7, 2, 'AB 08', 'DOI.JPG', 608, 662]
];

function mkInteriorRow([id, room_id, name, bNum, floor, svg, imgFile, cat, x, y]) {
  return {
    id,
    room_id,
    name,
    type: 'room',
    svgId: svg,
    svg_id: svg,
    buildingId: B(bNum),
    floor,
    floors: null,
    category: cat,
    description: `${name}.`,
    image: imgRooms(imgFile),
    keywords: [room_id.toLowerCase(), name.toLowerCase(), B(bNum).toLowerCase()],
    x,
    y,
    building_id: bNum
  };
}

const rooms = [
  ...interiorRooms.map(mkInteriorRow),
  ...stRooms.map((r) => mkInteriorRow(r)),
  ...abRooms.map(([id, room_id, name, bNum, floor, svg, img, x, y]) =>
    mkInteriorRow([id, room_id, name, bNum, floor, svg, img, 'Office', x, y])
  )
];

/** AO standalone Room category (HM, TM) */
const aoRooms = [
  ['AO-018', 'HM 4', 'HM 4', 'HM4.JPG', 604, 754],
  ['AO-019', 'HM 3', 'HM 3', 'HM3.JPG', 604, 771],
  ['AO-020', 'HM 2', 'HM 2', 'HM2.JPG', 604, 788],
  ['AO-021', 'HM 1', 'HM 1', 'HM1.JPG', 604, 805],
  ['AO-022', 'TM 5', 'TM 5', 'TM5.JPG', 652, 763],
  ['AO-023', 'TM 2', 'TM 2', 'TM2.JPG', 652, 829],
  ['AO-024', 'TM 1', 'TM 1', 'TM1.JPG', 652, 813],
  ['AO-025', 'TM 3', 'TM 3', 'TM3.JPG', 645, 862],
  ['AO-026', 'TM 4', 'TM 4', 'TM4.JPG', 631, 862]
].map(([id, name, svg, img, x, y]) => ({
  id,
  room_id: id,
  name,
  type: 'room',
  svgId: svg,
  svg_id: svg,
  buildingId: null,
  floor: null,
  floors: null,
  category: 'Room',
  description: `${name}.`,
  image: imgRooms(img),
  keywords: [id.toLowerCase(), name.toLowerCase(), 'standalone'],
  x,
  y
}));

rooms.push(...aoRooms);

/** Offices: AO Office rows */
const aoOffices = [
  ['AO-008', 'CWTS Office', 'CWTS Office', 'CWTSOffice.JPG', 845, 719],
  ['AO-009', 'ROTC Office', 'ROTC Office', 'ROTCOffice.JPG', 845, 697],
  ['AO-014', 'CTU-DOST-NICER Office', 'CTU-DOST-NICER Office', 'CTUACNICEROffice.JPG', 928, 423],
  ['AO-028', 'Tourism Management Office', 'Tourism Management Office', ['TMOffice.JPG', 'TMOffice2.JPG'], 600, 675],
  ['AO-032', 'DRRMO', 'DRRMO', 'DRRMO.JPG', 595, 650],
  ['AO-034', 'STO Office', 'STO Office', 'STOOffice.JPG', 604, 853],
  ['AO-036', 'Utility Office', 'Utility Office', 'UtilityOffice.JPG', 625, 650],
  ['AO-037', 'Student Affairs Office (SAO)', 'Student Affairs Office (SAO)', 'SAO.JPG', 638, 668],
  ['AO-038', 'Cultural Office', 'Cultural Office', 'CulturalOffice.JPG', 570, 680],
  ['AO-039', 'SSG Office', 'SSG Office', 'SSG.JPG', 652, 655],
  ['AO-040', 'FSTLP', 'FSTLP', 'FSTLP.JPG', 617, 962],
  ['AO-041', 'Campus Ministry', 'Campus Ministry', 'CampusMinistry.JPG', 565, 665],
  ['AO-042', 'COOP Office', 'COOP Office', ['COOPOffice.JPG', 'COOP2.JPG'], 642, 685]
].map(([id, name, svg, img, x, y]) => ({
  id,
  room_id: id,
  name,
  type: 'office',
  svgId: svg,
  svg_id: svg,
  buildingId: null,
  floor: null,
  floors: null,
  category: 'Office',
  description: `${name}.`,
  image: Array.isArray(img) ? img.map(imgOff) : imgOff(img),
  keywords: [id.toLowerCase(), name.toLowerCase(), 'standalone'],
  x,
  y
}));

/** Facilities: AO Facility + F-001..F-008 */
const aoFacilities = [
  ['AO-001', 'BIT Lecture Lab Room 5', 'BIT Lecture Lab Room 5', 'BITLectureLab5.JPG', 1003, 767],
  ['AO-002', 'GT Lab 3', 'GT Lab 3', 'GTLab3.JPG', 1003, 737],
  ['AO-003', 'DT Lab 1', 'DT Lab 1', 'DTLab1&2.JPG', 1003, 707],
  ['AO-004', 'DT Lab 2', 'DT Lab 2', 'DTLab1&2.JPG', 1003, 677],
  ['AO-005', 'ES Room 3', 'ES Room 3', 'ESRoom3.JPG', 933, 704],
  ['AO-006', 'ES Room 2', 'ES Room 2', 'ESRoom2.JPG', 905, 704],
  ['AO-007', 'ES Room 1', 'ES Room 1', 'ESRoom1.JPG', 877, 704],
  ['AO-010', 'BIT AT Lab 1', 'BIT AT Lab 1', 'BITATLab1.JPG', 934, 552],
  ['AO-011', 'BIT AT Lab 2', 'BIT AT Lab 2', 'BITATLab2.JPG', 931, 522],
  ['AO-012', 'BIT AT Lab 3', 'BIT AT Lab 3', 'BITATLab3.JPG', 927, 492],
  ['AO-013', 'BIT AT Lab 4', 'BIT AT Lab 4', 'BITATLab4.JPG', 923, 462],
  ['AO-015', 'BENRC Tissue Culture Lab', 'BENRC Tissue Culture Lab', 'BENRCTissueCultureLab.JPG', 867, 427],
  ['AO-016', 'BENRC-IFNI Training Center', 'BENRC-IFNI Training Center', 'BENRCIFNITrainingCenter.JPG', 833, 443],
  ['AO-017', 'BENRC Microtel', 'BENRC Microtel', 'BENRCMicrotel.JPG', 829, 417],
  ['AO-027', 'GDS Lab', 'GDS Lab', 'GDSLab.JPG', 652, 845],
  ['AO-029', 'Power House', 'Power House', 'PowerHouse.JPG', 652, 793],
  ['AO-030', 'General Services', 'General Services', 'GeneralServices.JPG', 615, 668],
  ['AO-031', 'Maintenance', 'Maintenance', 'MaintenanceSR.JPG', 628, 675],
  ['AO-033', 'Storage Room', 'Storage Room', 'StorageRoom.JPG', 604, 842],
  ['AO-035', 'Southern Ripples', 'Southern Ripples', 'SouthernRipples.JPG', 612, 868],
  ['AO-043', 'Kahimsug Center Sci-Tech Argao', 'Kahimsug Center Sci-Tech Argao', 'KahimsugCenter.JPG', 656, 1004],
  ['AO-044', 'Balay sa Alumni', 'Balay sa Alumni', 'BalaySaAlumni.JPG', 668, 992],
  ['AO-045', 'Guard House', 'Guard House', 'GuardHouse.JPG', 690, 987],
  ['AO-046', 'CTU-Argao Chess Center', 'CTU-Argao Chess Center', '-', 863, 1009]
].map(([id, name, svg, img, x, y]) => ({
  id,
  room_id: id,
  name,
  type: 'facility',
  svgId: svg,
  svg_id: svg,
  buildingId: null,
  floor: null,
  floors: null,
  category: 'Facility',
  description: `${name}.`,
  image: imgFac(img),
  keywords: [id.toLowerCase(), name.toLowerCase(), 'standalone'],
  x,
  y
}));

const fFacilities = [
  ['F-001', 'Student Lounge', 'Student Lounge', null, null, 'StudentLounge.JPG', 800, 848],
  ['F-002', 'Chapel', 'Chapel', 4, 1, 'Chapel.JPG', 880, 806],
  ['F-003', 'Canteen', 'Canteen', null, null, 'Canteen.JPG', 753, 784],
  ['F-004', 'Basketball Court', 'Basketball Court', null, null, '-', 703, 848],
  ['F-005', 'Kalampusan Gym', 'Kalampusan Gym', null, null, 'KalampusanGym.JPG', 695, 707],
  ['F-006', 'Green House', 'Green House', null, null, 'GreenHouse.JPG', 780, 195],
  ['F-007', 'Old Stage', 'Old Stage', null, null, 'OldStage.JPG', 843, 561],
  ['F-008', 'Oval', 'Oval', null, null, 'Oval.JPG', 686, 460]
].map(([id, name, svg, bNum, floor, img, x, y]) => ({
  id,
  room_id: id,
  name,
  type: 'facility',
  svgId: svg,
  svg_id: svg,
  buildingId: bNum != null ? B(bNum) : null,
  floor,
  floors: null,
  category: 'Facility',
  description: `${name}.`,
  image: img === '-' ? PLACEHOLDER : imgFac(img),
  keywords: [id.toLowerCase(), name.toLowerCase()],
  x,
  y,
  ...(bNum != null ? { building_id: bNum } : {})
}));

const facilities = [...aoFacilities, ...fFacilities];

const crs = [
  ['cr_01', 'Comfort Room', 5, 1, 'CR COTE 1', 845, 750],
  ['cr_02', 'Comfort Room', 5, 2, 'CR COTE 2', 845, 750],
  ['cr_03', 'Comfort Room', 5, 3, 'CR COTE 3', 845, 750],
  ['cr_04', 'Comfort Room', 5, 4, 'CR COTE 4', 845, 750],
  ['cr_05', 'Comfort Room', 6, 1, 'CR COED 1', 845, 647],
  ['cr_06', 'Comfort Room', 6, 2, 'CR COED 2', 845, 647],
  ['cr_07', 'Comfort Room', 6, 3, 'CR COED 3', 845, 647],
  ['cr_08', 'Comfort Room', 6, 4, 'CR COED 4', 845, 647],
  ['cr_09', 'Comfort Room', 10, 1, 'CR Library 1', 755, 270],
  ['cr_10', 'Comfort Room', 8, 1, 'CR Sci-Tech 1', 623, 400],
  ['cr_11', 'Comfort Room', 8, 2, 'CR Sci-Tech 2', 623, 400],
  ['cr_12', 'Comfort Room', 8, 3, 'CR Sci-Tech 3', 623, 400],
  ['cr_13', 'CR SAO', 7, null, 'CR SAO', 598, 887]
].map(([id, name, bNum, floor, svg, x, y]) => ({
  id,
  room_id: id,
  name,
  type: 'cr',
  svgId: svg,
  svg_id: svg,
  buildingId: B(bNum),
  floor,
  floors: null,
  category: 'CR',
  description: `${name} (${B(bNum)}).`,
  image: imgFac('CR.JPG'),
  keywords: [id, name.toLowerCase(), svg.toLowerCase(), B(bNum).toLowerCase()],
  x,
  y,
  building_id: bNum
}));

function write(name, data) {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2) + '\n');
  console.log('Wrote', name, data.length);
}

write('buildings.json', applyCssAnchors(buildings));
write('rooms.json', alignRoomRows(rooms));
write('offices.json', applyCssAnchors(aoOffices));
write('facilities.json', applyCssAnchors(facilities));
write('cr.json', alignCrRows(crs));
console.log('Done.');
