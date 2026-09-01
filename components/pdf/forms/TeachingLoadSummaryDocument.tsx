import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { INSHeader } from "../shared/INSHeader";
import type { TeachingLoadCategoryGroup, TeachingLoadSummaryRow } from "@/lib/scheduling/teaching-load-summary";

const NAVY = "#1e3a5f";

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
    fontSize: 11,
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: 4,
  },
  formTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  meta: {
    fontSize: 8,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 8,
    color: "#374151",
  },
  categoryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: NAVY,
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
    backgroundColor: NAVY,
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
  footerBlock: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signCol: {
    width: "23%",
    fontSize: 7,
    color: "#111",
  },
  signLabel: {
    fontSize: 6.5,
    color: "#4b5563",
    marginBottom: 14,
  },
  signLine: {
    borderTopWidth: 0.5,
    borderTopColor: "#111",
    paddingTop: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
});

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const COLS = {
  no: "6%",
  name: "18%",
  desig: "12%",
  n: "8%",
  subjects: "18%",
  just: "14%",
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
}) {
  return (
    <Text style={[s.td, { width, textAlign: center ? "center" : "left" }]}>
      {children}
    </Text>
  );
}

function FacultyRow({ row, index, alt }: { row: TeachingLoadSummaryRow; index: number; alt: boolean }) {
  return (
    <View style={alt ? [s.tr, s.trAlt] : s.tr} wrap={false}>
      <Cell width={COLS.no} center>
        {String(index + 1)}
      </Cell>
      <Cell width={COLS.name}>{row.facultyName}</Cell>
      <Cell width={COLS.desig}>{row.administrativeDesignation ?? "—"}</Cell>
      <Cell width={COLS.n} center>
        {String(row.day.preps)}
      </Cell>
      <Cell width={COLS.n} center>
        {fmt(row.day.hoursPerWeek)}
      </Cell>
      <Cell width={COLS.n} center>
        {String(row.evening.preps)}
      </Cell>
      <Cell width={COLS.n} center>
        {fmt(row.evening.hoursPerWeek)}
      </Cell>
      <Cell width={COLS.subjects}>{row.subjectsHandled}</Cell>
      <Cell width={COLS.just}>{row.justification ?? ""}</Cell>
    </View>
  );
}

function CategoryTable({ group }: { group: TeachingLoadCategoryGroup }) {
  return (
    <View wrap={false}>
      <Text style={s.categoryTitle}>{group.categoryLabel}</Text>
      <View style={s.table}>
        <View style={s.theadRow}>
          <HeadCell width={COLS.no} center>
            No.
          </HeadCell>
          <HeadCell width={COLS.name}>Name</HeadCell>
          <HeadCell width={COLS.desig}>Designation</HeadCell>
          <HeadCell width={COLS.n} center>
            Day Preps
          </HeadCell>
          <HeadCell width={COLS.n} center>
            Day Hrs/Wk
          </HeadCell>
          <HeadCell width={COLS.n} center>
            Eve Preps
          </HeadCell>
          <HeadCell width={COLS.n} center>
            Eve Hrs/Wk
          </HeadCell>
          <HeadCell width={COLS.subjects}>Subjects Handled</HeadCell>
          <HeadCell width={COLS.just}>Justification</HeadCell>
        </View>
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
        <Text style={s.collegeTitle}>{collegeName}</Text>
        <Text style={s.formTitle}>Summary of Teaching Load</Text>
        <Text style={s.meta}>{semesterLabel} · Day and Evening columns are independent</Text>
        {groups.length === 0 ? (
          <Text style={s.empty}>No departments found for this college.</Text>
        ) : (
          groups.map((g) => <CategoryTable key={g.programId} group={g} />)
        )}
        <View style={s.footerBlock} wrap={false}>
          <View style={s.signCol}>
            <Text style={s.signLabel}>Prepared by</Text>
            <Text style={s.signLine}>Program Chair</Text>
          </View>
          <View style={s.signCol}>
            <Text style={s.signLabel}>Noted by</Text>
            <Text style={s.signLine}>College Dean</Text>
          </View>
          <View style={s.signCol}>
            <Text style={s.signLabel}>Recommending Approval</Text>
            <Text style={s.signLine}>DOI</Text>
          </View>
          <View style={s.signCol}>
            <Text style={s.signLabel}>Approved by</Text>
            <Text style={s.signLine}>Campus Director</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
