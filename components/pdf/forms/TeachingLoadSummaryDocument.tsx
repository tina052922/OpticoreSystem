import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { INSHeader } from "../shared/INSHeader";
import type { TeachingLoadCategoryGroup, TeachingLoadSummaryRow } from "@/lib/scheduling/teaching-load-summary";

const s = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 22,
    paddingHorizontal: 18,
    fontFamily: "Helvetica",
    fontSize: 7,
    color: "#111111",
  },
  intro: {
    fontSize: 8,
    color: "#374151",
    marginBottom: 8,
    lineHeight: 1.35,
  },
  categoryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#1e3a5f",
    marginTop: 8,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: "#000",
  },
  theadRow: {
    flexDirection: "row",
    backgroundColor: "#ff990a",
  },
  subHeadRow: {
    flexDirection: "row",
    backgroundColor: "#e68a09",
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
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 6.2,
    padding: 3,
    borderRightWidth: 0.4,
    borderRightColor: "#000",
  },
  td: {
    fontSize: 6.4,
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
  footer: {
    marginTop: 10,
    fontSize: 7,
    color: "#4b5563",
  },
});

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const COLS = {
  name: "14%",
  desig: "10%",
  other: "10%",
  n: "5%",
  subjects: "14%",
  just: "12%",
  tot: "5%",
} as const;

function HeadCell({ width, children, center }: { width: string; children: string; center?: boolean }) {
  return (
    <Text style={[s.th, { width, textAlign: center ? "center" : "left" }]}>{children}</Text>
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
  wrap?: boolean;
}) {
  return (
    <Text style={[s.td, { width, textAlign: center ? "center" : "left" }]}>
      {children}
    </Text>
  );
}

function FacultyRow({ row, alt }: { row: TeachingLoadSummaryRow; alt: boolean }) {
  return (
    <View style={alt ? [s.tr, s.trAlt] : s.tr} wrap={false}>
      <Cell width={COLS.name} wrap>
        {row.facultyName}
      </Cell>
      <Cell width={COLS.desig} wrap>
        {row.administrativeDesignation ?? "—"}
      </Cell>
      <Cell width={COLS.other} wrap>
        {row.otherResponsibilities}
      </Cell>
      <Cell width={COLS.n} center>
        {String(row.day.preps)}
      </Cell>
      <Cell width={COLS.n} center>
        {fmt(row.day.unitsPerWeek)}
      </Cell>
      <Cell width={COLS.n} center>
        {fmt(row.day.hoursPerWeek)}
      </Cell>
      <Cell width={COLS.n} center>
        {String(row.evening.preps)}
      </Cell>
      <Cell width={COLS.n} center>
        {fmt(row.evening.unitsPerWeek)}
      </Cell>
      <Cell width={COLS.n} center>
        {fmt(row.evening.hoursPerWeek)}
      </Cell>
      <Cell width={COLS.subjects} wrap>
        {row.subjectsHandled}
      </Cell>
      <Cell width={COLS.just} wrap>
        {row.justification ?? "—"}
      </Cell>
      <Cell width={COLS.tot} center>
        {String(row.totalPreps)}
      </Cell>
      <Cell width={COLS.tot} center>
        {fmt(row.totalHoursPerWeek)}
      </Cell>
    </View>
  );
}

function CategoryTable({ group }: { group: TeachingLoadCategoryGroup }) {
  return (
    <View wrap={false}>
      <Text style={s.categoryTitle}>{group.categoryLabel}</Text>
      <View style={s.table}>
        <View style={s.theadRow}>
          <HeadCell width={COLS.name}>Faculty Name</HeadCell>
          <HeadCell width={COLS.desig}>Administrative Designation</HeadCell>
          <HeadCell width={COLS.other}>Other Responsibilities</HeadCell>
          <HeadCell width="15%" center>
            Day Program (Preps / Units / Hours)
          </HeadCell>
          <HeadCell width="15%" center>
            Evening Program (Preps / Units / Hours)
          </HeadCell>
          <HeadCell width={COLS.subjects}>Subjects Handled</HeadCell>
          <HeadCell width={COLS.just}>Justification</HeadCell>
          <HeadCell width="10%" center>
            Totals (Preps / Hours)
          </HeadCell>
        </View>
        <View style={s.subHeadRow}>
          <HeadCell width={COLS.name}> </HeadCell>
          <HeadCell width={COLS.desig}> </HeadCell>
          <HeadCell width={COLS.other}> </HeadCell>
          <HeadCell width={COLS.n} center>
            Preps
          </HeadCell>
          <HeadCell width={COLS.n} center>
            Units/Wk
          </HeadCell>
          <HeadCell width={COLS.n} center>
            Hours/Wk
          </HeadCell>
          <HeadCell width={COLS.n} center>
            Preps
          </HeadCell>
          <HeadCell width={COLS.n} center>
            Units/Wk
          </HeadCell>
          <HeadCell width={COLS.n} center>
            Hours/Wk
          </HeadCell>
          <HeadCell width={COLS.subjects}> </HeadCell>
          <HeadCell width={COLS.just}> </HeadCell>
          <HeadCell width={COLS.tot} center>
            Preps
          </HeadCell>
          <HeadCell width={COLS.tot} center>
            Hours/Wk
          </HeadCell>
        </View>
        {group.rows.length === 0 ? (
          <View style={s.tr}>
            <Text style={[s.empty, { width: "100%" }]}>No plotted teaching load for this department in the selected term.</Text>
          </View>
        ) : (
          group.rows.map((row, i) => <FacultyRow key={row.instructorId} row={row} alt={i % 2 === 1} />)
        )}
      </View>
    </View>
  );
}

export type TeachingLoadSummaryDocumentProps = {
  collegeName: string;
  semesterLabel: string;
  groups: TeachingLoadCategoryGroup[];
};

export function TeachingLoadSummaryDocument({
  collegeName,
  semesterLabel,
  groups,
}: TeachingLoadSummaryDocumentProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <INSHeader
          formCode="Summary of Teaching Load"
          formTitle="Summary of Teaching Load"
          semesterLabel={semesterLabel}
          programMode="both"
        />
        <Text style={s.intro}>
          {collegeName} · Day Program and Evening Program columns are independent. Preps, units, and hours come from
          plotted schedules. Prep-limit justification appears when a faculty member exceeded the allowed preparations.
        </Text>
        {groups.length === 0 ? (
          <Text style={s.empty}>No departments found for this college.</Text>
        ) : (
          groups.map((g) => <CategoryTable key={g.programId} group={g} />)
        )}
        <Text style={s.footer} wrap={false}>
          Generated from OptiCore plotted ScheduleEntry rows. Day vs Evening are never merged.
        </Text>
      </Page>
    </Document>
  );
}
