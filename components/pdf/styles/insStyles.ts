import { StyleSheet } from "@react-pdf/renderer";

const NAVY = "#1e3a5f";
const GRID_BORDER = "black";
const ALT_BG = "#f8fafc";
const BLACK = "#111111";
const GRAY_600 = "#4b5563";

export const ins = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 30,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: BLACK,
    backgroundColor: "#ffffff",
  },

  /**
   * Containing block for the header. The form-meta box is positioned absolutely
   * against this, so it must stay the nearest positioned ancestor.
   *
   * `minHeight` reserves room for the 3-line meta box. Absolute children
   * contribute no height, so without it a header rendered with no banner would
   * collapse and let the meta text overlap the rule and title below.
   */
  headerBlock: {
    position: "relative",
    minHeight: 30,
    marginBottom: 2,
    paddingBottom: 4,
  },
  universityName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: BLACK,
    textAlign: "center",
  },
  /**
   * Form code / date / revision — pinned to the top-right corner.
   *
   * Absolute (rather than a flex sibling) on purpose: in a shared row the box
   * would consume width on the right and push the banner's centre point left,
   * so the banner would be centred in the leftover space instead of on the
   * page. Taking it out of flow lets the banner centre against the full
   * content width.
   */
  headerRight: {
    position: "absolute",
    top: 0,
    right: 0,
    textAlign: "right",
    fontSize: 7,
  },
  headerRightBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
  },
  navyRule: {
    height: 2,
    marginBottom: 6,
  },

  /**
   * Full-width row, so the banner centres on the page rather than in the space
   * beside the meta box.
   *
   * Overlap constraint: the meta box is ~70pt wide at the right edge, and A4
   * content width is ~535pt (595.28 − 2×30 padding). A centred banner spans
   * (535 ± W)/2, so it stays clear of the meta box while W < ~395pt. The
   * current 260pt has comfortable margin.
   */
  headerBannerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 4,
  },
  /**
   * Source asset is 992x241 (~4.116:1). Width and height are both set and kept
   * at that exact ratio: react-pdf does not infer intrinsic dimensions, so
   * omitting one — or letting the pair drift from the source ratio — stretches
   * the wordmark. If you swap the asset, recompute height = width / ratio.
   */
  headerBanner: {
    width: 230,
    height: 35,
    objectFit: "contain",
  },

  /** Title block, centered now that the flanking logos are gone. */
  formTitleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 4,
  },
  formTitleCenter: {
    textAlign: "center",
    marginBottom: 0,
    flex: 1
  },
  formTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  formSubtitle: {
    fontSize: 8,
    marginTop: 1,
  },
  semesterLine: {
    fontSize: 8.5,
    marginTop: 2,
    textDecoration: "underline",
    textAlign: "center",
  },

  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 3,
  },
  fieldLabel: {
    fontSize: 7.5,
    marginRight: 4,
    color: BLACK,
  },
  fieldValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    // borderBottomWidth: 0.5,
    // borderBottomColor: BLACK,
    // paddingBottom: 1,
    // minHeight: 10,
  },
  columnContainerHeader:{
    flexDirection: "row",
    justifyContent: "space-between",
    width: "40%",
    marginBottom: 4,
  },
  fieldRowHalf: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 3,
    width: "48%",
  },

  credentialsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginBottom: 4,
  },
  gridContainer: {
    borderWidth: 0.5,
    marginTop: 4,
    marginBottom: 4,
  },
  gridHeaderRow: {
    flexDirection: "row",
  },
  gridTimeHeader: {
    width: 44,
    padding: 2,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    borderWidth: 0.5,
  },
  gridDayHeader: {
    flex: 1,
    padding: 2,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    borderWidth: 0.5,
  },
  gridRow: {
    flexDirection: "row",
    minHeight: 28,
    borderBottomWidth: 0.5,
  },
  gridTimeCell: {
    width: 44,
    padding: 2,
    fontSize: 5.5,
    textAlign: "center",
    justifyContent: "center",
    borderRightWidth: 0.5,
  },
  gridCell: {
    flex: 1,
    padding: 1.5,
    fontSize: 5.5,
    borderRightWidth: 0.5,
    borderRightColor: GRID_BORDER,
    justifyContent: "center",
  },
  gridCellAlt: {
    flex: 1,
    padding: 1.5,
    fontSize: 5.5,
    borderRightWidth: 0.5,
    borderRightColor: GRID_BORDER,
    justifyContent: "center",
    // backgroundColor: ALT_BG,
  },
  cellGroup: {
    textAlign: "center",
  },
  cellLine1: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    // color: BLACK,
  },
  cellLine2: {
    fontSize: 5,
    // color: GRAY_600,
  },
  cellLine3: {
    fontSize: 5,
    // color: GRAY_600,
  },
  cellLine4: {
    fontSize: 5,
    // color: GRAY_600,
  },

  summaryContainer: {
    borderWidth: 0.5,
    borderColor: BLACK,
    padding: 4,
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 3,
  },
  summaryTitleRow: {
    flexDirection: "row",
    gap: 100,
    marginBottom: 4,

  },
  summaryHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BLACK,
    paddingBottom: 2,
    marginBottom: 2,
  },
  summaryHeaderCell: {
    flex: 1,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
  },
  summaryRow: {
    flexDirection: "row",
    borderBottomWidth: 0.3,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 1.5,
  },
  summaryCell: {
    flex: 1,
    fontSize: 6.5,
  },

  metricsContainer: {
    borderTopWidth: 0.5,
    borderTopColor: BLACK,
    paddingTop: 4,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 16,
  },
  metricsColumn: {
    flex: 1,
  },

  signatureContainer: {
    flexDirection: "column",
    width: "100%",
    marginTop: 16,
  },
  /**
   * Tier 1: same two-column row as tier 2, but only the first column is
   * occupied, so "Prepared by" aligns with the "Reviewed" column beneath it.
   */
  signatureTierFirstRow: {
    // flexDirection: "row",
    // width: "100%",
    // justifyContent: "flex-start",
    marginBottom: 30,
  },
  /** Tier 2: two slots side by side (Reviewed / Approved). */
  signatureTierRow: {
    flexDirection: "row",
    width: "100%",
    gap: 100,
    // justifyContent: "space-between",
  },
  signatureBlockHalf: {
    width: "30%",
    // alignItems: "center",
  },

  signatureTitle: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 20,
    textAlign: "left", 
  },
  signatureLine: {
    width: "80%",
    borderBottomWidth: 0.5,
    borderBottomColor: BLACK,
    marginBottom: 2,
  },
  signatureRole: {
    fontSize: 6,
    color: GRAY_600,
    width: "80%",
    textAlign: "center",
  },
  signatureName: {
    fontSize: 6.5,
    width: "80%",
    textAlign: "center",
    marginTop: 1,
    fontFamily: "Helvetica-Bold",
  },
  signatureImage: {
    height: 30,
    objectFit: "contain",
    marginBottom: 2,
  },

  rightSignatureContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    borderLeftWidth: 0.5,
    borderLeftColor: GRID_BORDER,
    justifyContent: "space-around",
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  rightSignatureSlot: {
    alignItems: "center",
    marginBottom: 4,
  },
  rightSigTitle: {
    fontSize: 4.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  rightSigLine: {
    width: "90%",
    borderBottomWidth: 0.5,
    borderBottomColor: BLACK,
    marginBottom: 1,
  },
  rightSigRole: {
    fontSize: 4,
    color: GRAY_600,
    textAlign: "center",
  },
  rightSigName: {
    fontSize: 4.5,
    textAlign: "center",
    marginTop: 1,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 8,
  },
  statusLabel: {
    fontSize: 7.5,
    marginRight: 6,
  },
  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 0.8,
    borderColor: BLACK,
    marginRight: 3,
  },
  checkboxChecked: {
    width: 8,
    height: 8,
    borderWidth: 0.8,
    borderColor: BLACK,
    marginRight: 3,
    backgroundColor: NAVY,
  },
  checkboxLabel: {
    fontSize: 7,
    marginRight: 10,
  },
  checkboxGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
});
