import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
/* react-pdf <Image> has no alt prop. */
/* eslint-disable jsx-a11y/alt-text */
import { Image } from "@react-pdf/renderer";
import { DEFAULT_INS_HEADER_BANNER, DEFAULT_REPORT_FOOTER_BANNER } from "@/lib/system-configuration/campus-branding";
import { TEACHING_LOAD_SUBHEADS } from "@/lib/scheduling/teaching-load-header-colors";
import { INSBrandedFooter } from "../shared/INSBrandedFooter";
import type { TeachingLoadCategoryGroup, TeachingLoadSummaryRow } from "@/lib/scheduling/teaching-load-summary";
import type { TeachingLoadSignatories, TeachingLoadSigner } from "@/lib/scheduling/teaching-load-signatories";

const MAROON = "#780301";

const s = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 22,
    paddingHorizontal: 18,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#111111",
  },
  collegeTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: 6,
  },
  formTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  },
  meta: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 8,
  },
  categoryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: MAROON,
    marginTop: 8,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    borderWidth: 0.6,
    borderColor: "#000",
  },
  theadRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
  },
  banner: {
    width: 420,
    alignSelf: "center",
    objectFit: "contain",
  },
  tr: {
    flexDirection: "row",
    borderTopWidth: 0.4,
    borderTopColor: "#000",
  },
  trAlt: {
    backgroundColor: "#f8fafc",
  },
  th: {
    color: "#000",
    fontFamily: "Helvetica-Bold",
    fontSize: 6.4,
    padding: 3,
    borderRightWidth: 0.4,
    borderRightColor: "#000",
  },
  td: {
    fontSize: 6.6,
    padding: 3,
    borderRightWidth: 0.4,
    borderRightColor: "#000",
  },
  empty: {
    padding: 8,
    fontSize: 8,
    color: "#6b7280",
    textAlign: "center",
  },
});

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Column widths (landscape A4), laid out like the college's sheet:
 * No. · Name of Faculty · Administrative Designation · Other Responsibilities ·
 * DAY (Preps, Units/Week, Hours/Week) · EVENING (same) · Subjects Handled · Justification.
 */
const COLS = {
  no: "4%",
  name: "12%",
  desig: "10%",
  other: "11%",
  n: "5%",
  total: "5%",
  subjects: "14%",
  just: "9%",
} as const;
/** Width of a three-column DAY / EVENING group. */
const GROUP = "15%";

function HeadCell({
  width,
  children,
  center,
  bg,
}: {
  width: string;
  children: string;
  center?: boolean;
  /** PREPS / UNITS / HOURS cells are coloured, as on the college's sheet. */
  bg?: string;
}) {
  return (
    <Text style={[s.th, { width, textAlign: center ? "center" : "left" }, bg ? { backgroundColor: bg } : {}]}>
      {children}
    </Text>
  );
}

function Cell({
  width,
  children,
  center,
}: {
  width: string;
  children: string;
  center?: boolean;
}) {
  return (
    <Text style={[s.td, { width, textAlign: center ? "center" : "left" }]}>
      {children}
    </Text>
  );
}

