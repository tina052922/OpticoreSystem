/**
 * One-off generator: official CTU campus room table -> rooms.json fragment.
 * Run: node scripts/generate-official-rooms.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function mk(id, name, svgId, buildingId, floor, category, image, keywords, x, y) {
  return {
    id,
    name,
    type: 'room',
    svgId,
    buildingId,
    floor,
    floors: null,
    category,
    description: `${name}.`,
    image,
    keywords,
    x,
    y,
  };
}

const b001 = { x: 903, y: 928 };
const b005 = { x: 845, y: 750 };
const b006 = { x: 845, y: 647 };
const b007 = { x: 608, y: 662 };
const b008 = { x: 623, y: 400 };
const b011 = { x: 779, y: 91 };

const rooms = [];

rooms.push(
  mk('R001', 'Show Room', 'ShowRoom', 'B001', 1, 'Room', '/images/rooms/ShowRoom.jpg', ['show room', 'room 01', 'B001'], b001.x, b001.y),
  mk('R002', 'Embroidery', 'Embroidery', 'B001', 1, 'Room', '/images/rooms/Embroidery.jpg', ['embroidery', 'room 02', 'B001'], b001.x, b001.y),
  mk('R003', 'Conference Room', 'ConferenceRoom', 'B001', 2, 'Room', '/images/rooms/ConferenceRoom.jpg', ['conference', 'room 03', 'B001'], b001.x, b001.y),
  mk('R004', 'Garments Room', 'GarmentsRoom', 'B001', 2, 'Room', '/images/rooms/IMG_4473.jpg', ['garments', 'room 04', 'B001'], b001.x, b001.y),
  mk('R005', 'Thread Room', 'ThreadRoom', 'B001', 2, 'Room', '/images/rooms/ThreadRoom.jpg', ['thread', 'room 05', 'B001'], b001.x, b001.y),
  mk('R006', 'Studio Room', 'StudioRoom', 'B001', 3, 'Room', '/images/rooms/StudioRoom.jpg', ['studio', 'room 06', 'B001'], b001.x, b001.y),
  mk('R007', 'Food Laboratory', 'FoodLaboratory', 'B001', 3, 'Laboratory', '/images/rooms/FoodLab.jpg', ['food lab', 'room 07', 'B001'], b001.x, b001.y)
);

rooms.push(
  mk('R008', "COTE Dean's Office", 'COTE101', 'B005', 1, 'Office', '/images/offices/COTEDeansOffice.jpg', ['cote 101', 'dean', 'cote', 'B005'], b005.x, b005.y),
  mk('R009', 'FAB Lab', 'COTE102', 'B005', 1, 'Laboratory', '/images/rooms/FABLab.jpg', ['cote 102', 'fab', 'B005'], b005.x, b005.y),
  mk('R010', 'W.S.M. & Ergonomics Lab', 'COTE103', 'B005', 1, 'Laboratory', '/images/rooms/WSMErgonomicsLab.jpg', ['cote 103', 'wsm', 'ergonomics', 'B005'], b005.x, b005.y),
  mk('R011', 'GT Lab 2', 'COTE104', 'B005', 1, 'Laboratory', '/images/rooms/GTLab2.jpg', ['cote 104', 'gt lab 2', 'B005'], b005.x, b005.y),
  mk('R012', 'GT Lab 1', 'COTE105', 'B005', 1, 'Laboratory', '/images/rooms/GTLab1.jpg', ['cote 105', 'gt lab 1', 'B005'], b005.x, b005.y),
  mk('R013', 'BIT Faculty Office', 'COTE201', 'B005', 2, 'Office', '/images/offices/BITFacultyRoom.jpg', ['cote 201', 'bit faculty', 'B005'], b005.x, b005.y),
  mk('R014', 'ET Lab 01 Automation Lab', 'COTE202', 'B005', 2, 'Laboratory', '/images/rooms/ETLab1.jpg', ['cote 202', 'et lab', 'B005'], b005.x, b005.y),
  mk('R015', 'ET Lab 02', 'COTE203', 'B005', 2, 'Laboratory', '/images/rooms/ETLab2.jpg', ['cote 203', 'B005'], b005.x, b005.y),
  mk('R016', 'ET Lab 03 Digital Communication Lab', 'COTE204', 'B005', 2, 'Laboratory', '/images/rooms/ETLab3.jpg', ['cote 204', 'B005'], b005.x, b005.y),
  mk('R017', 'DT Lab 01 (CAD)', 'COTE205', 'B005', 2, 'Laboratory', '/images/rooms/DTLab1.jpg', ['cote 205', 'dt lab', 'cad', 'B005'], b005.x, b005.y),
  mk('R018', 'DT Lab 02', 'COTE206', 'B005', 2, 'Laboratory', '/images/rooms/DTLab2.jpg', ['cote 206', 'B005'], b005.x, b005.y),
  mk('R019', 'DT Lab 03', 'COTE207', 'B005', 2, 'Laboratory', '/images/rooms/DTLab3.jpg', ['cote 207', 'B005'], b005.x, b005.y),
  mk('R020', 'BSIT Faculty Office', 'COTE301', 'B005', 3, 'Office', '/images/offices/BSITFaculty.jpg', ['cote 301', 'bsit', 'B005'], b005.x, b005.y),
  mk('R021', 'IT Lab 04', 'COTE302', 'B005', 3, 'Laboratory', '/images/rooms/ITLab4.jpg', ['cote 302', 'B005'], b005.x, b005.y),
  mk('R022', 'IT Lab 03', 'COTE303', 'B005', 3, 'Laboratory', '/images/rooms/ITLab3.jpg', ['cote 303', 'B005'], b005.x, b005.y),
  mk('R023', 'IT Lab 02', 'COTE304', 'B005', 3, 'Laboratory', '/images/rooms/ITLab2.jpg', ['cote 304', 'B005'], b005.x, b005.y),
  mk('R024', 'IT Lab 01', 'COTE305', 'B005', 3, 'Laboratory', '/images/rooms/ITLab1.jpg', ['cote 305', 'B005'], b005.x, b005.y),
  mk('R025', 'CT Lab 02', 'COTE306', 'B005', 3, 'Laboratory', '/images/rooms/CTLab2.jpg', ['cote 306', 'B005'], b005.x, b005.y),
  mk('R026', 'CT Lab 01', 'COTE307', 'B005', 3, 'Laboratory', '/images/rooms/CTLab1.jpg', ['cote 307', 'B005'], b005.x, b005.y),
  mk('R027', 'CAFE Faculty', 'COTE401', 'B005', 4, 'Office', '/images/offices/CAFEFaculty.jpg', ['cote 401', 'B005'], b005.x, b005.y),
  mk('R028', 'Forestry Lab 1', 'COTE402', 'B005', 4, 'Laboratory', '/images/rooms/Forestry.jpg', ['cote 402', 'B005'], b005.x, b005.y),
  mk('R029', 'Forestry Lab 2', 'COTE403', 'B005', 4, 'Laboratory', '/images/rooms/Forestry.jpg', ['cote 403', 'B005'], b005.x, b005.y),
  mk('R030', 'Forestry Lab 3', 'COTE404', 'B005', 4, 'Laboratory', '/images/rooms/ForestryLab3.jpg', ['cote 404', 'B005'], b005.x, b005.y),
  mk('R031', 'Forestry Lab 4', 'COTE405', 'B005', 4, 'Laboratory', '/images/rooms/Forestry.jpg', ['cote 405', 'B005'], b005.x, b005.y),
  mk('R032', 'CT Lab 04', 'COTE406', 'B005', 4, 'Laboratory', '/images/rooms/CTLab4.jpg', ['cote 406', 'B005'], b005.x, b005.y),
  mk('R033', 'CT Lab 03', 'COTE407', 'B005', 4, 'Laboratory', '/images/rooms/CTLab3.jpg', ['cote 407', 'B005'], b005.x, b005.y)
);

rooms.push(
  mk('R034', 'Accreditation Room', 'Room101', 'B006', 1, 'Room', '/images/rooms/AccreditationRoom.jpg', ['room 101', 'coed', 'B006'], b006.x, b006.y),
  mk('R035', 'COED Lab 1', 'Room102', 'B006', 1, 'Laboratory', '/images/rooms/COEDLab1.jpg', ['room 102', 'B006'], b006.x, b006.y),
  mk('R036', 'COED Lab 2', 'Room103', 'B006', 1, 'Laboratory', '/images/rooms/COEDLab2.jpg', ['room 103', 'B006'], b006.x, b006.y),
  mk('R037', 'COED Lab 3', 'Room104', 'B006', 1, 'Laboratory', '/images/rooms/COEDLab3.jpg', ['room 104', 'B006'], b006.x, b006.y),
  mk('R038', 'Temp Faculty Room', 'Room200', 'B006', 2, 'Office', '/images/rooms/TempFacultyRoom.jpg', ['room 200', 'B006'], b006.x, b006.y),
  mk('R039', '201', 'Room201', 'B006', 2, 'Room', '/images/rooms/2ndFloor.jpg', ['room 201', 'B006'], b006.x, b006.y),
  mk('R040', '202', 'Room202', 'B006', 2, 'Room', '/images/rooms/2ndFloor.jpg', ['room 202', 'B006'], b006.x, b006.y),
  mk('R041', '203', 'Room203', 'B006', 2, 'Room', '/images/rooms/2ndFloor.jpg', ['room 203', 'B006'], b006.x, b006.y),
  mk('R042', '204', 'Room204', 'B006', 2, 'Room', '/images/rooms/2ndFloor.jpg', ['room 204', 'B006'], b006.x, b006.y),
  mk('R043', '205', 'Room205', 'B006', 2, 'Room', '/images/rooms/2ndFloor.jpg', ['room 205', 'B006'], b006.x, b006.y),
  mk('R044', '206', 'Room206', 'B006', 2, 'Room', '/images/rooms/2ndFloor.jpg', ['room 206', 'B006'], b006.x, b006.y),
  mk('R045', 'EDUC Faculty', 'Room300', 'B006', 3, 'Office', '/images/rooms/EDUCFaculty.jpg', ['room 300', 'educ', 'B006'], b006.x, b006.y),
  mk('R046', '301', 'Room301', 'B006', 3, 'Room', '/images/rooms/301.jpg', ['room 301', 'B006'], b006.x, b006.y),
  mk('R047', '302', 'Room302', 'B006', 3, 'Room', '/images/rooms/3rdFloor.jpg', ['room 302', 'B006'], b006.x, b006.y),
  mk('R048', '303', 'Room303', 'B006', 3, 'Room', '/images/rooms/3rdFloor.jpg', ['room 303', 'B006'], b006.x, b006.y),
  mk('R049', '304', 'Room304', 'B006', 3, 'Room', '/images/rooms/3rdFloor.jpg', ['room 304', 'B006'], b006.x, b006.y),
  mk('R050', '305', 'Room305', 'B006', 3, 'Room', '/images/rooms/3rdFloor.jpg', ['room 305', 'B006'], b006.x, b006.y),
  mk('R051', '306', 'Room306', 'B006', 3, 'Room', '/images/rooms/3rdFloor.jpg', ['room 306', 'B006'], b006.x, b006.y),
  mk('R052', 'CAS / BAEL Faculty Room', 'Room400', 'B006', 4, 'Office', '/images/rooms/CASBAELFaculty.jpg', ['room 400', 'cas', 'bael', 'B006'], b006.x, b006.y),
  mk('R053', '401', 'Room401', 'B006', 4, 'Room', '/images/rooms/4thFloor.jpg', ['room 401', 'B006'], b006.x, b006.y),
  mk('R054', '402', 'Room402', 'B006', 4, 'Room', '/images/rooms/4thFloor.jpg', ['room 402', 'B006'], b006.x, b006.y),
  mk('R055', '403', 'Room403', 'B006', 4, 'Room', '/images/rooms/4thFloor.jpg', ['room 403', 'B006'], b006.x, b006.y),
  mk('R056', '404', 'Room404', 'B006', 4, 'Room', '/images/rooms/4thFloor.jpg', ['room 404', 'B006'], b006.x, b006.y),
  mk('R057', '405', 'Room405', 'B006', 4, 'Room', '/images/rooms/4thFloor.jpg', ['room 405', 'B006'], b006.x, b006.y),
  mk('R058', '406', 'Room406', 'B006', 4, 'Room', '/images/rooms/4thFloor.jpg', ['room 406', 'B006'], b006.x, b006.y)
);

rooms.push(
  mk('R059', 'Storage Room', 'RoomCA0', 'B011', 1, 'Room', '/images/rooms/AGStorageRoom.jpg', ['room ca 0', 'agriculture', 'B011'], b011.x, b011.y),
  mk('R060', 'CA 1', 'RoomCA1', 'B011', 1, 'Room', '/images/rooms/CA-1.jpg', ['room ca 1', 'B011'], b011.x, b011.y),
  mk('R061', 'CA 2 Crop Protection Classroom', 'RoomCA2', 'B011', 1, 'Room', '/images/rooms/CA2CropProtectionClassroom.jpg', ['room ca 2', 'crop protection', 'B011'], b011.x, b011.y),
  mk('R062', 'CA 3 Animal Science', 'RoomCA3', 'B011', 1, 'Room', '/images/rooms/CA3AnimalScience.jpg', ['room ca 3', 'B011'], b011.x, b011.y),
  mk('R063', 'CR Faculty', 'RoomCR1', 'B011', 2, 'Room', '/images/placeholders/default.svg', ['room cr 1', 'cr faculty', 'B011'], b011.x, b011.y),
  mk('R064', 'Faculty Office', 'RoomCA4', 'B011', 2, 'Office', '/images/rooms/CA-4FacultyRoom.jpg', ['room ca 4', 'B011'], b011.x, b011.y),
  mk('R065', 'CA 5 Agronomy Classroom', 'RoomCA5', 'B011', 2, 'Room', '/images/rooms/CA-5AgronomyClassroom.jpg', ['room ca 5', 'B011'], b011.x, b011.y),
  mk('R066', 'CA 6 Horticulture Classroom', 'RoomCA6', 'B011', 2, 'Room', '/images/rooms/CA-6HorticultureClassroom.jpg', ['room ca 6', 'B011'], b011.x, b011.y)
);

const st = [
  ['R067', 'Production and Resource Generation Office', 'ST101', 1, '/images/placeholders/default.svg', ['st 101']],
  ['R068', 'Gender and Development Office', 'ST102', 1, '/images/rooms/GenderAndDevelopmentOffice.jpg', ['st 102']],
  ['R069', 'IE Room 3', 'ST103', 1, '/images/rooms/IE3.jpg', ['st 103']],
  ['R070', 'GS 101', 'ST104', 1, '/images/rooms/GS101.jpg', ['st 104']],
  ['R071', 'IE Room 2', 'ST105', 1, '/images/rooms/IE02.jpg', ['st 105']],
  ['R072', 'IE Faculty', 'ST106', 1, '/images/rooms/IEFaculty.jpg', ['st 106']],
  ['R073', 'Storage IE', 'ST107', 1, '/images/rooms/StorageIE.jpg', ['st 107']],
  ['R074', 'Maintenance Office', 'ST108', 1, '/images/rooms/MaintenanceOffice.jpg', ['st 108']],
  ['R075', 'GS 105', 'ST109', 1, '/images/rooms/GS105.jpg', ['st 109']],
  ['R076', 'GS 104 Faculty BAL Lit', 'ST110', 1, '/images/rooms/GS104.jpg', ['st 110']],
  ['R077', 'GS 103 Research', 'ST111', 1, '/images/rooms/GS103.jpg', ['st 111']],
  ['R078', 'GS 102 Extension Office', 'ST112', 1, '/images/rooms/GS102.jpg', ['st 112']],
  ['R079', 'LAB ST 201 Biology', 'ST201', 2, '/images/rooms/ST201.jpg', ['st 201']],
  ['R080', 'LAB ST 202 Chemistry', 'ST202', 2, '/images/rooms/ST202.jpg', ['st 202']],
  ['R081', 'LAB ST 203 Physics', 'ST203', 2, '/images/rooms/ST203.jpg', ['st 203']],
  ['R082', 'BA Lit 1', 'ST204', 2, '/images/rooms/BALit1.jpg', ['st 204']],
  ['R083', 'BA Lit 2', 'ST205', 2, '/images/rooms/BALit2.jpg', ['st 205']],
  ['R084', 'GS 204 Office of the Dean', 'ST206', 2, '/images/rooms/GS204.jpg', ['st 206']],
  ['R085', 'GS 203 BAL Lit 3', 'ST207', 2, '/images/rooms/GS203.jpg', ['st 207']],
  ['R086', 'GS 202 BAL Lit 4', 'ST208', 2, '/images/rooms/GS202.jpg', ['st 208']],
  ['R087', 'GS Accreditation', 'ST209', 2, '/images/rooms/GSAccreditation.jpg', ['st 209']],
  ['R088', 'Psych Lab', 'ST301', 3, '/images/rooms/ShowRoom.jpg', ['st 301']],
  ['R089', 'Humanities and Social Sciences', 'ST302', 3, '/images/rooms/HUMSS.jpg', ['st 302']],
  ['R090', 'Psych Office', 'ST303', 3, '/images/rooms/PsychOffice.jpg', ['st 303']],
  ['R091', 'PSYCH 1', 'ST304', 3, '/images/rooms/Psych1.jpg', ['st 304']],
  ['R092', 'PSYCH 2', 'ST305', 3, '/images/rooms/Psych2.jpg', ['st 305']],
  ['R093', 'PSYCH 3', 'ST306', 3, '/images/rooms/Psych3.jpg', ['st 306']],
  ['R094', 'PSYCH 4', 'ST307', 3, '/images/rooms/Psych4.jpg', ['st 307']],
  ['R095', 'PSYCH 5', 'ST308', 3, '/images/rooms/Psych5.jpg', ['st 308']],
  ['R096', 'PSYCH 6', 'ST309', 3, '/images/rooms/Psych6.jpg', ['st 309']]
];
for (const [id, name, svgId, fl, img, kw] of st) {
  let cat = 'Room';
  if (['ST201', 'ST202', 'ST203', 'ST301'].includes(svgId)) cat = 'Laboratory';
  if (['ST101', 'ST102', 'ST106', 'ST108', 'ST206'].includes(svgId)) cat = 'Office';
  if (['ST103', 'ST105', 'ST107', 'ST109', 'ST110', 'ST111', 'ST112'].includes(svgId)) cat = 'Room';
  if (['ST204', 'ST205', 'ST207', 'ST208', 'ST209'].includes(svgId)) cat = 'Room';
  if (['ST302', 'ST303', 'ST304', 'ST305', 'ST306', 'ST307', 'ST308', 'ST309'].includes(svgId)) cat = 'Room';
  rooms.push(mk(id, name, svgId, 'B008', fl, cat, img, [...kw, 'B008'], b008.x, b008.y));
}

const ab = [
  ['R097', 'Cashier Office', 'AB01', 1, '/images/rooms/CashiersOffice.jpg'],
  ['R098', 'Accounting and Budget Office', 'AB02', 1, '/images/rooms/AccountingAndBudgetOffice.jpg'],
  ['R099', 'Supply Office', 'AB03', 1, '/images/rooms/SupplyOffice.jpg'],
  ['R100', 'Registrar', 'AB04', 1, '/images/rooms/Registrar.jpg'],
  ['R101', 'MIS Office', 'AB05', 1, '/images/rooms/MISOffice.jpg'],
  ['R102', 'Campus Director Office', 'AB06', 2, '/images/rooms/CampusDirector.jpg'],
  ['R103', 'HRMO', 'AB07', 2, '/images/rooms/HRMO.jpg'],
  ['R104', 'Procurement Office / Office of the DOI', 'AB08', 2, '/images/rooms/DOI.jpg']
];
for (const [id, name, svgId, fl, img] of ab) {
  rooms.push(
    mk(id, name, svgId, 'B007', fl, 'Office', img, [svgId.toLowerCase(), 'admin', 'B007'], b007.x, b007.y)
  );
}

const out = path.join(root, 'src', 'app', 'data', 'json', 'rooms.json');
fs.writeFileSync(out, JSON.stringify(rooms, null, 2) + '\n');
console.log('Wrote', rooms.length, 'rooms to', out);
