"use client";

import { Text, View } from "@react-pdf/renderer";
import { DEFAULT_CAMPUS_BRANDING } from "@/lib/system-configuration/campus-branding";
import { ins } from "../styles/insStyles";

/**
 * Footer on every page of a printed INS form: the campus line (System Configuration → INS footer,
 * else the campus footer) on the left, the page number on the right.
 */
export function INSBrandedFooter({ text }: { text?: string | null }) {
  const line = (text ?? "").trim() || DEFAULT_CAMPUS_BRANDING.footerText;
  return (
    <View style={ins.pageFooterBar} fixed>
      <Text style={ins.pageFooterText}>{line}</Text>
      <Text
        style={ins.pageFooterPage}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}
