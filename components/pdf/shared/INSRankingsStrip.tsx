"use client";

/* react-pdf's <Image> is a PDF primitive with no alt prop. */
/* eslint-disable jsx-a11y/alt-text */
import { Image, View } from "@react-pdf/renderer";
import { DEFAULT_REPORT_FOOTER_BANNER } from "@/lib/system-configuration/campus-branding";

/**
 * University rankings / certifications strip at the foot of the INS forms — the same image as the
 * Summary of Teaching Load. Kept small so a one-page form stays one page. `null` leaves it out.
 */
export function INSRankingsStrip({ src }: { src?: string | null }) {
  const image = src === undefined ? DEFAULT_REPORT_FOOTER_BANNER : src;
  if (!image) return null;
  return (
    <View wrap={false} style={{ marginTop: 6, alignItems: "center" }}>
      <Image src={image} style={{ width: 300, objectFit: "contain" }} />
    </View>
  );
}