function SubjectsCell({ width, text }: { width: string; text: string }) {
  const lines = text.split("\n").filter(Boolean);
  return (
    <View style={[s.td, { width, paddingVertical: 2 }]}>
      {lines.map((line) => (
        <Text key={line} style={{ fontSize: 7, lineHeight: 1.25 }}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function FacultyRow({ row, index, alt }: { row: TeachingLoadSummaryRow; index: number; alt: boolean }) {
  return (
    <View style={alt ? [s.tr, s.trAlt] : s.tr} wrap={false}>
      <Cell width={COLS.no} center>
        {String(index + 1)}
      </Cell>
      <Cell width={COLS.name}>{row.facultyName}</Cell>
      <Cell width={COLS.desig}>{row.administrativeDesignation ?? ""}</Cell>
      <Cell width={COLS.other}>{row.otherResponsibilities ?? ""}</Cell>
      <Cell width={COLS.n} center>{String(row.day.preps)}</Cell>
      <Cell width={COLS.n} center>{fmt(row.day.unitsPerWeek)}</Cell>
      <Cell width={COLS.n} center>{fmt(row.day.hoursPerWeek)}</Cell>
      <Cell width={COLS.n} center>{String(row.evening.preps)}</Cell>
      <Cell width={COLS.n} center>{fmt(row.evening.unitsPerWeek)}</Cell>
      <Cell width={COLS.n} center>{fmt(row.evening.hoursPerWeek)}</Cell>
      <Cell width={COLS.total} center>{String(row.totalPreps)}</Cell>
      <Cell width={COLS.total} center>{fmt(row.totalHoursPerWeek)}</Cell>
      <SubjectsCell width={COLS.subjects} text={row.subjectsHandled} />
      <Cell width={COLS.just}>{row.justification ?? ""}</Cell>
    </View>
  );
}

/** Two-row header: DAY / EVENING over Preps · Units/Week · Hours/Week. */
function TableHead() {
  const tall = { justifyContent: "center" as const };
  return (
    <View style={s.theadRow}>
      <View style={[{ width: COLS.no }, tall]}>
        <HeadCell width="100%" center>No.</HeadCell>
      </View>
      <View style={[{ width: COLS.name }, tall]}>
        <HeadCell width="100%">Name of Faculty</HeadCell>
      </View>
      <View style={[{ width: COLS.desig }, tall]}>
        <HeadCell width="100%">Administrative Designation</HeadCell>
      </View>
      <View style={[{ width: COLS.other }, tall]}>
        <HeadCell width="100%">
          Other Responsibilities (GAA-Funded Research &amp; Extension Projects, and Thesis Advisorship)
        </HeadCell>
      </View>
      {(["DAY", "EVENING"] as const).map((label) => (
        <View key={label} style={{ width: GROUP }}>
          <HeadCell width="100%" center>{label}</HeadCell>
          <View style={{ flexDirection: "row", borderTopWidth: 0.4, borderTopColor: "#000" }}>
            {TEACHING_LOAD_SUBHEADS.map((h, i) => (
              <HeadCell key={h.key} width={i === 0 ? "33.34%" : "33.33%"} center bg={h.color}>
                {h.label}
              </HeadCell>
            ))}
          </View>
        </View>
      ))}
      <View style={[{ width: COLS.total }, tall]}>
        <HeadCell width="100%" center>TOTAL PREPS/ WEEK</HeadCell>
      </View>
      <View style={[{ width: COLS.total }, tall]}>
        <HeadCell width="100%" center>TOTAL HOURS/ WEEK</HeadCell>
      </View>
      <View style={[{ width: COLS.subjects }, tall]}>
        <HeadCell width="100%">Subjects Handled</HeadCell>
      </View>
      <View style={[{ width: COLS.just }, tall]}>
        <HeadCell width="100%">Justification (Applicable if it violates the rule.)</HeadCell>
      </View>
    </View>
  );
}

function CategoryTable({ group }: { group: TeachingLoadCategoryGroup & { heading?: string } }) {
  return (
    <View>
      <Text style={s.categoryTitle}>{group.heading || group.categoryLabel}</Text>
      <View style={s.table}>
        <TableHead />
        {group.rows.length === 0 ? (
          <View style={s.tr}>
            <Text style={[s.empty, { width: "100%" }]}>No plotted teaching load for this department in the selected term.</Text>
          </View>
        ) : (
          group.rows.map((row, i) => (
            <FacultyRow key={row.instructorId} row={row} index={i} alt={i % 2 === 1} />
          ))
        )}
      </View>
    </View>
  );
}

function SignerBox({ signer }: { signer: TeachingLoadSigner }) {
  return (
    <View style={{ alignItems: "center", width: 200, marginTop: 4 }}>
      {/* E-signature over the name, as signed on paper. */}
      <View style={{ height: 28, justifyContent: "flex-end", alignItems: "center" }}>
        {signer.imageUrl ? <Image src={signer.imageUrl} style={{ height: 30, maxWidth: 120, objectFit: "contain" }} /> : null}
      </View>
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8, textTransform: "uppercase", textDecoration: "underline" }}>
        {signer.name}
      </Text>
      <Text style={{ fontSize: 7.5, color: "#111111" }}>{signer.title}</Text>
    </View>
  );
}

/** Prepared by · Noted by · Recommending Approval · Approved by — laid out as on the college's sheet. */
function SignatureBlock({ signatories }: { signatories: TeachingLoadSignatories }) {
  const label = { fontSize: 8, color: "#111111" };
  const lines: [string, TeachingLoadSigner][] = [
    ["Noted By:", signatories.notedBy],
    ["Recommending Approval:", signatories.recommendingApproval],
    ["Approved by:", signatories.approvedBy],
  ];
  return (
    <View wrap={false} style={{ marginTop: 16 }}>
      <Text style={label}>Prepared by:</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around" }}>
        {signatories.preparedBy.map((p, i) => (
          <SignerBox key={`${p.title}-${i}`} signer={p} />
        ))}
      </View>
      {lines.map(([text, signer]) => (
        <View key={text} style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 10 }}>
          <Text style={[label, { width: "38%", textAlign: "right", paddingRight: 8, paddingTop: 4 }]}>{text}</Text>
          <SignerBox signer={signer} />
        </View>
      ))}
    </View>
  );
}

export type TeachingLoadSummaryDocumentProps = {
  collegeName: string;
  semesterLabel: string;
  groups: (TeachingLoadCategoryGroup & { heading?: string })[];
  headerBanner?: string | null;
  insFooterText?: string;
  /** Signature block. */
  signatories?: TeachingLoadSignatories | null;
  /** Rankings strip at the foot; defaults to the campus one, `null` leaves it out. */
  footerBanner?: string | null;
};

export function TeachingLoadSummaryDocument({
  collegeName,
  semesterLabel,
  groups,
  headerBanner,
  insFooterText,
  signatories,
  footerBanner,
}: TeachingLoadSummaryDocumentProps) {
  const footerSrc = footerBanner === undefined ? DEFAULT_REPORT_FOOTER_BANNER : footerBanner;
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Letterhead, college, title, semester — as on the college's sheet. */}
        {headerBanner !== null ? (
          <Image src={headerBanner || DEFAULT_INS_HEADER_BANNER} style={s.banner} />
        ) : null}
        <Text style={s.collegeTitle}>{collegeName}</Text>
        <Text style={s.formTitle}>Summary of Teaching Load</Text>
        <Text style={s.meta}>{semesterLabel}</Text>
        {groups.length === 0 ? (
          <Text style={s.empty}>No departments found for this college.</Text>
        ) : (
          groups.map((g) => <CategoryTable key={g.programId} group={g} />)
        )}
        {signatories ? <SignatureBlock signatories={signatories} /> : null}
        {/* Rankings / certifications strip, as at the foot of the college's sheet. */}
        {footerSrc ? (
          <View wrap={false} style={{ marginTop: 14, alignItems: "center" }}>
            <Image src={footerSrc} style={{ width: 380, objectFit: "contain" }} />
          </View>
        ) : null}
        <INSBrandedFooter text={insFooterText} />
      </Page>
    </Document>
  );
}
