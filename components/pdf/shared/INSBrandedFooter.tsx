"use client";

import { Text } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";

/** Optional campus line at the bottom of printed INS PDFs. Hidden when blank. */
export function INSBrandedFooter({ text }: { text?: string | null }) {
  const line = (text ?? "").trim();
  if (!line) return null;
  return (
    <Text style={ins.pageFooter} fixed>
      {line}
    </Text>
  );
}
